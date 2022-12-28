/* eslint-env mocha */

'use strict';

const { createVinylFile }   = require('./test-util');
const { strict: assert }    = require('assert');
const gulpESLintNew         = require('gulp-eslint-new');
const { createRequire }     = require('module');

function requireAs(...ids)
{
    const requireAs = ids.reduce((requireAs, id) => createRequire(requireAs.resolve(id)), require);
    return requireAs('.');
}

describe
(
    'gulp-eslint-new failOnError',
    () =>
    {
        it
        (
            'should fail a file immediately if an error is found',
            done =>
            {
                const file = createVinylFile('invalid.js', 'x = 1;');
                const lintStream =
                gulpESLintNew({ baseConfig: { rules: { 'no-undef': 2 } }, useEslintrc: false });
                lintStream
                .pipe(gulpESLintNew.failOnError())
                .on
                (
                    'error',
                    error =>
                    {
                        assert.equal(error.fileName, file.path);
                        assert.equal(error.message, '\'x\' is not defined.');
                        assert.equal(error.plugin, 'gulp-eslint-new');
                        done();
                    },
                );
                lintStream.end(file);
            },
        );

        it
        (
            'should pass a file if only warnings are found',
            done =>
            {
                gulpESLintNew
                ({ baseConfig: { rules: { 'no-undef': 1, 'strict': 0 } }, useEslintrc: false })
                .pipe(gulpESLintNew.failOnError())
                .on('error', done)
                .on('finish', done)
                .end(createVinylFile('invalid.js', 'x = 0;'));
            },
        );

        it
        (
            'should handle ESLint reports without messages',
            done =>
            {
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                gulpESLintNew.failOnError()
                .on('error', done)
                .on('finish', done)
                .end(file);
            },
        );
    },
);

describe
(
    'gulp-eslint-new failAfterError',
    () =>
    {
        it
        (
            'should emit an error if ESLint finds an error in a file',
            done =>
            {
                const lintStream =
                gulpESLintNew({ baseConfig: { rules: { 'no-undef': 2 } }, useEslintrc: false });
                lintStream
                .pipe(gulpESLintNew.failAfterError())
                .on
                (
                    'error',
                    error =>
                    {
                        assert.equal(error.message, 'Failed with 1 error');
                        assert.equal(error.name, 'ESLintError');
                        assert.equal(error.plugin, 'gulp-eslint-new');
                        done();
                    },
                );
                lintStream.end(createVinylFile('invalid.js', 'x = 1;'));
            },
        );

        it
        (
            'should emit an error if ESLint finds multiple errors in a file',
            done =>
            {
                const lintStream =
                gulpESLintNew({ baseConfig: { rules: { 'no-undef': 2 } }, useEslintrc: false });
                lintStream
                .pipe(gulpESLintNew.failAfterError())
                .on
                (
                    'error',
                    error =>
                    {
                        assert.equal(error.message, 'Failed with 2 errors');
                        assert.equal(error.name, 'ESLintError');
                        assert.equal(error.plugin, 'gulp-eslint-new');
                        done();
                    },
                );
                lintStream.end(createVinylFile('invalid.js', 'x = 1; a = false;'));
            },
        );

        it
        (
            'should pass when the file stream ends if only warnings are found',
            done =>
            {
                gulpESLintNew
                ({ baseConfig: { rules: { 'no-undef': 1, strict: 0 } }, useEslintrc: false })
                .pipe(gulpESLintNew.failAfterError())
                .on('error', done)
                .on('finish', done)
                .end(createVinylFile('invalid.js', 'x = 0;'));
            },
        );

        it
        (
            'should handle ESLint reports without messages',
            done =>
            {
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                gulpESLintNew.failAfterError()
                .on('error', done)
                .on('finish', done)
                .end(file);
            },
        );

        // In Node.js >= 14, gulp throws a "premature close" error with the test task below if the
        // failAfterError stream is created without the option "autoDestroy" set to false.
        // It seems the case that some outdated libraries used by gulp and related packages do not
        // handle streams quite as intended by Node.js.
        // end-of-stream and readable-stream are such libraries.
        it
        (
            'does not emit a "premature close" error',
            done =>
            {
                const asyncDone = requireAs('gulp', 'async-done');

                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file._eslintInfo = { fix: true };
                file.eslint = { errorCount: 1 };
                const testTask =
                () =>
                {
                    const readableStream = gulpESLintNew.fix().end(file);
                    const failStream = readableStream.pipe(gulpESLintNew.failAfterError());
                    return failStream;
                };
                // A minimized version of task above:
                const testTaskMin = // eslint-disable-line no-unused-vars
                () =>
                {
                    const Readable = requireAs('ternary-stream', 'duplexify', 'readable-stream');

                    const readableStream = new Readable({ objectMode: true });
                    readableStream.push(file);
                    readableStream.push(null);
                    const failStream = readableStream.pipe(gulpESLintNew.failAfterError());
                    return failStream;
                };
                asyncDone
                (
                    testTask,
                    error =>
                    {
                        assert.equal(error.name, 'ESLintError');
                        assert.notEqual(error.message, 'premature close');
                        done();
                    },
                );
            },
        );
    },
);
