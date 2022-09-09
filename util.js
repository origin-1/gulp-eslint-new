'use strict';

/**
 * @typedef {import('eslint').ESLint}                 ESLint
 * @typedef {import('eslint').ESLint.LintResult}      ESLint.LintResult
 * @typedef {import('eslint').ESLint.LintResultData}  ESLint.LintResultData
 * @typedef {import('.').GulpESLintWriter}            GulpESLintWriter
 * @typedef {import('eslint').Linter}                 Linter
 * @typedef {import('eslint').Linter.LintMessage}     Linter.LintMessage
 * @typedef
 * {{ format(results: ESLint.LintResult[]): string | Promise<string>; }}
 * LoadedFormatter
 */

/**
 * @callback FormatterFunction
 * @param {ESLint.LintResult[]} results
 * @param {ESLint.LintResultData} [data]
 * @returns {string | Promise<string>}
 */

const fancyLog      = require('fancy-log');
const { version }   = require('gulp-eslint-new/package.json');
const { relative }  = require('path');
const PluginError   = require('plugin-error');
const { ltr }       = require('semver');
const { Transform } = require('stream');
const ternaryStream = require('ternary-stream');

const ESLINT_KEY = Symbol('ESLint');

exports.ESLINT_KEY = ESLINT_KEY;

const LOG_WARNING_KEY = Symbol('logWarning');

exports.LOG_WARNING_KEY = LOG_WARNING_KEY;

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
 * @param {Linter.LintMessage} { severity } - An ESLint message.
 * @returns {boolean} Whether the message is an error message.
 */
const isErrorMessage = ({ severity }) => severity > 1;

/**
 * Determine if a message is a fatal error.
 *
 * @param {Linter.LintMessage} { fatal, severity } - An ESLint message.
 * @returns {boolean} Whether the message is a fatal error message.
 */
const isFatalErrorMessage = ({ fatal, severity }) => !!fatal && severity > 1;

/**
 * Determine if a message is a fixable error.
 *
 * @param {Linter.LintMessage} { fix, severity } - An ESLint message.
 * @returns {boolean} Whether the message is a fixable error message.
 */
const isFixableErrorMessage = ({ fix, severity }) => fix !== undefined && severity > 1;

/**
 * Determine if a message is a fixable warning.
 *
 * @param {Linter.LintMessage} { fix, severity } - An ESLint message.
 * @returns {boolean} Whether the message is a fixable warning message.
 */
const isFixableWarningMessage = ({ fix, severity }) => fix !== undefined && severity === 1;

const isObject = value => Object(value) === value;

/**
 * Determine if a message is a warning.
 *
 * @param {Linter.LintMessage} { severity } - An ESLint message.
 * @returns {boolean} Whether the message is a warning message.
 */
const isWarningMessage = ({ severity }) => severity === 1;

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
 * @returns {ESLint.LintResult} Result with warning by ignore settings.
 */
exports.createIgnoreResult = (filePath, baseDir, eslintVersion) => {
    let message;
    const relativePath = relative(baseDir, filePath);
    if (isHiddenRegExp.test(relativePath)) {
        message
        = 'File ignored by default. Use a negated ignore pattern (like '
        + '"!<relative/path/to/filename>") to override.';
    } else if (isInNodeModulesRegExp.test(relativePath)) {
        message
        = 'File ignored by default. Use a negated ignore pattern like "!node_modules/*" to '
        + 'override.';
    } else {
        message
        = 'File ignored because of a matching ignore pattern. Set "ignore" option to false to '
        + 'override.';
    }
    const result = {
        filePath,
        messages: [{ fatal: false, severity: 1, message }],
        errorCount: 0,
        warningCount: 1,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        fatalErrorCount: 0
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
exports.createTransform = (handleFile, handleFinal) => {
    const transform = (file, enc, done) => void awaitHandler(() => handleFile(file), file, done);
    const final = handleFinal ? done => void awaitHandler(handleFinal, null, done) : undefined;
    return new Transform({ objectMode: true, transform, final });
};

/**
 * Count the number of messages for which a predicate function returns `true`.
 *
 * @param {Linter.LintMessage[]} messages - ESLint messages to count.
 * @param {CountMessagePredicate} predicate - Function to call for each message.
 * @returns {number} The number of messages for which the predicate function returns `true`.
 *
 * @callback CountMessagePredicate
 * @param {ESLint.LintMessage} message - ESLint message.
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
 * @param {ESLint.LintResult} result - An ESLint result.
 * @param {Function} filter - A function that evaluates what messages to keep.
 * @returns {ESLint.LintResult} A filtered ESLint result.
 */
exports.filterResult = (result, filter) => {
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

const isFixed = ({ eslint }) => eslint && eslint.fixed;
const getBase = ({ base }) => base;
exports.fix = dest => ternaryStream(isFixed, dest(getBase));

exports.hasOwn = hasOwn;

exports.isErrorMessage = isErrorMessage;

exports.isWarningMessage = isWarningMessage;

const makeNPMLink
= anchor => `https://www.npmjs.com/package/gulp-eslint-new/v/${version}#${anchor}`;

exports.makeNPMLink = makeNPMLink;

const FORBIDDEN_OPTIONS = [
    'cache',
    'cacheFile',
    'cacheLocation',
    'cacheStrategy',
    'errorOnUnmatchedPattern',
    'extensions',
    'globInputPaths'
];

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
            { }
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
 * @property {Function} [logWarning]
 * @property {Object[]} migratedOptions
 * @property {boolean | undefined} [quiet]
 * @property {boolean | undefined} [warnIgnored]
 */
exports.organizeOptions = (options = { }) => {
    const migratedOptions = [];
    if (typeof options === 'string') {
        const organizedOptions
        = { eslintOptions: { overrideConfigFile: options }, migratedOptions };
        return organizedOptions;
    }
    {
        const invalidOptions = FORBIDDEN_OPTIONS.filter(option => hasOwn(options, option));
        if (invalidOptions.length) {
            throwInvalidOptionError(`Invalid options: ${invalidOptions.join(', ')}`);
        }
    }
    const {
        [ESLINT_KEY]:       ESLint,
        [LOG_WARNING_KEY]:  logWarning,
        overrideConfig:     rawOverrideConfig,
        quiet,
        warnIgnored,
        ...eslintOptions
    }
    = options;
    if (rawOverrideConfig != null && typeof rawOverrideConfig !== 'object') {
        throwInvalidOptionError('Option overrideConfig must be an object or null');
    }
    const overrideConfig = eslintOptions.overrideConfig
    = rawOverrideConfig != null ? { ...rawOverrideConfig } : { };
    const organizedOptions
    = { ESLint, eslintOptions, logWarning, migratedOptions, quiet, warnIgnored };

    function migrateOption(
        oldName,
        newName = oldName,
        newOptions = overrideConfig,
        needsMigration = hasOwn(eslintOptions, oldName),
        convert
    ) {
        if (needsMigration) {
            const value = eslintOptions[oldName];
            delete eslintOptions[oldName];
            {
                const newDisplayName
                = newOptions === overrideConfig ? `overrideConfig.${newName}` : newName;
                const formatChanged = convert != null;
                const migratedOption = { oldName, newName: newDisplayName, formatChanged };
                migratedOptions.push(migratedOption);
            }
            newOptions[newName] = convert != null ? convert(value) : value;
        }
    }

    migrateOption('configFile', 'overrideConfigFile', eslintOptions);
    migrateOption('envs', 'env', undefined, undefined, envs => toBooleanMap(envs, true, 'envs'));
    migrateOption('extends');
    migrateOption(
        'globals',
        undefined,
        undefined,
        undefined,
        globals => toBooleanMap(globals, false, 'globals')
    );
    migrateOption('ignorePattern', 'ignorePatterns');
    migrateOption('parser');
    migrateOption('parserOptions');
    migrateOption('plugins', undefined, undefined, Array.isArray(eslintOptions.plugins));
    migrateOption('rules');
    migrateOption('warnFileIgnored', 'warnIgnored', organizedOptions);
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
exports.resolveFormatter = async ({ cwd, eslint }, formatter) => {
    if (formatter === undefined) {
        const { format } = await eslint.loadFormatter();
        return {
            format: results =>
                format(results)
                    .replace(
                        / with the `--fix` option\.(?=(\u001b\[\d+m|\n)+$)/,
                        ` - see ${makeNPMLink('autofix')}`
                    )
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
                        }
                    }
                );
            }
        };
    }
    // Use ESLint to look up formatter references.
    return eslint.loadFormatter(formatter);
};

/**
 * Resolve a writer function used to write formatted ESLint messages.
 *
 * @param {GulpESLintWriter | NodeJS.WritableStream} [writer=fancyLog]
 * A stream or function to resolve as a format writer.
 * @returns {GulpESLintWriter} A function that writes formatted messages.
 */
exports.resolveWriter = (writer = fancyLog) => {
    if (isObject(writer)) {
        const { write } = writer;
        if (typeof write === 'function') {
            writer = write.bind(writer);
        }
    }
    return writer;
};

exports.warn
= (message, logWarning = fancyLog.warn) => logWarning(`\x1b[1m\x1b[33m${message}\x1b[0m`);

/**
 * Write formatted ESLint messages.
 *
 * @param {ESLint.LintResult[]} results
 * A list of ESLint results.
 *
 * @param {LoadedFormatter} formatterObj
 * A formatter object.
 *
 * @param {GulpESLintWriter} [writer]
 * A function used to write formatted ESLint messages.
 */
exports.writeResults = async (results, formatterObj, writer) => {
    const message = await formatterObj.format(results);
    if (writer && message != null && message !== '') {
        await writer(message);
    }
};
