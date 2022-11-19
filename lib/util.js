'use strict';

/**
 * @typedef {import('eslint').ESLint}                       ESLint
 * @typedef {import('./gulp-eslint-new').GulpESLintWriter}  GulpESLintWriter
 * @typedef {import('./eslint').LintMessage}                LintMessage
 * @typedef {import('./eslint').LintResult}                 LintResult
 * @typedef {import('./eslint').LintResultData}             LintResultData
 * @typedef {import('./eslint').LoadedFormatter}            LoadedFormatter
 */

/**
 * @callback FormatterFunction
 * @param {LintResult[]} results
 * @param {LintResultData} [data]
 * @returns {string | Promise<string>}
 */
const { relative }  = require('path');
const { Transform } = require('stream');

const ESLINT_KEY    = Symbol('ESLint');
const GULP_DEST_KEY = Symbol('require("vinyl-fs").dest');
const GULP_WARN_KEY = Symbol('require("fancy-log").warn');

function compareResultsByFilePath({ filePath: filePath1 }, { filePath: filePath2 }) {
    if (filePath1 > filePath2) {
        return 1;
    }
    if (filePath1 < filePath2) {
        return -1;
    }
    return 0;
}

const PLUGIN_ERROR_OPTIONS = { showStack: true };

function createPluginError(error) {
    const PluginError = require('plugin-error');
    if (error instanceof PluginError) {
        return error;
    }
    if (error == null) {
        error = 'Unknown Error';
    }
    return PluginError('gulp-eslint-new', error, PLUGIN_ERROR_OPTIONS);
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

exports.ESLINT_KEY      = ESLINT_KEY;
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
 * @param {string} eslintVersion - ESLint version string.
 * @returns {LintResult} Result with warning by ignore settings.
 */
exports.createIgnoreResult =
(filePath, baseDir, eslintVersion) => {
    const { ltr } = require('semver');
    let message;
    const relativePath = relative(baseDir, filePath);
    if (isHiddenRegExp.test(relativePath)) {
        message =
        'File ignored by default. Use a negated ignore pattern (like ' +
        '"!<relative/path/to/filename>") to override.';
    } else if (isInNodeModulesRegExp.test(relativePath)) {
        message =
        'File ignored by default. Use a negated ignore pattern like "!node_modules/*" to ' +
        'override.';
    } else {
        message =
        'File ignored because of a matching ignore pattern. Set "ignore" option to false to ' +
        'override.';
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
    if (!ltr(eslintVersion, '8.8.0')) {
        result.suppressedMessages = [];
    }
    return result;
};

exports.createPluginError = createPluginError;

async function awaitHandler(handler, data, done) {
    try {
        await handler();
    } catch (err) {
        done(createPluginError(err));
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
(handleFile, handleFinal) => {
    const transform = (file, enc, done) => void awaitHandler(() => handleFile(file), file, done);
    const final = handleFinal ? done => void awaitHandler(handleFinal, null, done) : undefined;
    return new Transform({ objectMode: true, transform, final });
};

/**
 * Count the number of messages for which a predicate function returns `true`.
 *
 * @param {LintMessage[]} messages - ESLint messages to count.
 * @param {CountMessagePredicate} predicate - Function to call for each message.
 * @returns {number} The number of messages for which the predicate function returns `true`.
 *
 * @callback CountMessagePredicate
 * @param {LintMessage} message - ESLint message.
 * @returns {boolean} `true` or `false`, depending on the input.
 */
function countMessages(messages, predicate) {
    let count = 0;
    for (const message of messages) {
        if (predicate(message)) {
            ++count;
        }
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
(result, filter) => {
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

exports.isWarningMessage = isWarningMessage;

const makeNPMLink =
anchor => {
    const { version } = require('gulp-eslint-new/package.json');
    const npmLink = `https://www.npmjs.com/package/gulp-eslint-new/v/${version}#${anchor}`;
    return npmLink;
};

exports.makeNPMLink = makeNPMLink;

const FORBIDDEN_OPTIONS = [
    'cache',
    'cacheFile',
    'cacheLocation',
    'cacheStrategy',
    'errorOnUnmatchedPattern',
    'extensions',
    'globInputPaths',
];

const requireESLint = (ESLint = require('eslint').ESLint) => ESLint;

function requireFlatESLint(ESLint = require('eslint/use-at-your-own-risk').FlatESLint) {
    if (ESLint == null) {
        const message =
        'The version of ESLint you are using does not support flat config. ' +
        'To use flat config, upgrade to ESLint 8.21 or later.';
        throw Error(message);
    }
    return ESLint;
}

/**
 * Throws an error about invalid options passed to gulp-eslint-new.
 *
 * @param {string} message - The error message.
 * @throws An error with code "ESLINT_INVALID_OPTIONS" and the specified message.
 */
function throwInvalidOptionError(message) {
    const error = Error(message);
    Error.captureStackTrace(error, throwInvalidOptionError);
    error.code = 'ESLINT_INVALID_OPTIONS';
    throw error;
}

/**
 * Convert a string array to a boolean map.
 *
 * @param {string[] | null} keys - The keys to assign true.
 * @param {boolean} defaultValue - The default value for each property.
 * @param {string} displayName - The property name which is used in error message.
 * @returns {Record<string, boolean>} The boolean map.
 */
function toBooleanMap(keys, defaultValue, displayName) {
    if (keys && !Array.isArray(keys)) {
        throwInvalidOptionError(`Option ${displayName} must be an array`);
    }
    if (keys && keys.length > 0) {
        return keys.reduce(
            (map, def) => {
                const [key, value] = def.split(':');
                if (key !== '__proto__') {
                    map[key] = value === undefined ? defaultValue : value === 'true';
                }
                return map;
            },
            { },
        );
    }
}

/**
 * Organize, migrate and partially validate the options passed to gulp-eslint-new.
 *
 * @param {Record<string | symbol, unknown>} [options] - Options to organize.
 * @returns {OrganizedOptions} Organized options.
 *
 * @typedef {Object} OrganizedOptions
 * @property {Function} [ESLint]
 * @property {Record<string, unknown>} eslintOptions
 * @property {Function} [gulpWarn]
 * @property {Object[]} migratedOptions
 * @property {boolean | undefined} [quiet]
 * @property {boolean | undefined} [warnIgnored]
 */
exports.organizeOptions =
(options = { }) => {
    const migratedOptions = [];
    if (typeof options === 'string') {
        const organizedOptions =
        {
            ESLint:         requireESLint(),
            eslintOptions:  { overrideConfigFile: options },
            migratedOptions,
        };
        return organizedOptions;
    }
    {
        const invalidOptions = FORBIDDEN_OPTIONS.filter(option => hasOwn(options, option));
        if (invalidOptions.length) {
            throwInvalidOptionError(`Invalid options: ${invalidOptions.join(', ')}`);
        }
    }
    const {
        [ESLINT_KEY]:       rawESLint,
        [GULP_WARN_KEY]:    gulpWarn,
        configType,
        quiet,
        warnIgnored,
        ...eslintOptions
    } =
    options;
    if (configType != null && configType !== 'eslintrc' && configType !== 'flat') {
        throwInvalidOptionError('Option configType must be one of "eslintrc", "flat", or null');
    }
    const useEslintrcConfig = configType !== 'flat';
    const ESLint =
        (useEslintrcConfig ? requireESLint : requireFlatESLint)(rawESLint);
    const organizedOptions =
    { ESLint, eslintOptions, gulpWarn, migratedOptions, quiet, warnIgnored };
    if (useEslintrcConfig) {
        let { overrideConfig } = eslintOptions;
        if (overrideConfig != null && typeof overrideConfig !== 'object') {
            throwInvalidOptionError('Option overrideConfig must be an object or null');
        }
        overrideConfig = eslintOptions.overrideConfig =
        overrideConfig != null ? { ...overrideConfig } : { };
        const migrateOption =
        function (
            oldName,
            newName = oldName,
            newOptions = overrideConfig,
            needsMigration = hasOwn(eslintOptions, oldName),
            convert,
        ) {
            if (needsMigration) {
                const value = eslintOptions[oldName];
                delete eslintOptions[oldName];
                {
                    const newDisplayName =
                    newOptions === overrideConfig ? `overrideConfig.${newName}` : newName;
                    const formatChanged = convert != null;
                    const migratedOption = { oldName, newName: newDisplayName, formatChanged };
                    migratedOptions.push(migratedOption);
                }
                newOptions[newName] = convert != null ? convert(value) : value;
            }
        };
        migrateOption('configFile', 'overrideConfigFile', eslintOptions);
        migrateOption(
            'envs',
            'env',
            undefined,
            undefined,
            envs => toBooleanMap(envs, true, 'envs'),
        );
        migrateOption('extends');
        migrateOption(
            'globals',
            undefined,
            undefined,
            undefined,
            globals => toBooleanMap(globals, false, 'globals'),
        );
        migrateOption('ignorePattern', 'ignorePatterns');
        migrateOption('parser');
        migrateOption('parserOptions');
        migrateOption('plugins', undefined, undefined, Array.isArray(eslintOptions.plugins));
        migrateOption('rules');
        migrateOption('warnFileIgnored', 'warnIgnored', organizedOptions);
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
async ({ cwd, eslint }, formatter) => {
    if (formatter === undefined) {
        const { format } = await eslint.loadFormatter();
        return {
            format: results =>
                format(results)
                .replace(
                    / with the `--fix` option\.(?=(\u001b\[\d+m|\n)+$)/,
                    ` - see ${makeNPMLink('autofix')}`,
                ),
        };
    }
    if (isObject(formatter) && typeof formatter.format === 'function') {
        return formatter;
    }
    if (typeof formatter === 'function') {
        return {
            format: results => {
                results.sort(compareResultsByFilePath);
                return formatter(
                    results,
                    {
                        cwd,
                        get rulesMeta() {
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
 * @param {GulpESLintWriter | NodeJS.WritableStream} [writer=require('fancy-log')]
 * A stream or function to resolve as a format writer.
 * @returns {GulpESLintWriter} A function that writes formatted messages.
 */
exports.resolveWriter =
(writer = require('fancy-log')) => {
    if (isObject(writer)) {
        const { write } = writer;
        if (typeof write === 'function') {
            writer = write.bind(writer);
        }
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
 * @param {GulpESLintWriter} [writer]
 * A function used to write formatted ESLint messages.
 */
exports.writeResults =
async (results, formatterObj, writer) => {
    const message = await formatterObj.format(results, { });
    if (writer && message != null && message !== '') {
        await writer(message);
    }
};
