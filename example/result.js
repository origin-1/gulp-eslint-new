'use strict';

// npm install -D eslint@8 gulp gulp-eslint-new

const { src }       = require('gulp');
const gulpESLintNew = require('gulp-eslint-new');
const { join }      = require('path');

const MAX_PROBLEMS = 1;

function lintResult()
{
    // Be sure to return the stream; otherwise, you may not get a proper exit code.
    return src('demo/**/*.js')
    .pipe(gulpESLintNew({ cwd: join(__dirname, 'demo') }))
    .pipe(gulpESLintNew.formatEach())
    .pipe
    (
        gulpESLintNew.result
        (
            result =>
            {
                if (result.messages.length > MAX_PROBLEMS)
                {
                    // Report which file exceeded the limit.
                    // The error will be wrapped in a gulp PluginError.
                    throw {
                        name:       'TooManyProblems',
                        fileName:   result.filePath,
                        message:    'Too many problems!',
                    };
                }
            },
        ),
    );
}

function lintResultAsync()
{
    return src('demo/**/*.js')
    .pipe(gulpESLintNew({ cwd: join(__dirname, 'demo') }))
    .pipe(gulpESLintNew.formatEach())
    .pipe
    (
        gulpESLintNew.result
        (
            (result, done) =>
            {
                // As a basic example, we'll use setImmediate as an async process.
                setImmediate
                (
                    () =>
                    {
                        let error = null;
                        if (result.messages.length > MAX_PROBLEMS)
                        {
                            // Define the error. Any non-null/undefined value will work.
                            error =
                            {
                                name:       'TooManyProblems',
                                fileName:   result.filePath,
                                message:    'Too many problems!',
                                showStack:  false,
                            };
                        }
                        done(error);
                    },
                );
            },
        ),
    );
}

function lintResults()
{
    return src('demo/**/*.js')
    .pipe(gulpESLintNew({ cwd: join(__dirname, 'demo') }))
    .pipe(gulpESLintNew.format())
    .pipe
    (
        gulpESLintNew.results
        (
            results =>
            {
                if (results.errorCount + results.warningCount > MAX_PROBLEMS)
                {
                    // No specific file to complain about here.
                    throw Error('Too many problems!');
                }
            },
        ),
    );
}

function lintResultsAsync()
{
    return src('demo/**/*.js')
    .pipe(gulpESLintNew({ cwd: join(__dirname, 'demo') }))
    .pipe(gulpESLintNew.format())
    .pipe
    (
        gulpESLintNew.results
        (
            (results, done) =>
            {
                // Another async example...
                setTimeout
                (
                    () =>
                    {
                        let error = null;
                        if (results.errorCount + results.warningCount > MAX_PROBLEMS)
                            error = Error('Too many problems!');
                        done(error);
                    },
                );
            },
        ),
    );
}

module.exports =
{
    'default':              lintResults,
    'lint-result':          lintResult,
    'lint-result-async':    lintResultAsync,
    'lint-results':         lintResults,
    'lint-results-async':   lintResultsAsync,
};
