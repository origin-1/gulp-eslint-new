'use strict';

// npm install -D eslint@8 gulp gulp-eslint-new

const { src }       = require('gulp');
const gulpESLintNew = require('gulp-eslint-new');
const { join }      = require('path');

function lintNFix()
{
    return src('demo/**/*.js')
    .pipe
    (
        gulpESLintNew
        (
            {
                cwd:    join(__dirname, 'demo'),
                fix:    true,
            },
        ),
    )
    .pipe(gulpESLintNew.format())
    // If a file has a fix, overwrite it.
    .pipe(gulpESLintNew.fix());
}

function flagNFix()
{
    // Fix only when the option "--fix" is specified in the command line.
    const hasFixFlag = process.argv.slice(2).includes('--fix');
    return src('demo/**/*.js')
    .pipe
    (
        gulpESLintNew
        (
            {
                cwd:    join(__dirname, 'demo'),
                fix:    hasFixFlag,
            },
        ),
    )
    .pipe(gulpESLintNew.format())
    // If a file has a fix, overwrite it.
    .pipe(gulpESLintNew.fix());
}

module.exports =
{
    'default':      lintNFix,
    'lint-n-fix':   lintNFix,
    'flag-n-fix':   flagNFix,
};
