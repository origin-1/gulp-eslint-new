'use strict';

// npm install gulp gulp-cached gulp-eslint-new

const { src, watch } = require('gulp');
const gulpCached     = require('gulp-cached');
const gulpESLintNew  = require('gulp-eslint-new');
const { resolve }    = require('path');

function lintWatch() {
    // Lint only files that change after this watch starts.
    const lintAndPrint = gulpESLintNew();
    // Format results with each file, since this stream won't end.
    lintAndPrint.pipe(gulpESLintNew.formatEach());
    return watch('demo/**/*.js')
    .on(
        'all',
        (eventType, path) => {
            if (eventType === 'add' || eventType === 'change')
                src(path).pipe(lintAndPrint, { end: false });
        },
    );
}

const CACHE_NAME = 'eslint';

function uncache(path) {
    delete gulpCached.caches[CACHE_NAME][path];
}

function cachedLintWatch() {
    // Run the "cached-lint-watch" task initially and whenever a watched file changes.
    const globs = 'demo/**/*.js';
    return watch(
        globs,
        { ignoreInitial: false },
        () => src(globs)
        .pipe(gulpCached(CACHE_NAME))
        // Only uncached and changed files past this point.
        .pipe(gulpESLintNew())
        .pipe(gulpESLintNew.format())
        .pipe(gulpESLintNew.result(
            result => {
                if (result.messages.length > 0) {
                    // If a file has errors/warnings, uncache it.
                    uncache(result.filePath);
                }
            },
        )),
    )
    .on('unlink', path => uncache(resolve(path))); // Remove deleted files from cache.
}

module.exports =
{
    'default':              cachedLintWatch,
    'lint-watch':           lintWatch,
    'cached-lint-watch':    cachedLintWatch,
};
