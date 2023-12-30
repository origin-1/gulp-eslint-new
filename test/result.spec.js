'use strict';

const { ESLINT_KEY }                                    = require('#util');
const { createVinylFile, finished, isEmptyArray, noop } = require('./test-util');
const { strict: assert }                                = require('assert');
const { promises: { realpath } }                        = require('fs');
const gulpESLintNew                                     = require('gulp-eslint-new');

describe
(
    'gulp-eslint-new result',
    () =>
    {
        describe
        (
            'should provide an ESLint result',
            () =>
            {
                function testResult(ESLint, done)
                {
                    let resultCount = 0;
                    const lintStream =
                    gulpESLintNew
                    (
                        {
                            [ESLINT_KEY]:   ESLint,
                            baseConfig:
                            {
                                rules:
                                {
                                    'camelcase':        1,              // not fixable
                                    'no-extra-parens':  1,              // fixable
                                    'no-undef':         2,              // not fixable
                                    'quotes':           [2, 'single'],  // fixable
                                },
                            },
                            useEslintrc:    false,
                        },
                    );
                    const testDataList =
                    [
                        {
                            path:                'invalid-1.js',
                            contents:            'x_1 = (""); x_2 = "";',
                            errorCount:          4,
                            warningCount:        3,
                            fixableErrorCount:   2,
                            fixableWarningCount: 1,
                            fatalErrorCount:     0,
                        },
                        {
                            path:                'invalid-2.js',
                            contents:            'x_1 = (""); x_2 = (0);',
                            errorCount:          3,
                            warningCount:        4,
                            fixableErrorCount:   1,
                            fixableWarningCount: 2,
                            fatalErrorCount:     0,
                        },
                        {
                            path:                'invalid-3.js',
                            contents:            '#@?!',
                            errorCount:          1,
                            warningCount:        0,
                            fixableErrorCount:   0,
                            fixableWarningCount: 0,
                            fatalErrorCount:     1,
                        },
                    ];
                    lintStream
                    .pipe(gulpESLintNew.result(noop)) // Test that files are passed through.
                    .pipe
                    (
                        gulpESLintNew.result
                        (
                            result =>
                            {
                                const testData = testDataList[resultCount];
                                assert(result);
                                assert(Array.isArray(result.messages));
                                assert.equal
                                (
                                    result.messages.length,
                                    testData.errorCount + testData.warningCount,
                                );
                                assert.equal(result.errorCount, testData.errorCount);
                                assert.equal(result.warningCount, testData.warningCount);
                                assert.equal(result.fixableErrorCount, testData.fixableErrorCount);
                                assert.equal
                                (result.fixableWarningCount, testData.fixableWarningCount);
                                assert.equal(result.fatalErrorCount, testData.fatalErrorCount);
                                resultCount++;
                            },
                        ),
                    )
                    .on
                    (
                        'finish',
                        () =>
                        {
                            assert.equal(resultCount, 3);
                            done();
                        },
                    );
                    for (const { path, contents } of testDataList)
                        lintStream.write(createVinylFile(path, contents));
                    lintStream.end();
                }

                it
                (
                    'with ESLint 8.0',
                    done =>
                    {
                        const { ESLint } = require('eslint-8.0');
                        testResult(ESLint, done);
                    },
                );

                it
                (
                    'with ESLint 8.x',
                    done =>
                    {
                        const { ESLint } = require('eslint-8.x');
                        testResult(ESLint, done);
                    },
                );
            },
        );

        it
        (
            'should catch thrown errors',
            async () =>
            {
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                await assert.rejects
                (
                    finished
                    (
                        gulpESLintNew
                        .result
                        (
                            () =>
                            {
                                throw Error('Expected Error');
                            },
                        )
                        .end(file),
                    ),
                    { message: 'Expected Error', name: 'Error', plugin: 'gulp-eslint-new' },
                );
            },
        );

        it
        (
            'should catch thrown null',
            async () =>
            {
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                await assert.rejects
                (
                    finished
                    (
                        gulpESLintNew
                        .result
                        (
                            () =>
                            {
                                throw null;
                            },
                        )
                        .end(file),
                    ),
                    { message: 'Unknown Error', name: 'Error', plugin: 'gulp-eslint-new' },
                );
            },
        );

        it
        (
            'should throw an error if not provided a function argument',
            () =>
            {
                assert.throws
                (
                    gulpESLintNew.result,
                    { constructor: TypeError, message: 'Argument is not a function' },
                );
            },
        );

        it
        (
            'should ignore files without an ESLint result',
            done =>
            {
                gulpESLintNew
                .result
                (
                    () =>
                    {
                        assert.fail('Expected no call');
                    },
                )
                .on('error', done)
                .on('finish', done)
                .end(createVinylFile('invalid.js', '#invalid!syntax}'));
            },
        );

        it
        (
            'should support a Node-style callback-based handler',
            async () =>
            {
                let result;
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                await finished
                (
                    gulpESLintNew
                    .result
                    (
                        (actualResult, callback) =>
                        {
                            setImmediate
                            (
                                () =>
                                {
                                    result = actualResult;
                                    callback();
                                },
                            );
                        },
                    )
                    .resume()
                    .on('end', () => assert(result))
                    .end(file),
                );
                assert.equal(result, file.eslint);
            },
        );

        it
        (
            'should support a promise-based handler',
            async () =>
            {
                let cwd;
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { cwd: process.cwd() };
                await finished
                (
                    gulpESLintNew
                    .result
                    (
                        async result =>
                        {
                            cwd = await realpath(result.cwd);
                        },
                    )
                    .resume()
                    .on('end', () => assert(cwd))
                    .end(file),
                );
                assert.equal(cwd, file.cwd);
            },
        );
    },
);

describe
(
    'gulp-eslint-new results',
    () =>
    {
        describe
        (
            'should provide ESLint results',
            () =>
            {
                function testResults(ESLint, done)
                {
                    let actualResults;
                    const lintStream =
                    gulpESLintNew
                    (
                        {
                            [ESLINT_KEY]:   ESLint,
                            baseConfig:
                            {
                                rules:
                                {
                                    'camelcase':        1,              // not fixable
                                    'no-extra-parens':  1,              // fixable
                                    'no-undef':         2,              // not fixable
                                    'quotes':           [2, 'single'],  // fixable
                                },
                            },
                            useEslintrc:    false,
                            warnIgnored:    true,
                        },
                    );
                    lintStream
                    .pipe
                    (
                        gulpESLintNew.results
                        (
                            results =>
                            {
                                assert(Array.isArray(results));
                                assert.equal(results.length, 4);
                                assert.equal(results.errorCount, 5);
                                assert.equal(results.warningCount, 4);
                                assert.equal(results.fixableErrorCount, 3);
                                assert.equal(results.fixableWarningCount, 2);
                                assert.equal(results.fatalErrorCount, 1);
                                actualResults = results;
                            },
                        ),
                    )
                    .pipe
                    (
                        gulpESLintNew.results
                        (
                            results =>
                            {
                                assert.deepEqual(results, actualResults);
                            },
                        ),
                    )
                    .on
                    (
                        'finish',
                        () =>
                        {
                            assert(actualResults);
                            done();
                        },
                    );
                    lintStream.write(createVinylFile('invalid-1.js', '#@?!'));
                    lintStream.write(createVinylFile('invalid-2.js', 'x_1 = ("" + "");'));
                    lintStream.write(createVinylFile('invalid-3.js', 'var x = ("");'));
                    lintStream.write(createVinylFile('node_modules/file.js', ''));
                    lintStream.end();
                }

                it
                (
                    'with ESLint 8.0',
                    done =>
                    {
                        const { ESLint } = require('eslint-8.0');
                        testResults(ESLint, done);
                    },
                );

                it
                (
                    'with ESLint 8.x',
                    done =>
                    {
                        const { ESLint } = require('eslint-8.x');
                        testResults(ESLint, done);
                    },
                );
            },
        );

        it
        (
            'should catch thrown errors',
            async () =>
            {
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                await assert.rejects
                (
                    finished
                    (
                        gulpESLintNew
                        .results
                        (
                            () =>
                            {
                                throw Error('Expected Error');
                            },
                        )
                        .end(file),
                    ),
                    { message: 'Expected Error', name: 'Error', plugin: 'gulp-eslint-new' },
                );
            },
        );

        it
        (
            'should catch thrown null',
            async () =>
            {
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                await assert.rejects
                (
                    finished
                    (
                        gulpESLintNew
                        .results
                        (
                            () =>
                            {
                                throw null;
                            },
                        )
                        .end(file),
                    ),
                    { message: 'Unknown Error', name: 'Error', plugin: 'gulp-eslint-new' },
                );
            },
        );

        it
        (
            'should throw an error if not provided a function argument',
            () =>
            {
                assert.throws
                (
                    gulpESLintNew.results,
                    { constructor: TypeError, message: 'Argument is not a function' },
                );
            },
        );

        it
        (
            'should ignore files without an ESLint result',
            async () =>
            {
                let results;
                await finished
                (
                    gulpESLintNew
                    .results
                    (
                        actualResults =>
                        {
                            results = actualResults;
                        },
                    )
                    .resume()
                    .end(createVinylFile('invalid.js', '#invalid!syntax}')),
                );
                assert(isEmptyArray(results));
            },
        );

        it
        (
            'should support a Node-style callback-based handler',
            async () =>
            {
                let results;
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                await finished
                (
                    gulpESLintNew
                    .results
                    (
                        (actualResults, callback) =>
                        {
                            setImmediate
                            (
                                () =>
                                {
                                    results = actualResults;
                                    callback();
                                },
                            );
                        },
                    )
                    .resume()
                    .on('end', () => assert(results))
                    .end(file),
                );
                assert(Array.isArray(results));
                assert.equal(results.length, 1);
                assert.equal(results[0], file.eslint);
            },
        );

        it
        (
            'should support a promise-based handler',
            async () =>
            {
                let cwd;
                const file = createVinylFile('invalid.js', '#invalid!syntax}');
                file.eslint = { };
                await finished
                (
                    gulpESLintNew
                    .results
                    (
                        async () =>
                        {
                            cwd = await realpath(process.cwd());
                        },
                    )
                    .resume()
                    .on('end', () => assert(cwd))
                    .end(file),
                );
                assert.equal(cwd, process.cwd());
            },
        );
    },
);
