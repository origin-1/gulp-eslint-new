'use strict';

// npm install gulp gulp-eslint-new

const { series, src } = require('gulp');
const eslint          = require('gulp-eslint-new');

function quietLint() {
	return src('demo/**/*.js')
		.pipe(eslint({ quiet: true }))
		.pipe(eslint.format());
}

function lintWarnings() {
	return src('demo/**/*.js')
		.pipe(eslint({ quiet: ({ severity }) => severity === 1 }))
		.pipe(eslint.format());
}

module.exports = {
	'default': series(quietLint, lintWarnings),
	'quiet-lint': quietLint,
	'lint-warnings': lintWarnings
};
