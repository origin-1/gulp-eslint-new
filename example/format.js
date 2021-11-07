'use strict';

// npm install gulp gulp-eslint-new

const { series, src } = require('gulp');
const eslint          = require('gulp-eslint-new');

function eslintFormatter() {
	// Lint each file, and format all files at once.
	return src('../test/fixtures/**/*.js')
		.pipe(eslint())
		// Use eslint's default formatter by default.
		.pipe(eslint.format())
		// Name a built-in formatter or path load.
		// https://eslint.org/docs/user-guide/command-line-interface#-f---format
		.pipe(eslint.format('compact'));
}

function customFormatter() {
	function embolden(text) {
		return `\u001b[1m${text}\u001b[22m `;
	}

	function pluralish(count, text) {
		return `${count} ${text}${count === 1 ? '' : 's'}`;
	}

	return src('../test/fixtures/**/*.js')
		.pipe(eslint())
		.pipe(eslint.format(results => {

			// Return formatted text to display.
			return embolden('[Custom ESLint Summary]')
				+ pluralish(results.length, 'File') + ', '
				+ pluralish(results.errorCount, 'Error') + ', and '
				+ pluralish(results.warningCount, 'Warning');
		}));
}

module.exports = {
	'default': series(eslintFormatter, customFormatter),
	'eslint-formatter': eslintFormatter,
	'custom-formatter': customFormatter
};
