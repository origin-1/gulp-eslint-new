'use strict';

/**
 * @typedef {import('eslint').ESLint}               ESLint
 * @typedef {import('./eslint').FormatterFunction}  FormatterFunction
 * @typedef {import('./eslint').LintMessage}        LintMessage
 * @typedef {import('./eslint').LintResult}         LintResult
 * @typedef {import('./eslint').LoadedFormatter}    LoadedFormatter
 * @typedef {import('./gulp-eslint-new').Writer}    Writer
 */

const { normalize, relative }   = require('path');
const { Transform }             = require('stream');

const ESLINT_PKG    = Symbol('ESLint package name');
const GULP_DEST_KEY = Symbol('require("vinyl-fs").dest');
const GULP_WARN_KEY = Symbol('require("fancy-log").warn');

function compareResultsByFilePath({ filePath: filePath1 }, { filePath: filePath2 })
{
    if (filePath1 > filePath2)
        return 1;
    if (filePath1 < filePath2)
        return -1;
    return 0;
}

const PLUGIN_ERROR_OPTIONS = { showStack: true };

function createPluginError(error)
{
    const PluginError = require('plugin-error');
    if (error instanceof PluginError)
        return error;
    if (error == null)
        error = 'Unknown Error';
    const pluginError = PluginError('gulp-eslint-new', error, PLUGIN_ERROR_OPTIONS);
    return pluginError;
}

const { defineProperty } = Object;

/** Determine if the specified object has the indicated property as its own property. */
const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);

/**
 * Determine if a message is an error.
 *
 * @param {LintMessage} { severity } - An ESLint message.
 * @returns {boolean} Whether the message is an error message.
 */
const isErrorMessage = ({ severity }) => severity > 1;

function isEslintrcESLintConstructor({ name, version })
{
    const { satisfies } = require('semver');

    return name === 'ESLint' === satisfies(version, '8');
}

/**
 * Determine if a message is a fatal error.
 *
 * @param {LintMessage} { fatal, severity } - An ESLint message.
 * @returns {boolean} Whether the message is a fatal error message.
 */
const isFatalErrorMessage = ({ fatal, severity }) => !!fatal && severity > 1;

/**
 * Determine if a message is a fixable error.
 *
 * @param {LintMessage} { fix, severity } - An ESLint message.
 * @returns {boolean} Whether the message is a fixable error message.
 */
const isFixableErrorMessage = ({ fix, severity }) => fix !== undefined && severity > 1;

/**
 * Determine if a message is a fixable warning.
 *
 * @param {LintMessage} { fix, severity } - An ESLint message.
 * @returns {boolean} Whether the message is a fixable warning message.
 */
const isFixableWarningMessage = ({ fix, severity }) => fix !== undefined && severity === 1;

const isObject = value => Object(value) === value;

/**
 * Determine if a message is a warning.
 *
 * @param {LintMessage} { severity } - An ESLint message.
 * @returns {boolean} Whether the message is a warning message.
 */
const isWarningMessage = ({ severity }) => severity === 1;

exports.ESLINT_PKG      = ESLINT_PKG;
exports.GULP_DEST_KEY   = GULP_DEST_KEY;
exports.GULP_WARN_KEY   = GULP_WARN_KEY;

exports.compareResultsByFilePath = compareResultsByFilePath;

const isHiddenRegExp = /(?<![^/\\])\.(?!\.)/u;
const isInNodeModulesRegExp = /(?<![^/\\])node_modules[/\\]/u;

/**
 * This is a remake of the CLI engine `createIgnoreResult` function with no reference to ESLint CLI
 * options and with a better detection of the ignore reason in some edge cases.
 *
 * @param {string} filePath - Absolute path of checked code file.
 * @param {string} baseDir - Absolute path of base directory.
 * @param {{ name: string, version: string }} eslintConstructor - ESLint constructor.
 * @returns {LintResult} Result with warning by ignore settings.
 */
exports.createIgnoreResult =
(filePath, baseDir, eslintConstructor) =>
{
    const { ltr } = require('semver');
    let message;
    const relativePath = relative(baseDir, filePath);
    if (isEslintrcESLintConstructor(eslintConstructor))
    {
        if (isHiddenRegExp.test(relativePath))
        {
            message =
            'File ignored by default. Use a negated ignore pattern (like ' +
            '"!<relative/path/to/filename>") to override.';
        }
        else if (isInNodeModulesRegExp.test(relativePath))
        {
            message =
            'File ignored by default. Use a negated ignore pattern like "!**/node_modules/*" to ' +
            'override.';
        }
        else
        {
            message =
            'File ignored because of a matching ignore pattern. Set "ignore" option to false to ' +
            'override.';
        }
    }
    else
    {
        if (relativePath.startsWith('..'))
            message = 'File ignored because outside of base path.';
        else if (isInNodeModulesRegExp.test(relativePath))
        {
            message =
            'File ignored by default because it is located under the node_modules directory. Use ' +
            'ignore pattern "!**/node_modules/**" to override.';
        }
        else
        {
            message =
            'File ignored. If this file is matched by a global ignore pattern, it can be ' +
            'unignored by setting the "ignore" option to false.';
        }
    }
    const result =
    {
        filePath,
        messages:               [{ fatal: false, severity: 1, message }],
        errorCount:             0,
        warningCount:           1,
        fixableErrorCount:      0,
        fixableWarningCount:    0,
        fatalErrorCount:        0,
    };
    if (!ltr(eslintConstructor.version, '8.8'))
        result.suppressedMessages = [];
    return result;
};

exports.createPluginError = createPluginError;

async function awaitHandler(handler, data, done)
{
    try
    {
        await handler();
    }
    catch (error)
    {
        const pluginError = createPluginError(error);
        done(pluginError);
        return;
    }
    done(null, data);
}

/**
 * Create a transform stream in object mode from synchronous or asynchronous handler functions.
 * All files are passed through the stream.
 * Errors thrown by the handlers will be wrapped in a `PluginError` and emitted from the stream.
 *
 * @param {Function} handleFile
 * A function that is called for each file, with the file object as the only parameter.
 * If the function returns a promise, the file will be passed through the stream after the promise
 * is resolved.
 *
 * @param {Function} [handleFinal]
 * A function that is called with no parameters before closing the stream.
 * If the function returns a promise, the stream will be closed after the promise is resolved.
 *
 * @returns {Transform} A transform stream.
 */
exports.createTransform =
(handleFile, handleFinal) =>
{
    const transform = (file, enc, done) => void awaitHandler(() => handleFile(file), file, done);
    const final = handleFinal ? done => void awaitHandler(handleFinal, null, done) : undefined;
    return new Transform({ autoDestroy: false, objectMode: true, transform, final });
};

/**
 * @callback CountMessagePredicate
 * @param {LintMessage} message - ESLint message.
 * @returns {boolean} `true` or `false`, depending on the input.
 */

/**
 * Count the number of messages for which a predicate function returns `true`.
 *
 * @param {LintMessage[]} messages - ESLint messages to count.
 * @param {CountMessagePredicate} predicate - Function to call for each message.
 * @returns {number} The number of messages for which the predicate function returns `true`.
 */
function countMessages(messages, predicate)
{
    let count = 0;
    for (const message of messages)
    {
        if (predicate(message))
            ++count;
    }
    return count;
}

/**
 * Filter result messages, update error and warning counts.
 *
 * @param {LintResult} result - An ESLint result.
 * @param {Function} filter - A function that evaluates what messages to keep.
 * @returns {LintResult} A filtered ESLint result.
 */
exports.filterResult =
(result, filter) =>
{
    const { messages, ...newResult } = result;
    const newMessages = messages.filter(filter, result);
    newResult.messages = newMessages;
    newResult.errorCount          = countMessages(newMessages, isErrorMessage);
    newResult.warningCount        = countMessages(newMessages, isWarningMessage);
    newResult.fixableErrorCount   = countMessages(newMessages, isFixableErrorMessage);
    newResult.fixableWarningCount = countMessages(newMessages, isFixableWarningMessage);
    newResult.fatalErrorCount     = countMessages(newMessages, isFatalErrorMessage);
    return newResult;
};

exports.hasOwn = hasOwn;

exports.isErrorMessage = isErrorMessage;

exports.isEslintrcESLintConstructor = isEslintrcESLintConstructor;

exports.isWarningMessage = isWarningMessage;

const makeNPMLink =
anchor =>
{
    const { version } = require('gulp-eslint-new/package.json');
    const npmLink = `https://www.npmjs.com/package/gulp-eslint-new/v/${version}#${anchor}`;
    return npmLink;
};

exports.makeNPMLink = makeNPMLink;

const FORBIDDEN_OPTIONS =
[
    'cache',
    'cacheFile',
    'cacheLocation',
    'cacheStrategy',
    'concurrency',
    'errorOnUnmatchedPattern',
    'extensions',
    'globInputPaths',
    'passOnNoPatterns',
];

const requireESLint = eslintPkg => require(eslintPkg).ESLint;

function requireEslintrcESLint(eslintPkg)
{
    const { LegacyESLint } = require(`${eslintPkg}/use-at-your-own-risk`);
    if (LegacyESLint) return LegacyESLint;

    const { satisfies } = require('semver');
    const { ESLint } = require(eslintPkg);
    if (satisfies(ESLint.version, '8')) return ESLint;

    const message =
    'The version of ESLint you are using does not support eslintrc config. ' +
    'Eslintrc config is not available in ESLint 10.';
    throw Error(message);
}

function requireFlatESLint(eslintPkg)
{
    const { FlatESLint } = require(`${eslintPkg}/use-at-your-own-risk`);
    if (FlatESLint) return FlatESLint;

    const { satisfies } = require('semver');
    const { ESLint } = require(eslintPkg);
    if (!satisfies(ESLint.version, '8')) return ESLint;

    const message =
    'The version of ESLint you are using does not support flat config. ' +
    'Flat config is available in ESLint 8.21 or later.';
    throw Error(message);
}

/**
 * Throws an error about invalid options passed to gulp-eslint-new.
 *
 * @param {string} message - The error message.
 * @throws An error with code `"ESLINT_INVALID_OPTIONS"` and the specified message.
 */
function throwInvalidOptionError(message)
{
    const error = Error(message);
    Error.captureStackTrace(error, throwInvalidOptionError);
    error.code = 'ESLINT_INVALID_OPTIONS';
    throw error;
}

/**
 * Organize and partially validate the options passed to gulp-eslint-new.
 *
 * @param {Object.<string | symbol, unknown>} [options] - Options to organize.
 * @returns {OrganizedOptions} Organized options.
 *
 * @typedef {Object} OrganizedOptions
 * @property {Function} [ESLint]
 * @property {Object.<string, unknown>} eslintOptions
 * @property {boolean | Function} [quiet]
 * @property {boolean} [warnIgnored]
 */
exports.organizeOptions =
(options = { }) =>
{
    if (typeof options === 'string')
    {
        const organizedOptions =
        {
            ESLint:         requireESLint('eslint'),
            eslintOptions:  { cwd: process.cwd(), overrideConfigFile: options },
        };
        return organizedOptions;
    }
    {
        const invalidOptions = FORBIDDEN_OPTIONS.filter(option => hasOwn(options, option));
        if (invalidOptions.length)
            throwInvalidOptionError(`Invalid options: ${invalidOptions.join(', ')}`);
    }
    const
    { [ESLINT_PKG]: eslintPkg = 'eslint', configType, quiet, warnIgnored, ...eslintOptions } =
    options;
    if (configType != null && configType !== 'eslintrc' && configType !== 'flat')
        throw Error('Option configType must be one of "eslintrc", "flat", null, or undefined');
    {
        const type = typeof quiet;
        if (type !== 'boolean' && type !== 'function' && type !== 'undefined')
            throw Error('Option quiet must be a boolean, a function, or undefined');
    }
    {
        const type = typeof warnIgnored;
        if (type !== 'boolean' && type !== 'undefined')
            throw Error('Option warnIgnored must be a boolean or undefined');
    }
    let requireFn;
    switch (configType)
    {
    default:
        requireFn = requireESLint;
        break;
    case 'eslintrc':
        requireFn = requireEslintrcESLint;
        break;
    case 'flat':
        requireFn = requireFlatESLint;
        break;
    }
    const ESLint = requireFn(eslintPkg);
    const organizedOptions = { ESLint, eslintOptions, quiet, warnIgnored };
    {
        const { cwd } = eslintOptions;
        eslintOptions.cwd =
        cwd === undefined ? process.cwd() : typeof cwd === 'string' ? normalize(cwd) : cwd;
    }
    return organizedOptions;
};

/**
 * Resolve a formatter from a string.
 * If a function is specified, it will be treated as a formatter function and wrapped in an object
 * appropriately.
 *
 * @param {{ cwd: string, eslint: ESLint }} eslintInfo
 * Current directory and instance of ESLint used to load and configure the formatter.
 *
 * @param {string | LoadedFormatter | FormatterFunction} [formatter]
 * A name or path of a formatter, a formatter object or a formatter function.
 *
 * @returns {Promise<LoadedFormatter>} An ESLint formatter.
 */
exports.resolveFormatter =
async ({ cwd, eslint }, formatter) =>
{
    if (formatter === undefined)
    {
        const { format } = await eslint.loadFormatter();
        const formatterObj =
        {
            format:
            results =>
            {
                const stylishText = format(results);
                const text =
                stylishText
                .replace
                (
                    / with the `--fix` option\.(?=(\u001b\[\d+m|\n)+$)/,
                    ` - see ${makeNPMLink('autofix')}`,
                );
                return text;
            },
        };
        return formatterObj;
    }
    if (isObject(formatter) && typeof formatter.format === 'function')
        return formatter;
    if (typeof formatter === 'function')
    {
        return {
            format: results =>
            {
                results.sort(compareResultsByFilePath);
                return formatter
                (
                    results,
                    {
                        cwd,
                        get rulesMeta()
                        {
                            const rulesMeta = eslint.getRulesMetaForResults(results);
                            defineProperty(this, 'rulesMeta', { value: rulesMeta });
                            return rulesMeta;
                        },
                    },
                );
            },
        };
    }
    // Use ESLint to look up formatter references.
    return eslint.loadFormatter(formatter);
};

/**
 * Resolve a writer function used to write formatted ESLint messages.
 *
 * @param {Writer | NodeJS.WritableStream} [writer=require('fancy-log')]
 * A stream or function to resolve as a format writer.
 * @returns {Writer} A function that writes formatted messages.
 */
exports.resolveWriter =
(writer = require('fancy-log')) =>
{
    if (isObject(writer))
    {
        const { write } = writer;
        if (typeof write === 'function')
            writer = write.bind(writer);
    }
    return writer;
};

/**
 * Write formatted ESLint messages.
 *
 * @param {LintResult[]} results
 * A list of ESLint results.
 *
 * @param {LoadedFormatter} formatterObj
 * A formatter object.
 *
 * @param {Writer} [writer]
 * A function used to write formatted ESLint messages.
 */
exports.writeResults =
async (results, formatterObj, writer) =>
{
    const message = await formatterObj.format(results, { });
    if (writer && message != null && message !== '')
        await writer(message);
};
