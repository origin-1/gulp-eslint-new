'use strict';

// npm install gulp gulp-eslint-new gulp-if

const eslint = require('..');
const { dest, src } = require('gulp');
const gulpIf = require('gulp-if');

function isFixed(file) {
	return file.eslint != null && file.eslint.fixed;
}

function lintNFix() {
	return src('../test/fixtures/**/*.js', { base: './' })
		.pipe(eslint({ fix: true }))
		.pipe(eslint.format())
		// if fixed, write the file to dest.
		.pipe(gulpIf(isFixed, dest('./')));
}

function flagNFix() {
	const hasFixFlag = process.argv.slice(2).includes('--fix');

	return src('../test/fixtures/**/*.js', { base: './' })
		.pipe(eslint({ fix: hasFixFlag }))
		.pipe(eslint.format())
		// if fixed, write the file to dest.
		.pipe(gulpIf(isFixed, dest('./')));
}

module.exports = {
	'default': lintNFix,
	'lint-n-fix': lintNFix,
	'flag-n-fix': flagNFix
};
