'use strict';

// npm install fancy-log gulp gulp-eslint-new

const fancyLog      = require('fancy-log');
const { src }       = require('gulp');
const gulpESLintNew = require('gulp-eslint-new');

function failImmediately() {
    return src('demo/**/*.js')
    .pipe(gulpESLintNew())
    // Format one at time since this stream may fail before it can format them all at the end.
    .pipe(gulpESLintNew.formatEach())
    // failOnError will emit an error (fail) immediately upon the first file that has an error.
    .pipe(gulpESLintNew.failOnError())
    // Need to do something when ESLint finds an error? Try this:
    .once(
        'error',
        function (error) {
            fancyLog('Lint failed: see message below for details.');
            this.emit('error', error);
        },
    );
}

function failAtEnd() {
    return src('demo/**/*.js')
    .pipe(gulpESLintNew())
    // Format all results at once, at the end.
    .pipe(gulpESLintNew.format())
    // failAfterError will emit an error (fail) just before the stream finishes if any file has an
    // error.
    .pipe(gulpESLintNew.failAfterError());
}

module.exports =
{
    'default':          failImmediately,
    'fail-immediately': failImmediately,
    'fail-at-end':      failAtEnd,
};
