'use strict';

// npm install gulp gulp-eslint-new gulp-if

const { dest, src } = require('gulp');
const gulpESLintNew = require('gulp-eslint-new');
const gulpIf        = require('gulp-if');

function isFixed(file) {
	return file.eslint != null && file.eslint.fixed;
}

function lintNFix() {
	// Use a fixed base directory.
	const base = '.';
	return src('demo/**/*.js', { base })
		.pipe(gulpESLintNew({ fix: true }))
		.pipe(gulpESLintNew.format())
		// If a file has a fix, overwrite it.
		.pipe(gulpIf(isFixed, dest(base)));
}

function lintNFixWithCWD() {
	// Use a fixed base directory where all files are contained.
	const base = 'demo';
	return src('**/*.js', { base, cwd: base })
		.pipe(gulpESLintNew({ fix: true }))
		.pipe(gulpESLintNew.format())
		// If a file has a fix, overwrite it.
		.pipe(gulpIf(isFixed, dest(base)));
}

function lintNFixWithCallback() {
	return src('demo/**/*.js')
		.pipe(gulpESLintNew({ fix: true }))
		.pipe(gulpESLintNew.format())
		// If a file has a fix, overwrite it.
		.pipe(gulpIf(isFixed, dest(({ base }) => base)));
}

function flagNFix() {
	const hasFixFlag = process.argv.slice(2).includes('--fix');
	return src('demo/**/*.js', { base: '/' })
		.pipe(gulpESLintNew({ fix: hasFixFlag }))
		.pipe(gulpESLintNew.format())
		// If a file has a fix, overwrite it.
		.pipe(gulpIf(isFixed, dest('/')));
}

module.exports = {
	'default': lintNFix,
	'lint-n-fix': lintNFix,
	'lint-n-fix-with-cwd': lintNFixWithCWD,
	'lint-n-fix-with-cb': lintNFixWithCallback,
	'flag-n-fix': flagNFix
};
