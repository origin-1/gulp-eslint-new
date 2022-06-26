'use strict';

// npm install gulp gulp-eslint-new

const { createWriteStream } = require('fs');
const { series, src }       = require('gulp');
const gulpESLintNew         = require('gulp-eslint-new');
const { stdout }            = require('process');
const { inspect }           = require('util');

function defaultFormatter() {
    return src('demo/**/*.js')
        .pipe(gulpESLintNew()) // Lint all files.
        // Use ESLint's default formatter by default.
        .pipe(gulpESLintNew.format());
}

function eslintFormatter() {
    return src('demo/**/*.js')
        .pipe(gulpESLintNew()) // Lint all files.
        // Name a built-in formatter or path load.
        // https://eslint.org/docs/user-guide/command-line-interface#-f%2C---format
        .pipe(gulpESLintNew.formatEach('unix'));
}

function customFormatter() {
    return src('demo/**/*.js')
        .pipe(gulpESLintNew()) // Lint all files.
        // Format results using a custom function.
        .pipe(gulpESLintNew.format(results => inspect(results, { depth: 3 }), stdout));
}

function formatToFile() {
    return src('demo/**/*.js')
        .pipe(gulpESLintNew()) // Lint all files.
        // Format results using the default formatter, write to a file.
        .pipe(gulpESLintNew.format('html', createWriteStream('lint-report.html')));
}

module.exports = {
    'default': series(defaultFormatter, eslintFormatter, customFormatter, formatToFile),
    'default-formatter': defaultFormatter,
    'eslint-formatter': eslintFormatter,
    'custom-formatter': customFormatter,
    'format-to-file': formatToFile
};
