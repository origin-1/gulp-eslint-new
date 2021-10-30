'use strict';

const PluginError = require('plugin-error');
const { ESLint } = require('eslint');
const {
	createIgnoreResult,
	filterResult,
	firstResultMessage,
	handleCallback,
	isErrorMessage,
	migrateOptions,
	resolveFormatter,
	resolveWritable,
	transform,
	tryResultAction,
	writeResults
} = require('./util');
const { relative } = require('path');

async function lintFile(linter, file, quiet, warnIgnored) {
	if (file.isNull()) {
		return;
	}

	if (file.isStream()) {
		throw 'gulp-eslint-new doesn\'t support vinyl files with Stream contents.';
	}

	const filePath = relative(process.cwd(), file.path);
	if (await linter.isPathIgnored(filePath)) {
		// Note:
		// Vinyl files can have an independently defined cwd, but ESLint works relative to `process.cwd()`.
		// Also, ESLint doesn't adjust file paths relative to an ancestory .eslintignore path.
		// E.g., If ../.eslintignore has "foo/*.js", ESLint will ignore ./foo/*.js, instead of ../foo/*.js.
		// Eslint rolls this into `ESLint.lintText`. So, gulp-eslint-new must account for this limitation.

		if (warnIgnored) {
			// Warn that gulp.src is needlessly reading files that ESLint ignores
			file.eslint = createIgnoreResult(file);
		}
		return;
	}

	const [result] = await linter.lintText(file.contents.toString(), { filePath });
	// Note: Fixes are applied as part of "lintText".
	// Any applied fix messages have been removed from the result.

	if (quiet) {
		// ignore warnings
		file.eslint = filterResult(result, quiet);
	} else {
		file.eslint = result;
	}

	// Update the fixed output; otherwise, fixable messages are simply ignored.
	if (Object.prototype.hasOwnProperty.call(file.eslint, 'output')) {
		file.contents = Buffer.from(file.eslint.output);
		file.eslint.fixed = true;
	}
}

/**
 * Append ESLint result to each file
 *
 * @param {(Object|String)} [options] - Configure rules, env, global, and other options for running ESLint
 * @returns {stream} gulp file stream
 */
function gulpEslint(options) {
	const { eslintOptions, quiet, warnIgnored } = migrateOptions(options);
	const linter = new ESLint(eslintOptions);

	return transform((file, enc, cb) => {
		lintFile(linter, file, quiet, warnIgnored)
			.then(() => cb(null, file))
			.catch(error => cb(new PluginError('gulp-eslint-new', error)));
	});
}

/**
 * Handle each ESLint result as it passes through the stream.
 *
 * @param {Function} action - A function to handle each ESLint result
 * @returns {stream} gulp file stream
 */
gulpEslint.result = action => {
	if (typeof action !== 'function') {
		throw new Error('Expected callable argument');
	}

	return transform((file, enc, done) => {
		if (file.eslint) {
			tryResultAction(action, file.eslint, handleCallback(done, file));
		} else {
			done(null, file);
		}
	});
};

/**
 * Handle all ESLint results at the end of the stream.
 *
 * @param {Function} action - A function to handle all ESLint results
 * @returns {stream} gulp file stream
 */
gulpEslint.results = function (action) {
	if (typeof action !== 'function') {
		throw new Error('Expected callable argument');
	}

	const results = [];
	results.errorCount = 0;
	results.warningCount = 0;

	return transform((file, enc, done) => {
		if (file.eslint) {
			results.push(file.eslint);
			// collect total error/warning count
			results.errorCount += file.eslint.errorCount;
			results.warningCount += file.eslint.warningCount;
		}
		done(null, file);

	}, done => {
		tryResultAction(action, results, handleCallback(done));
	});
};

/**
 * Fail when an ESLint error is found in ESLint results.
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failOnError = () => {
	return gulpEslint.result(result => {
		const error = firstResultMessage(result, isErrorMessage);
		if (!error) {
			return;
		}

		throw new PluginError('gulp-eslint-new', {
			name: 'ESLintError',
			fileName: result.filePath,
			message: error.message,
			lineNumber: error.line
		});
	});
};

/**
 * Fail when the stream ends if any ESLint error(s) occurred
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failAfterError = () => {
	return gulpEslint.results(results => {
		const count = results.errorCount;
		if (!count) {
			return;
		}

		throw new PluginError('gulp-eslint-new', {
			name: 'ESLintError',
			message: `Failed with ${count} ${count === 1 ? 'error' : 'errors'}`
		});
	});
};

/**
 * Format the results of each file individually.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a ESLint result formatter
 * @param {(Function|Stream)} [writable=fancy-log] - A funtion or stream to write the formatted ESLint results.
 * @returns {stream} gulp file stream
 */
gulpEslint.formatEach = (formatter, writable) => {
	formatter = resolveFormatter(formatter);
	writable = resolveWritable(writable);

	return gulpEslint.result(result => writeResults([result], formatter, writable));
};

/**
 * Wait until all files have been linted and format all results at once.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a ESLint result formatter
 * @param {(Function|stream)} [writable=fancy-log] - A funtion or stream to write the formatted ESLint results.
 * @returns {stream} gulp file stream
 */
gulpEslint.format = (formatter, writable) => {
	formatter = resolveFormatter(formatter);
	writable = resolveWritable(writable);

	return gulpEslint.results(results => {
		// Only format results if files has been lint'd
		if (results.length) {
			writeResults(results, formatter, writable);
		}
	});
};

gulpEslint.PluginError = PluginError;

module.exports = gulpEslint;
