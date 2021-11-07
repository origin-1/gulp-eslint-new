'use strict';

// npm install gulp gulp-eslint-new

const { series, src } = require('gulp');
const eslint          = require('gulp-eslint-new');

function quietLint() {
	return src('../test/fixtures/**/*.js')
		.pipe(eslint({ quiet: true }))
		.pipe(eslint.format());
}

function isWarning(message) {
	return message.severity === 1;
}

function lintWarnings() {
	return src('../test/fixtures/**/*.js')
		.pipe(eslint({ quiet: isWarning }))
		.pipe(eslint.format());
}

module.exports = {
	'default': series(quietLint, lintWarnings),
	'quiet-lint': quietLint,
	'lint-warnings': lintWarnings
};
