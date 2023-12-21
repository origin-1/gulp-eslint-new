'use strict';

const
{
    GULP_DEST_KEY,
    GULP_WARN_KEY,
    createIgnoreResult,
    createPluginError,
    createTransform,
    filterResult,
    hasOwn,
    isErrorMessage,
    makeNPMLink,
    organizeOptions,
    resolveFormatter,
    resolveWriter,
    writeResults,
} = require('#util');
const { promisify } = require('util');

function wrapAction(action)
{
    if (typeof action !== 'function')
        throw TypeError('Argument is not a function');
    if (action.length > 1)
        action = promisify(action);
    return action;
}

const createResultStream =
action =>
{
    action = wrapAction(action);
    return createTransform
    (
        async ({ eslint: result }) =>
        {
            if (result)
                await action(result);
        },
    );
};

const createResultsStream =
action =>
{
    action = wrapAction(action);
    const results = [];
    results.errorCount          = 0;
    results.warningCount        = 0;
    results.fixableErrorCount   = 0;
    results.fixableWarningCount = 0;
    results.fatalErrorCount     = 0;
    return createTransform
    (
        ({ eslint: result }) =>
        {
            if (result)
            {
                results.push(result);
                // Collect total error/warning count.
                results.errorCount          += result.errorCount;
                results.warningCount        += result.warningCount;
                results.fixableErrorCount   += result.fixableErrorCount;
                results.fixableWarningCount += result.fixableWarningCount;
                results.fatalErrorCount     += result.fatalErrorCount;
            }
        },
        async () =>
        {
            await action(results);
        },
    );
};

function getESLintInfo(file)
{
    const eslintInfo = file._eslintInfo;
    if (eslintInfo != null)
        return eslintInfo;
    throw createPluginError({ fileName: file.path, message: 'ESLint information not available' });
}

const warn =
(message, gulpWarn = require('fancy-log').warn) =>
gulpWarn(`\x1b[1;37m\x1b[40mgulp-eslint-new\x1b[0m \x1b[30m\x1b[43mWARN\x1b[0m\n${message}`);

async function lintFile(eslintInfo, file, quiet, warnIgnored)
{
    if (file.isNull())
        return;
    if (file.isStream())
        throw 'gulp-eslint-new doesn\'t support Vinyl files with Stream contents.';
    const { eslint } = eslintInfo;
    // The "path" property of a Vinyl file should be always an absolute path.
    // See https://gulpjs.com/docs/en/api/vinyl/#instance-properties.
    const filePath = file.path;
    let result;
    if (await eslint.isPathIgnored(filePath))
    {
        if (!warnIgnored)
            return;
        // Warn that gulp.src is needlessly reading files that ESLint ignores.
        result = createIgnoreResult(filePath, eslintInfo.cwd, eslint.constructor);
    }
    else
    {
        [result] = await eslint.lintText(file.contents.toString(), { filePath });
        // Note: Fixes are applied as part of `lintText`.
        // Any applied fix messages have been removed from the result.
        if (quiet)
        {
            // Ignore some messages.
            const filter = typeof quiet === 'function' ? quiet : isErrorMessage;
            result = filterResult(result, filter);
        }
        // Update the fixed output; otherwise, fixable messages are simply ignored.
        if (hasOwn(result, 'output'))
        {
            file.contents = Buffer.from(result.output);
            result.fixed = true;
        }
    }
    file.eslint = result;
    file._eslintInfo = eslintInfo;
}

module.exports = exports =
options =>
{
    const { ESLint, eslintOptions, quiet, warnIgnored } = organizeOptions(options);
    const eslint = new ESLint(eslintOptions);
    const { cwd, fix } = eslintOptions;
    const eslintInfo = { cwd, eslint, fix };
    return createTransform(file => lintFile(eslintInfo, file, quiet, warnIgnored));
};

exports.result = createResultStream;

exports.results = createResultsStream;

function failOnErrorAction(result)
{
    const { messages } = result;
    if (messages)
    {
        const error = messages.find(isErrorMessage);
        if (error)
        {
            throw createPluginError
            (
                {
                    name:       'ESLintError',
                    fileName:   result.filePath,
                    message:    error.message,
                    lineNumber: error.line,
                },
            );
        }
    }
}

exports.failOnError = () => createResultStream(failOnErrorAction);

function failAfterErrorAction({ errorCount })
{
    if (errorCount)
    {
        throw createPluginError
        (
            {
                name:       'ESLintError',
                message:    `Failed with ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`,
            },
        );
    }
}

exports.failAfterError = () => createResultsStream(failAfterErrorAction);

exports.formatEach =
(formatter, writer) =>
{
    writer = resolveWriter(writer);
    const eslintToFormatterMap = new Map();
    return createTransform
    (
        async file =>
        {
            const result = file.eslint;
            if (result)
            {
                const eslintInfo = getESLintInfo(file);
                const { eslint } = eslintInfo;
                let formatterObj = eslintToFormatterMap.get(eslint);
                if (!formatterObj)
                {
                    formatterObj = await resolveFormatter(eslintInfo, formatter);
                    eslintToFormatterMap.set(eslint, formatterObj);
                }
                await writeResults([result], formatterObj, writer);
            }
        },
    );
};

const ERROR_MULTIPLE_ESLINT_INSTANCES =
{
    name:       'ESLintError',
    message:    'The files in the stream were not processed by the same instance of ESLint',
};

exports.format =
(formatter, writer) =>
{
    writer = resolveWriter(writer);
    const results = [];
    let commonInfo;
    return createTransform
    (
        file =>
        {
            const result = file.eslint;
            if (result)
            {
                const eslintInfo = getESLintInfo(file);
                if (commonInfo == null)
                    commonInfo = eslintInfo;
                else
                {
                    if (eslintInfo !== commonInfo)
                        throw createPluginError(ERROR_MULTIPLE_ESLINT_INSTANCES);
                }
                results.push(result);
            }
        },
        async () =>
        {
            if (results.length)
            {
                const formatterObj = await resolveFormatter(commonInfo, formatter);
                await writeResults(results, formatterObj, writer);
            }
        },
    );
};

const getBase = ({ base }) => base;
exports.fix =
({ [GULP_DEST_KEY]: gulpDest = require('vinyl-fs').dest, [GULP_WARN_KEY]: gulpWarn } = { }) =>
{
    const ternaryStream = require('ternary-stream');
    let warned = false;
    const isFixed =
    file =>
    {
        const result = file.eslint;
        if (result)
        {
            const eslintInfo = getESLintInfo(file);
            if (eslintInfo.fix == null && !warned)
            {
                warned = true;
                const message =
                'gulpESLintNew.fix() received a file that was linted without the option "fix".\n' +
                'This is usually caused by a misconfiguration in a gulp task.\n' +
                `See ${makeNPMLink('autofix')} for information on how to fix files correctly.\n` +
                'If you don\'t want to fix any files, set "fix: false" in the options passed to ' +
                'gulpESLintNew() to remove this warning.';
                warn(message, gulpWarn);
            }
            return result.fixed;
        }
    };
    const stream = ternaryStream(isFixed, gulpDest(getBase));
    return stream;
};
