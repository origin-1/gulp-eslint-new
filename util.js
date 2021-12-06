'use strict';

const fancyLog      = require('fancy-log');
const { relative }  = require('path');
const PluginError   = require('plugin-error');
const { Transform } = require('stream');

function createPluginError(error) {
	if (error instanceof PluginError) {
		return error;
	}
	if (error == null) {
		error = 'Unknown Error';
	}
	return new PluginError('gulp-eslint-new', error);
}
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
 * Errors thrown by the handlers will be wrapped inside a `PluginError` and emitted from the stream.
 *
 * @param {Function} handleFile
 * A function that is called for each file, with the file object as the only parameter.
 * If the function returns a promise, the file will be passed through the stream after the promise is resolved.
 *
 * @param {Function} [handleFinal]
 * A function that is called with no parameters before closing the stream.
 * If the function returns a promise, the stream will be closed after the promise is resolved.
 *
 * @returns {Stream} A transform stream.
 */
exports.createTransform = (handleFile, handleFinal) => {
	const transform = (file, enc, done) => void awaitHandler(() => handleFile(file), file, done);
	const final = handleFinal ? done => void awaitHandler(handleFinal, null, done) : undefined;
	return new Transform({ objectMode: true, transform, final });
};

const isHiddenRegExp = /(?<![^/\\])\.(?!\.)/u;
const isInNodeModulesRegExp = /(?<![^/\\])node_modules[/\\]/u;

/**
 * This is a remake of the CLI object `createIgnoreResult` function with no reference to ESLint
 * CLI options and with a better detection of the ignore reason in some edge cases.
 * Additionally, this function addresses an issue in ESLint that consists in the property
 * `fatalErrorCount` not being set in the result.
 *
 * @param {string} filePath - Absolute path of checked code file.
 * @param {string} baseDir - Absolute path of base directory.
 * @returns {LintResult} Result with warning by ignore settings.
 */
exports.createIgnoreResult = (filePath, baseDir) => {
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
			= 'File ignored because of a matching ignore pattern. Set "ignore" option to false '
			+ 'to override.';
	}

	return {
		filePath,
		messages: [{ fatal: false, severity: 1, message }],
		errorCount: 0,
		warningCount: 1,
		fixableErrorCount: 0,
		fixableWarningCount: 0,
		fatalErrorCount: 0
	};
};

/* Determine if the specified object has the indicated property as its own property. */
const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
exports.hasOwn = hasOwn;

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
 * @param {string[]|null} keys The keys to assign true.
 * @param {boolean} defaultValue The default value for each property.
 * @param {string} displayName The property name which is used in error message.
 * @returns {Record<string,boolean>} The boolean map.
 */
function toBooleanMap(keys, defaultValue, displayName) {
	if (keys && !Array.isArray(keys)) {
		throwInvalidOptionError(`Option ${displayName} must be an array`);
	}
	if (keys && keys.length > 0) {
		return keys.reduce((map, def) => {
			const [key, value] = def.split(':');

			if (key !== '__proto__') {
				map[key] = value === undefined ? defaultValue : value === 'true';
			}

			return map;
		}, { });
	}
}

const forbiddenOptions = [
	'cache',
	'cacheFile',
	'cacheLocation',
	'cacheStrategy',
	'errorOnUnmatchedPattern',
	'extensions',
	'globInputPaths'
];

/**
 * Create config helper to merge various config sources.
 *
 * @param {Object} options - Options to migrate.
 * @returns {Object} Migrated options.
 */
exports.migrateOptions = function migrateOptions(options = { }) {
	if (typeof options === 'string') {
		// Basic config path overload: `eslint('path/to/config.json')`.
		const returnValue = { eslintOptions: { overrideConfigFile: options } };
		return returnValue;
	}
	const {
		overrideConfig: originalOverrideConfig,
		quiet,
		warnFileIgnored,
		warnIgnored: originalWarnIgnored,
		...eslintOptions
	}
	= options;
	{
		const invalidOptions = forbiddenOptions.filter(option => hasOwn(options, option));
		if (invalidOptions.length) {
			throwInvalidOptionError(`Invalid options: ${invalidOptions.join(', ')}`);
		}
	}
	if (originalOverrideConfig != null && typeof originalOverrideConfig !== 'object') {
		throwInvalidOptionError('Option overrideConfig must be an object or null');
	}
	const overrideConfig = eslintOptions.overrideConfig
	= originalOverrideConfig != null ? { ...originalOverrideConfig } : { };

	function migrateOption(oldName, newName = oldName, convert = value => value) {
		const value = eslintOptions[oldName];
		delete eslintOptions[oldName];
		if (value !== undefined) {
			overrideConfig[newName] = convert(value);
		}
	}

	{
		const { configFile } = eslintOptions;
		delete eslintOptions.configFile;
		if (configFile !== undefined) {
			eslintOptions.overrideConfigFile = configFile;
		}
	}
	migrateOption('envs', 'env', envs => toBooleanMap(envs, true, 'envs'));
	migrateOption('globals', undefined, globals => toBooleanMap(globals, false, 'globals'));
	migrateOption('ignorePattern', 'ignorePatterns');
	migrateOption('parser');
	migrateOption('parserOptions');
	if (Array.isArray(eslintOptions.plugins)) {
		migrateOption('plugins');
	}
	migrateOption('rules');
	const warnIgnored = warnFileIgnored !== undefined ? warnFileIgnored : originalWarnIgnored;
	const returnValue = { eslintOptions, quiet, warnIgnored };
	return returnValue;
};

/**
 * Get first message in an ESLint result to meet a condition.
 *
 * @param {LintResult} result - An ESLint result.
 * @param {Function} condition - A condition function that is passed a message and returns a boolean.
 * @returns {Object} The first message to pass the condition or null.
 */
exports.firstResultMessage = (result, condition) => {
	if (!result.messages) {
		return null;
	}

	return result.messages.find(condition);
};

/**
 * Determine if a message is an error.
 *
 * @param {Object} message - An ESLint message.
 * @returns {boolean} Whether the message is an error message.
 */
function isErrorMessage({ severity }) {
	return severity > 1;
}
exports.isErrorMessage = isErrorMessage;

/**
 * Determine if a message is a warning.
 *
 * @param {Object} message - An ESLint message.
 * @returns {boolean} Whether the message is a warning message.
 */
function isWarningMessage({ severity }) {
	return severity === 1;
}
exports.isWarningMessage = isWarningMessage;

/**
 * Increment count if message is an error.
 *
 * @param {number} count - Number of errors.
 * @param {Object} message - An ESLint message.
 * @returns {number} The number of errors, message included.
 */
function countErrorMessage(count, message) {
	return count + Number(isErrorMessage(message));
}

/**
 * Increment count if message is a warning.
 *
 * @param {number} count - Number of warnings.
 * @param {Object} message - An ESLint message.
 * @returns {number} The number of warnings, message included.
 */
function countWarningMessage(count, message) {
	return count + Number(isWarningMessage(message));
}

/**
 * Increment count if message is a fixable error.
 *
 * @param {number} count - Number of fixable errors.
 * @param {Object} message - An ESLint message.
 * @returns {number} The number of fixable errors, message included.
 */
function countFixableErrorMessage(count, message) {
	return count + Number(isErrorMessage(message) && message.fix !== undefined);
}

/**
 * Increment count if message is a fixable warning.
 *
 * @param {Number} count - Number of fixable warnings.
 * @param {Object} message - An ESLint message.
 * @returns {Number} The number of fixable warnings, message included.
 */
function countFixableWarningMessage(count, message) {
	return count + Number(isWarningMessage(message) && message.fix !== undefined);
}

/**
 * Increment count if message is a fatal error.
 *
 * @param {Number} count - Number of fatal errors.
 * @param {Object} message - An ESLint message.
 * @returns {Number} The number of fatal errors, message included.
 */
function countFatalErrorMessage(count, message) {
	return count + Number(isErrorMessage(message) && !!message.fatal);
}

/**
 * Filter result messages, update error and warning counts.
 *
 * @param {LintResult} result - An ESLint result.
 * @param {Function} filter - A function that evaluates what messages to keep.
 * @returns {LintResult} A filtered ESLint result.
 */
exports.filterResult = (result, filter) => {
	const messages = result.messages.filter(filter, result);
	const newResult = {
		filePath: result.filePath,
		messages: messages,
		errorCount: messages.reduce(countErrorMessage, 0),
		warningCount: messages.reduce(countWarningMessage, 0),
		fixableErrorCount: messages.reduce(countFixableErrorMessage, 0),
		fixableWarningCount: messages.reduce(countFixableWarningMessage, 0),
		fatalErrorCount: messages.reduce(countFatalErrorMessage, 0)
	};
	if ('output' in result) {
		newResult.output = result.output;
	}
	if ('source' in result) {
		newResult.source = result.source;
	}
	return newResult;
};

function compareResultsByFilePath({ filePath: filePath1 }, { filePath: filePath2 }) {
	if (filePath1 > filePath2) {
		return 1;
	}
	if (filePath1 < filePath2) {
		return -1;
	}
	return 0;
}
exports.compareResultsByFilePath = compareResultsByFilePath;

const { defineProperty } = Object;

/**
 * Resolve formatter from string.
 * If a function is specified, it will be treated as an ESLint 6 style formatter function and
 * wrapped into an object appropriately.
 *
 * @param {{ cwd: string, eslint: ESLint }} eslintInfo
 * Current directory and instance of ESLint used to load and configure the formatter.
 *
 * @param {string|Function} [formatter]
 * A name or path of a formatter, or an ESLint 6 style formatter function to resolve as a formatter.
 *
 * @returns {Promise<ESLint.Formatter>} An ESLint formatter.
 */
async function resolveFormatter({ cwd, eslint }, formatter) {
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
}
exports.resolveFormatter = resolveFormatter;

/**
 * Resolve writable.
 *
 * @param {Function|Stream} [writable=fancyLog] - A stream or function to resolve as a format writer.
 * @returns {Function} A function that writes formatted messages.
 */
exports.resolveWritable = (writable = fancyLog) => {
	const { write } = writable;
	if (typeof write === 'function') {
		writable = write.bind(writable);
	}
	return writable;
};

/**
 * Write formatter results to writable/output.
 *
 * @param {ESLint.LintResult[]} results
 * A list of ESLint results.
 *
 * @param {{ cwd: string, eslint: ESLint }} eslintInfo
 * Current directory and instance of ESLint used to load and configure the formatter.
 *
 * @param {string|Function} [formatter]
 * A name or path of a formatter, or an ESLint 6 style formatter function to resolve as a formatter.
 *
 * @param {Function} [writable]
 * A function used to write formatted ESLint results.
 */
exports.writeResults = async (results, eslintInfo, formatter, writable) => {
	const formatterObj = await resolveFormatter(eslintInfo, formatter);
	const message = await formatterObj.format(results);
	if (writable && message != null && message !== '') {
		writable(message);
	}
};
