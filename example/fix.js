'use strict';

// npm install gulp gulp-eslint-new gulp-if

const { dest, src } = require('gulp');
const eslint        = require('gulp-eslint-new');
const gulpIf        = require('gulp-if');

function isFixed(file) {
	return file.eslint != null && file.eslint.fixed;
}

function lintNFix() {
	return src('demo/**/*.js', { base: './' })
		.pipe(eslint({ fix: true }))
		.pipe(eslint.format())
		// If fixed, write the file to dest.
		.pipe(gulpIf(isFixed, dest('./')));
}

function flagNFix() {
	const hasFixFlag = process.argv.slice(2).includes('--fix');
	return src('demo/**/*.js', { base: './' })
		.pipe(eslint({ fix: hasFixFlag }))
		.pipe(eslint.format())
		// If fixed, write the file to dest.
		.pipe(gulpIf(isFixed, dest('./')));
}

module.exports = {
	'default': lintNFix,
	'lint-n-fix': lintNFix,
	'flag-n-fix': flagNFix
};
