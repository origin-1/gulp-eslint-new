'use strict';

const {
	createIgnoreResult,
	createPluginError,
	filterResult,
	firstResultMessage,
	hasOwn,
	isErrorMessage,
	migrateOptions,
	resolveWritable,
	createTransform,
	writeResults
} = require('./util');
const { ESLint }    = require('eslint');
const { promisify } = require('util');

function getESLintInstance(file) {
	const eslintInstance = file._eslintInstance;
	if (eslintInstance != null) {
		return eslintInstance;
	}
	throw createPluginError({ fileName: file.path, message: 'ESLint instance not found' });
}

async function lintFile(eslintInstance, file, cwd, quiet, warnIgnored) {
	if (file.isNull()) {
		return;
	}

	if (file.isStream()) {
		throw 'gulp-eslint-new doesn\'t support Vinyl files with Stream contents.';
	}

	// The "path" property of a Vinyl file should be always an absolute path.
	// See https://gulpjs.com/docs/en/api/vinyl/#instance-properties.
	const filePath = file.path;
	if (await eslintInstance.isPathIgnored(filePath)) {
		// Note: ESLint doesn't adjust file paths relative to an ancestory .eslintignore path.
		// E.g., If ../.eslintignore has "foo/*.js", ESLint will ignore ./foo/*.js, instead of ../foo/*.js.
		// ESLint rolls this into `ESLint.prototype.lintText`. So, gulp-eslint-new must account for this limitation.

		if (warnIgnored) {
			// Warn that gulp.src is needlessly reading files that ESLint ignores.
			file.eslint = createIgnoreResult(filePath, cwd);
		}
		return;
	}

	const [result] = await eslintInstance.lintText(file.contents.toString(), { filePath });
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
	file._eslintInstance = eslintInstance;

	// Update the fixed output; otherwise, fixable messages are simply ignored.
	if (hasOwn(eslint, 'output')) {
		file.contents = Buffer.from(eslint.output);
		eslint.fixed = true;
	}
}

function gulpEslint(options) {
	const { eslintOptions, quiet, warnIgnored } = migrateOptions(options);
	const eslintInstance = new ESLint(eslintOptions);
	const cwd = eslintOptions.cwd || process.cwd();
	return createTransform(
		file => lintFile(eslintInstance, file, cwd, quiet, warnIgnored)
	);
}

gulpEslint.result = action => {
	if (typeof action !== 'function') {
		throw new Error('Expected callable argument');
	}
	if (action.length > 1) {
		action = promisify(action);
	}
	return createTransform(async file => {
		const { eslint } = file;
		if (eslint) {
			await action(eslint);
		}
	});
};

gulpEslint.results = function (action) {
	if (typeof action !== 'function') {
		throw new Error('Expected callable argument');
	}
	if (action.length > 1) {
		action = promisify(action);
	}
	const results = [];
	results.errorCount = 0;
	results.warningCount = 0;
	results.fixableErrorCount = 0;
	results.fixableWarningCount = 0;
	results.fatalErrorCount = 0;
	return createTransform(file => {
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
	}, async () => {
		await action(results);
	});
};

gulpEslint.failOnError = () => {
	return gulpEslint.result(result => {
		const error = firstResultMessage(result, isErrorMessage);
		if (!error) {
			return;
		}

		throw createPluginError({
			name: 'ESLintError',
			fileName: result.filePath,
			message: error.message,
			lineNumber: error.line
		});
	});
};

gulpEslint.failAfterError = () => {
	return gulpEslint.results(results => {
		const count = results.errorCount;
		if (!count) {
			return;
		}

		throw createPluginError({
			name: 'ESLintError',
			message: `Failed with ${count} ${count === 1 ? 'error' : 'errors'}`
		});
	});
};

gulpEslint.formatEach = (formatter, writable) => {
	writable = resolveWritable(writable);
	return createTransform(async file => {
		const { eslint } = file;
		if (eslint) {
			const eslintInstance = getESLintInstance(file);
			await writeResults([eslint], eslintInstance, formatter, writable);
		}
	});
};

gulpEslint.format = (formatter, writable) => {
	writable = resolveWritable(writable);
	const results = [];
	let commonInstance;
	return createTransform(file => {
		const { eslint } = file;
		if (eslint) {
			const eslintInstance = getESLintInstance(file);
			if (commonInstance == null) {
				commonInstance = eslintInstance;
			} else {
				if (eslintInstance !== commonInstance) {
					throw createPluginError({
						name: 'ESLintError',
						message: 'The files in the stream were not processes by the same '
							+ 'instance of ESLint'
					});
				}
			}
			results.push(eslint);
		}
	}, async () => {
		if (results.length) {
			await writeResults(results, commonInstance, formatter, writable);
		}
	});
};

module.exports = gulpEslint;
