'use strict';

// npm install gulp gulp-eslint-new

const { series, src } = require('gulp');
const gulpESLintNew   = require('gulp-eslint-new');

function quietLint() {
    return src('demo/**/*.js')
        .pipe(gulpESLintNew({ quiet: true }))
        .pipe(gulpESLintNew.format());
}

function lintWarnings() {
    return src('demo/**/*.js')
        .pipe(gulpESLintNew({ quiet: ({ severity }) => severity === 1 }))
        .pipe(gulpESLintNew.format());
}

module.exports =
{
    'default': series(quietLint, lintWarnings),
    'quiet-lint': quietLint,
    'lint-warnings': lintWarnings,
};
