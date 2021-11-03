/**
 * @author Nicholas C. Zakas
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { Legacy: { naming, ModuleResolver } } = require('@eslint/eslintrc');

const path = require('path');

/**
 * Returns the formatter representing the given format or null if the `format` is not a string.
 * @param {string} [format] The name of the format to load or the path to a custom formatter.
 * @throws {any} As may be thrown by requiring the formatter.
 * @returns {Function} The formatter function.
 */
function getFormatter(format) {

	// default is stylish
	const resolvedFormatName = format == null ? 'stylish' : `${format}`;

	// replace \ with / for Windows compatibility
	const normalizedFormatName = resolvedFormatName.replace(/\\/gu, '/');

	const cwd = process.cwd();
	const namespace = naming.getNamespaceFromTerm(normalizedFormatName);

	let formatterPath;

	// if there's a slash, then it's a file
	if (!namespace && normalizedFormatName.includes('/')) {
		formatterPath = path.resolve(cwd, normalizedFormatName);
	} else {
		try {
			const npmFormat
			= naming.normalizePackageName(normalizedFormatName, 'eslint-formatter');

			formatterPath
			= ModuleResolver.resolve(npmFormat, path.join(cwd, '__placeholder__.js'));
		} catch (ex) {
			const baseDir = require.resolve('eslint');
			formatterPath
			= path.resolve(baseDir, '../cli-engine/formatters', normalizedFormatName);
		}
	}

	try {
		return require(formatterPath);
	} catch (ex) {
		/* c8 ignore start */
		if (format === 'table' || format === 'codeframe') {
			ex.message
			= `The ${format} formatter is no longer part of core ESLint. Install it manually `
			+ `with \`npm install -D eslint-formatter-${format}\``;
			/* c8 ignore stop */
		} else {
			ex.message
			= `There was a problem loading formatter: ${formatterPath}\nError: ${ex.message}`;
		}
		throw ex;
	}
}

module.exports = getFormatter;
