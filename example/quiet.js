'use strict';

// npm install -D eslint@8 gulp gulp-eslint-new

const { series, src }   = require('gulp');
const gulpESLintNew     = require('gulp-eslint-new');
const { join }          = require('path');

function quietLint()
{
    return src('demo/**/*.js')
    .pipe
    (
        gulpESLintNew
        (
            {
                cwd:    join(__dirname, 'demo'),
                quiet:  true,
            },
        ),
    )
    .pipe(gulpESLintNew.format());
}

function lintWarnings()
{
    return src('demo/**/*.js')
    .pipe
    (
        gulpESLintNew
        (
            {
                cwd:    join(__dirname, 'demo'),
                quiet:  ({ severity }) => severity === 1,
            },
        ),
    )
    .pipe(gulpESLintNew.format());
}

module.exports =
{
    'default':          series(quietLint, lintWarnings),
    'quiet-lint':       quietLint,
    'lint-warnings':    lintWarnings,
};
