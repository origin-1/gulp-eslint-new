'use strict';

const {
	createIgnoreResult,
	filterResult,
	firstResultMessage,
	handleCallback,
	hasOwn,
	isErrorMessage,
	migrateOptions,
	resolveFormatter,
	resolveWritable,
	transform,
	tryResultAction,
	writeResults
} = require('./util');
const { ESLint }  = require('eslint');
const PluginError = require('plugin-error');

async function lintFile(linter, file, cwd, quiet, warnIgnored) {
	if (file.isNull()) {
		return;
	}

	if (file.isStream()) {
		throw 'gulp-eslint-new doesn\'t support vinyl files with Stream contents.';
	}

	// The "path" property of a Vinyl file should be always an absolute path.
	// See https://gulpjs.com/docs/en/api/vinyl/#instance-properties.
	const filePath = file.path;
	if (await linter.isPathIgnored(filePath)) {
		// Note: ESLint doesn't adjust file paths relative to an ancestory .eslintignore path.
		// E.g., If ../.eslintignore has "foo/*.js", ESLint will ignore ./foo/*.js, instead of ../foo/*.js.
		// ESLint rolls this into `ESLint.prototype.lintText`. So, gulp-eslint-new must account for this limitation.

		if (warnIgnored) {
			// Warn that gulp.src is needlessly reading files that ESLint ignores.
			file.eslint = createIgnoreResult(filePath, cwd);
		}
		return;
	}

	const [result] = await linter.lintText(file.contents.toString(), { filePath });
	// Note: Fixes are applied as part of `lintText`.
	// Any applied fix messages have been removed from the result.

	let eslint;
	if (quiet) {
		// Ignore some messages.
		const filter = typeof quiet === 'function' ? quiet : isErrorMessage;
		eslint = filterResult(result, filter);
	} else {
		eslint = result;
	}
	file.eslint = eslint;

	// Update the fixed output; otherwise, fixable messages are simply ignored.
	if (hasOwn(eslint, 'output')) {
		file.contents = Buffer.from(eslint.output);
		eslint.fixed = true;
	}
}

/**
 * Append ESLint result to each file.
 *
 * @param {Object|string} [options] - Configure options for running ESLint.
 * @returns {Stream} gulp file stream.
 */
function gulpEslint(options) {
	const { eslintOptions, quiet, warnIgnored } = migrateOptions(options);
	const linter = new ESLint(eslintOptions);
	const cwd = eslintOptions.cwd || process.cwd();

	return transform((file, enc, cb) => {
		lintFile(linter, file, cwd, quiet, warnIgnored)
			.then(() => cb(null, file))
			.catch(error => cb(new PluginError('gulp-eslint-new', error)));
	});
}

/**
 * Handle each ESLint result as it passes through the stream.
 *
 * @param {Function} action - A function to handle each ESLint result.
 * @returns {Stream} gulp file stream.
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
 * @param {Function} action - A function to handle all ESLint results.
 * @returns {Stream} gulp file stream.
 */
gulpEslint.results = function (action) {
	if (typeof action !== 'function') {
		throw new Error('Expected callable argument');
	}

	const results = [];
	results.errorCount = 0;
	results.warningCount = 0;
	results.fixableErrorCount = 0;
	results.fixableWarningCount = 0;
	results.fatalErrorCount = 0;

	return transform((file, enc, done) => {
		const { eslint } = file;
		if (eslint) {
			results.push(eslint);
			// Collect total error/warning count.
			results.errorCount          += eslint.errorCount;
			results.warningCount        += eslint.warningCount;
			results.fixableErrorCount   += eslint.fixableErrorCount;
			results.fixableWarningCount += eslint.fixableWarningCount;
			results.fatalErrorCount     += eslint.fatalErrorCount;
		}
		done(null, file);

	}, done => {
		tryResultAction(action, results, handleCallback(done));
	});
};

/**
 * Fail when an ESLint error is found in ESLint results.
 *
 * @returns {Stream} gulp file stream.
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
 * Fail when the stream ends if any ESLint error(s) occurred.
 *
 * @returns {Stream} gulp file stream
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
 * @param {string|Function} [formatter=stylish] - The name or function for a ESLint result formatter.
 * @param {Function|Stream} [writable=fancy-log] - A funtion or stream to write the formatted ESLint results.
 * @returns {Stream} gulp file stream.
 */
gulpEslint.formatEach = (formatter, writable) => {
	formatter = resolveFormatter(formatter);
	writable = resolveWritable(writable);

	return gulpEslint.result(result => writeResults([result], formatter, writable));
};

/**
 * Wait until all files have been linted and format all results at once.
 *
 * @param {string|Function} [formatter=stylish] - The name or function for a ESLint result formatter.
 * @param {Function|Stream} [writable=fancy-log] - A funtion or stream to write the formatted ESLint results.
 * @returns {Stream} gulp file stream.
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
