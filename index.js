'use strict';

const {
	createIgnoreResult,
	createPluginError,
	createTransform,
	filterResult,
	fix,
	hasOwn,
	isErrorMessage,
	migrateOptions,
	resolveWriter,
	writeResults
} = require('./util');
const { ESLint }    = require('eslint');
const { promisify } = require('util');
const { dest }      = require('vinyl-fs');

function getESLintInfo(file) {
	const eslintInfo = file._eslintInfo;
	if (eslintInfo != null) {
		return eslintInfo;
	}
	throw createPluginError({ fileName: file.path, message: 'ESLint information not available' });
}

function wrapAction(action) {
	if (typeof action !== 'function') {
		throw TypeError('Argument is not a function');
	}
	if (action.length > 1) {
		action = promisify(action);
	}
	return action;
}

async function lintFile(eslintInfo, file, quiet, warnIgnored) {
	if (file.isNull()) {
		return;
	}
	if (file.isStream()) {
		throw 'gulp-eslint-new doesn\'t support Vinyl files with Stream contents.';
	}
	const { eslint } = eslintInfo;
	// The "path" property of a Vinyl file should be always an absolute path.
	// See https://gulpjs.com/docs/en/api/vinyl/#instance-properties.
	const filePath = file.path;
	let result;
	if (await eslint.isPathIgnored(filePath)) {
		// Note: ESLint doesn't adjust file paths relative to an ancestory .eslintignore path.
		// E.g., If ../.eslintignore has "foo/*.js", ESLint will ignore ./foo/*.js, instead of
		// ../foo/*.js.
		if (!warnIgnored) {
			return;
		}
		// Warn that gulp.src is needlessly reading files that ESLint ignores.
		result = createIgnoreResult(filePath, eslintInfo.cwd);
	} else {
		[result] = await eslint.lintText(file.contents.toString(), { filePath });
		// Note: Fixes are applied as part of `lintText`.
		// Any applied fix messages have been removed from the result.
		if (quiet) {
			// Ignore some messages.
			const filter = typeof quiet === 'function' ? quiet : isErrorMessage;
			result = filterResult(result, filter);
		}
		file.eslint = result;
		// Update the fixed output; otherwise, fixable messages are simply ignored.
		if (hasOwn(result, 'output')) {
			file.contents = Buffer.from(result.output);
			result.fixed = true;
		}
	}
	file.eslint = result;
	file._eslintInfo = eslintInfo;
}

module.exports = exports = options => {
	const { eslintOptions, quiet, warnIgnored } = migrateOptions(options);
	const cwd = eslintOptions.cwd || process.cwd();
	const eslint = new ESLint(eslintOptions);
	const eslintInfo = { cwd, eslint };
	return createTransform(file => lintFile(eslintInfo, file, quiet, warnIgnored));
};

exports.result = action => {
	action = wrapAction(action);
	return createTransform(
		async file => {
			const { eslint } = file;
			if (eslint) {
				await action(eslint);
			}
		}
	);
};

exports.results = action => {
	action = wrapAction(action);
	const results = [];
	results.errorCount          = 0;
	results.warningCount        = 0;
	results.fixableErrorCount   = 0;
	results.fixableWarningCount = 0;
	results.fatalErrorCount     = 0;
	return createTransform(
		({ eslint }) => {
			if (eslint) {
				results.push(eslint);
				// Collect total error/warning count.
				results.errorCount          += eslint.errorCount;
				results.warningCount        += eslint.warningCount;
				results.fixableErrorCount   += eslint.fixableErrorCount;
				results.fixableWarningCount += eslint.fixableWarningCount;
				results.fatalErrorCount     += eslint.fatalErrorCount;
			}
		},
		async () => {
			await action(results);
		}
	);
};

exports.failOnError = () => exports.result(result => {
	const { messages } = result;
	if (messages) {
		const error = messages.find(isErrorMessage);
		if (error) {
			throw createPluginError({
				name: 'ESLintError',
				fileName: result.filePath,
				message: error.message,
				lineNumber: error.line
			});
		}
	}
});

exports.failAfterError = () => exports.results(({ errorCount }) => {
	if (errorCount) {
		throw createPluginError({
			name: 'ESLintError',
			message: `Failed with ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`
		});
	}
});

exports.formatEach = (formatter, writer) => {
	writer = resolveWriter(writer);
	return createTransform(
		async file => {
			const { eslint } = file;
			if (eslint) {
				const eslintInfo = getESLintInfo(file);
				await writeResults([eslint], eslintInfo, formatter, writer);
			}
		}
	);
};

exports.format = (formatter, writer) => {
	writer = resolveWriter(writer);
	const results = [];
	let commonInfo;
	return createTransform(
		file => {
			const { eslint } = file;
			if (eslint) {
				const eslintInfo = getESLintInfo(file);
				if (commonInfo == null) {
					commonInfo = eslintInfo;
				} else {
					if (eslintInfo !== commonInfo) {
						throw createPluginError({
							name: 'ESLintError',
							message: 'The files in the stream were not processed by the same '
								+ 'instance of ESLint'
						});
					}
				}
				results.push(eslint);
			}
		},
		async () => {
			if (results.length) {
				await writeResults(results, commonInfo, formatter, writer);
			}
		}
	);
};

exports.fix = () => fix(dest);
