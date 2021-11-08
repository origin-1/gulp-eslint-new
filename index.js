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
	tryAction,
	writeResults
} = require('./util');
const { ESLint }  = require('eslint');
const PluginError = require('plugin-error');

function createPluginError(...args) {
	return new PluginError('gulp-eslint-new', ...args);
}

function getESLintInstance(file, done) {
	const eslintInstance = file._eslintInstance;
	if (eslintInstance != null) {
		return eslintInstance;
	}

	done(createPluginError({ fileName: file.path, message: 'ESLint instance not found' }));
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

	return transform((file, enc, cb) => {
		lintFile(eslintInstance, file, cwd, quiet, warnIgnored)
			.then(() => cb(null, file))
			.catch(error => cb(createPluginError(error)));
	});
}

gulpEslint.result = action => {
	if (typeof action !== 'function') {
		throw new Error('Expected callable argument');
	}

	return transform((file, enc, done) => {
		if (file.eslint) {
			tryAction(action, file.eslint, handleCallback(done, file));
		} else {
			done(null, file);
		}
	});
};

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
		tryAction(action, results, handleCallback(done));
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
	formatter = resolveFormatter(formatter);
	writable = resolveWritable(writable);

	return transform((file, enc, done) => {
		const { eslint } = file;
		if (eslint) {
			const eslintInstance = getESLintInstance(file, done);
			if (eslintInstance) {
				tryAction(
					() => writeResults([eslint], eslintInstance, formatter, writable),
					null,
					handleCallback(done, file)
				);
			}
		} else {
			done(null, file);
		}
	});
};

gulpEslint.format = (formatter, writable) => {
	formatter = resolveFormatter(formatter);
	writable = resolveWritable(writable);

	const results = [];
	let commonInstance;
	return transform((file, enc, done) => {
		const { eslint } = file;
		if (eslint) {
			const eslintInstance = getESLintInstance(file, done);
			if (!eslintInstance) {
				return;
			}
			if (commonInstance == null) {
				commonInstance = eslintInstance;
			} else {
				if (eslintInstance !== commonInstance) {
					done(createPluginError({
						name: 'ESLintError',
						message: 'The files in the stream were not processes by the same '
							+ 'instance of ESLint'
					}));
					return;
				}
			}
			results.push(eslint);
		}
		done(null, file);
	}, done => {
		tryAction(() => {
			if (results.length) {
				writeResults(results, commonInstance, formatter, writable);
			}
		}, null, handleCallback(done));
	});
};

module.exports = gulpEslint;
