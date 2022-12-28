/* eslint-env mocha */

'use strict';

const util                                  = require('#util');
const { createVinylFile, finished, noop }   = require('./test-util');
const { strict: assert }                    = require('assert');
// eslint-disable-next-line n/no-deprecated-api
const { Domain }                            = require('domain');
const { resolve }                           = require('path');
const { satisfies }                         = require('semver');
const { Writable }                          = require('stream');

describe
(
    'utility functions',
    () =>
    {
        describe
        (
            'compareResultsByFilePath',
            () =>
            {
                it
                (
                    'should return 1 if the first path goes after the second one',
                    () =>
                    {
                        assert.equal
                        (
                            util.compareResultsByFilePath
                            (
                                { filePath: '/a/b/file.js' },
                                { filePath: '/a/b/FILE.js' },
                            ),
                            1,
                        );
                    },
                );

                it
                (
                    'should return -1 if the first path goes before the second one',
                    () =>
                    {
                        assert.equal
                        (util.compareResultsByFilePath({ filePath: 'C:' }, { filePath: 'D:' }), -1);
                    },
                );

                it
                (
                    'should return 0 if both paths are equal',
                    () =>
                    {
                        assert.equal
                        (util.compareResultsByFilePath({ filePath: '' }, { filePath: '' }), 0);
                    },
                );
            },
        );

        describe
        (
            'createIgnoreResult',
            () =>
            {
                describe
                (
                    'should create a warning',
                    () =>
                    {
                        function test(filePath, baseDir, expectedMessage)
                        {
                            const result = util.createIgnoreResult(filePath, baseDir, '8.0.0');
                            assert(result);
                            assert.equal(result.filePath, filePath);
                            assert.equal(result.errorCount, 0);
                            assert.equal(result.warningCount, 1);
                            assert.equal(result.fixableErrorCount, 0);
                            assert.equal(result.fixableWarningCount, 0);
                            assert.equal(result.fatalErrorCount, 0);
                            assert(Array.isArray(result.messages));
                            assert.deepEqual
                            (
                                result.messages,
                                [{ fatal: false, severity: 1, message: expectedMessage }],
                            );
                        }

                        it
                        (
                            'for a hidden file',
                            () =>
                            {
                                test
                                (
                                    resolve('.hidden.js'),
                                    process.cwd(),
                                    'File ignored by default. Use a negated ignore pattern (like ' +
                                    '"!<relative/path/to/filename>") to override.',
                                );
                            },
                        );

                        it
                        (
                            'for a file in a hidden folder',
                            () =>
                            {
                                test
                                (
                                    resolve('.hidden/file.js'),
                                    process.cwd(),
                                    'File ignored by default. Use a negated ignore pattern (like ' +
                                    '"!<relative/path/to/filename>") to override.',
                                );
                            },
                        );

                        it
                        (
                            'for a file outside the base directory',
                            () =>
                            {
                                test
                                (
                                    resolve('../file.js'),
                                    process.cwd(),
                                    'File ignored because of a matching ignore pattern. Set ' +
                                    '"ignore" option to false to override.',
                                );
                            },
                        );

                        it
                        (
                            'for a path that includes "node_modules"',
                            () =>
                            {
                                test
                                (
                                    resolve('node_modules/test/index.js'),
                                    process.cwd(),
                                    'File ignored by default. Use a negated ignore pattern like ' +
                                    '"!node_modules/*" to override.',
                                );
                            },
                        );

                        it
                        (
                            'for a path that includes "node_modules" in the base directory',
                            () =>
                            {
                                test
                                (
                                    resolve('node_modules/file.js'),
                                    resolve('node_modules'),
                                    'File ignored because of a matching ignore pattern. Set ' +
                                    '"ignore" option to false to override.',
                                );
                            },
                        );

                        it
                        (
                            'for a path with a part that starts with "node_modules"',
                            () =>
                            {
                                test
                                (
                                    resolve('node_modules_bak/file.js'),
                                    process.cwd(),
                                    'File ignored because of a matching ignore pattern. Set ' +
                                    '"ignore" option to false to override.',
                                );
                            },
                        );

                        it
                        (
                            'for a file ignored by ".eslintignore"',
                            () =>
                            {
                                test
                                (
                                    resolve('ignored.js'),
                                    process.cwd(),
                                    'File ignored because of a matching ignore pattern. Set ' +
                                    '"ignore" option to false to override.',
                                );
                            },
                        );
                    },
                );

                it
                (
                    'should include suppressedMessages in the result',
                    () =>
                    {
                        const result =
                        util.createIgnoreResult('.hidden.js', process.cwd(), '8.8.0');
                        assert('suppressedMessages' in result);
                    },
                );

                it
                (
                    'should not include suppressedMessages in the result',
                    () =>
                    {
                        const result =
                        util.createIgnoreResult('.hidden.js', process.cwd(), '8.7.0');
                        assert(!('suppressedMessages' in result));
                    },
                );
            },
        );

        describe
        (
            'createPluginError',
            () =>
            {
                it
                (
                    'should provide a consistent string representation',
                    done =>
                    {
                        const pluginError = util.createPluginError({ message: 'FOOBAR' });
                        const stream = new Writable({ final: done => done(pluginError) }).end();
                        const domain = new Domain();
                        const expected =
                        '\x1b[31mError\x1b[39m in plugin "\x1b[36mgulp-eslint-new\x1b[39m"\n' +
                        'Message:\n' +
                        '    FOOBAR';
                        domain.on
                        (
                            'error',
                            error =>
                            {
                                assert.equal(error.domainEmitter, stream);
                                const actual = String(error);
                                assert.equal(actual, expected);
                                done();
                            },
                        )
                        .add(stream);
                    },
                );
            },
        );

        describe
        (
            'createTransform',
            () =>
            {
                it
                (
                    'should handle files in a stream',
                    async () =>
                    {
                        let actualFile;
                        let finishCalled = false;
                        const expectedFile = createVinylFile('invalid.js', 'x = 1;');
                        await finished
                        (
                            util
                            .createTransform
                            (
                                file =>
                                {
                                    actualFile = file;
                                },
                            )
                            .on
                            (
                                'data',
                                file =>
                                {
                                    assert.equal(file, expectedFile);
                                    actualFile = file;
                                },
                            )
                            .on
                            (
                                'finish',
                                () =>
                                {
                                    assert(actualFile);
                                    finishCalled = true;
                                },
                            )
                            .end(expectedFile),
                        );
                        assert(finishCalled);
                    },
                );

                it
                (
                    'should flush when stream is ending',
                    async () =>
                    {
                        let count = 0;
                        let finalCount = 0;
                        let finishCalled = false;
                        const files =
                        [
                            createVinylFile('invalid.js', 'x = 1;'),
                            createVinylFile('undeclared.js', 'x = 0;'),
                        ];
                        const testStream =
                        util
                        .createTransform
                        (
                            file =>
                            {
                                assert(files.includes(file));
                                count += 1;
                            },
                            () =>
                            {
                                assert.equal(count, files.length);
                                finalCount = count;
                            },
                        )
                        .resume()
                        .on
                        (
                            'finish',
                            () =>
                            {
                                assert.equal(finalCount, files.length);
                                finishCalled = true;
                            },
                        );
                        files.forEach(file => testStream.write(file));
                        testStream.end();
                        await finished(testStream);
                        assert(finishCalled);
                    },
                );

                it
                (
                    'should catch errors in an asynchronous file handler',
                    done =>
                    {
                        util
                        .createTransform
                        (
                            () => new Promise
                            (
                                (_, reject) =>
                                {
                                    setImmediate(() => reject('foo'));
                                },
                            ),
                        )
                        .on
                        (
                            'error',
                            error =>
                            {
                                assert(error.message, 'foo');
                                assert(error.plugin, 'gulp-eslint-new');
                                done();
                            },
                        )
                        .end(createVinylFile('file.js', ''));
                    },
                );

                it
                (
                    'should catch errors in an asynchronous flush handler',
                    done =>
                    {
                        util
                        .createTransform
                        (
                            noop,
                            () => new Promise
                            (
                                (_, reject) =>
                                {
                                    setImmediate(() => reject('foo'));
                                },
                            ),
                        )
                        .on
                        (
                            'error',
                            error =>
                            {
                                assert(error.message, 'foo');
                                assert(error.plugin, 'gulp-eslint-new');
                                done();
                            },
                        )
                        .end(createVinylFile('file.js', ''));
                    },
                );
            },
        );

        describe
        (
            'filterResult',
            () =>
            {
                const result =
                {
                    messages:
                    [
                        {
                            ruleId:     'error',
                            message:    'This is an error.',
                            severity:   2,
                        },
                        {
                            ruleId:     'warning',
                            message:    'This is a warning.',
                            severity:   1,
                        },
                        {
                            ruleId:     'fixable error',
                            message:    'This is a fixable error.',
                            severity:   2,
                            fix:        { },
                        },
                        {
                            ruleId:     'fixable warning',
                            message:    'This is a fixable warning.',
                            severity:   1,
                            fix:        { },
                        },
                        {
                            ruleId:     'fatal error',
                            message:    'This is a fatal error.',
                            fatal:      true,
                            severity:   2,
                        },
                    ],
                    errorCount:         3,
                    warningCount:       2,
                    fatalErrorCount:    1,
                    foobar:             42,
                };

                it
                (
                    'should remove error messages',
                    () =>
                    {
                        const quietResult = util.filterResult(result, util.isWarningMessage);
                        assert(Array.isArray(quietResult.messages));
                        assert.equal(quietResult.messages.length, 2);
                        assert.equal(quietResult.errorCount, 0);
                        assert.equal(quietResult.warningCount, 2);
                        assert.equal(quietResult.fixableErrorCount, 0);
                        assert.equal(quietResult.fixableWarningCount, 1);
                        assert.equal(quietResult.fatalErrorCount, 0);
                        assert.equal(quietResult.foobar, 42);
                    },
                );

                it
                (
                    'should remove warning messages',
                    () =>
                    {
                        const quietResult = util.filterResult(result, util.isErrorMessage);
                        assert(Array.isArray(quietResult.messages));
                        assert.equal(quietResult.messages.length, 3);
                        assert.equal(quietResult.errorCount, 3);
                        assert.equal(quietResult.warningCount, 0);
                        assert.equal(quietResult.fixableErrorCount, 1);
                        assert.equal(quietResult.fixableWarningCount, 0);
                        assert.equal(quietResult.fatalErrorCount, 1);
                        assert.equal(quietResult.foobar, 42);
                    },
                );
            },
        );

        describe
        (
            'resolveFormatter',
            () =>
            {
                function testResolveFormatter(ESLint)
                {
                    const useEslintrcConfig = ESLint.name === 'ESLint';

                    const testResults =
                    [
                        {
                            filePath:               'foo',
                            messages:               [{ column: 99, line: 42, message: 'bar' }],
                            suppressedMessages:     [],
                            errorCount:             1,
                            warningCount:           0,
                            fixableErrorCount:      1,
                            fixableWarningCount:    0,
                            fatalErrorCount:        0,
                        },
                    ];

                    it
                    (
                        'should default to the modified "stylish" formatter',
                        async () =>
                        {
                            const eslintInfo = { eslint: new ESLint() };
                            const formatter = await util.resolveFormatter(eslintInfo);
                            const text = await formatter.format(testResults);
                            const cleanText = text.replace(/\x1b\[\d+m/g, '');
                            const { version } = require('gulp-eslint-new/package.json');
                            const url =
                            `https://www.npmjs.com/package/gulp-eslint-new/v/${version}#autofix`;
                            assert.equal
                            (
                                cleanText,
                                '\nfoo\n  42:99  warning  bar\n\n' +
                                '✖ 1 problem (1 error, 0 warnings)\n' +
                                `  1 error and 0 warnings potentially fixable - see ${url}\n`,
                            );
                        },
                    );

                    it
                    (
                        'should resolve a predefined formatter',
                        async () =>
                        {
                            const eslintInfo = { eslint: new ESLint() };
                            const formatter = await util.resolveFormatter(eslintInfo, 'compact');
                            const text = await formatter.format(testResults);
                            assert.equal
                            (
                                text.replace(/\x1b\[\d+m/g, ''),
                                'foo: line 42, col 99, Warning - bar\n\n1 problem',
                            );
                        },
                    );

                    it
                    (
                        'should resolve a custom formatter by path',
                        async () =>
                        {
                            const options =
                            useEslintrcConfig ?
                            {
                                cwd:                __dirname,
                                overrideConfig:     { rules: { 'no-undef': 'warn' } },
                                useEslintrc:        false,
                            } :
                            {
                                cwd:                __dirname,
                                overrideConfig:     { rules: { 'no-undef': 'warn' } },
                                overrideConfigFile: true,
                            };
                            const eslint = new ESLint(options);
                            const filePath = 'file.js';
                            const expectedResults = await eslint.lintText('ok', { filePath });
                            const eslintInfo = { eslint };
                            const formatter =
                            await
                            util.resolveFormatter(eslintInfo, './formatter/custom-formatter.js');
                            const json = await formatter.format(expectedResults);
                            const { results: actualResults, context } = JSON.parse(json);
                            assert.deepEqual(actualResults, expectedResults);
                            if (satisfies(ESLint.version, useEslintrcConfig ? '>=8.4' : '>=8.23'))
                                assert.deepEqual(context.cwd, __dirname);
                        },
                    );

                    it
                    (
                        'should resolve a custom formatter by package name',
                        async () =>
                        {
                            const options =
                            useEslintrcConfig ?
                            {
                                cwd:                __dirname,
                                overrideConfig:     { rules: { 'no-undef': 'warn' } },
                                useEslintrc:        false,
                            } :
                            {
                                cwd:                __dirname,
                                overrideConfig:     { rules: { 'no-undef': 'warn' } },
                                overrideConfigFile: true,
                            };
                            const eslint = new ESLint(options);
                            const filePath = 'file.js';
                            const expectedResults = await eslint.lintText('ok', { filePath });
                            const eslintInfo = { eslint };
                            const formatter =
                            await util.resolveFormatter(eslintInfo, '~formatter');
                            const json = await formatter.format(expectedResults);
                            const { results: actualResults, context } = JSON.parse(json);
                            assert.deepEqual(actualResults, expectedResults);
                            if (satisfies(ESLint.version, useEslintrcConfig ? '>=8.4' : '>=8.23'))
                                assert.deepEqual(context.cwd, __dirname);
                        },
                    );

                    it
                    (
                        'should resolve an async custom formatter',
                        async () =>
                        {
                            const options =
                            useEslintrcConfig ?
                            {
                                cwd:            __dirname,
                                overrideConfig: { rules: { 'no-undef': 'warn' } },
                                useEslintrc:    false,
                            } :
                            {
                                cwd:                __dirname,
                                overrideConfig:     { rules: { 'no-undef': 'warn' } },
                                overrideConfigFile: true,
                            };
                            const eslint = new ESLint(options);
                            const filePath = 'file.js';
                            const expectedResults = await eslint.lintText('ok', { filePath });
                            const eslintInfo = { eslint };
                            const formatter =
                            await
                            util.resolveFormatter(eslintInfo, './formatter/async-formatter.js');
                            const json = await formatter.format(expectedResults);
                            const [actualResults, context] = JSON.parse(json);
                            assert.deepEqual(actualResults, expectedResults);
                            if (satisfies(ESLint.version, useEslintrcConfig ? '>=8.4' : '>=8.23'))
                                assert.deepEqual(context.cwd, __dirname);
                        },
                    );

                    it
                    (
                        'should resolve a specified formatter object',
                        async () =>
                        {
                            const eslint = new ESLint();
                            const eslintInfo = { cwd: process.cwd(), eslint };
                            const formatter = await eslint.loadFormatter();
                            const resolved = await util.resolveFormatter(eslintInfo, formatter);
                            assert.equal(resolved, formatter);
                        },
                    );

                    it
                    (
                        'should wrap a formatter function in an object',
                        async () =>
                        {
                            const options =
                            useEslintrcConfig ?
                            {
                                overrideConfig: { rules: { 'no-undef': 'warn' } },
                                useEslintrc:    false,
                            } :
                            {
                                overrideConfig:     { rules: { 'no-undef': 'warn' } },
                                overrideConfigFile: true,
                            };
                            const eslint = new ESLint(options);
                            const eslintInfo = { cwd: 'TEST CWD', eslint };
                            const expectedResults = await eslint.lintText('ok');
                            const format =
                            (actualResults, data) =>
                            {
                                assert.equal(actualResults, expectedResults);
                                assert(data.rulesMeta);
                                assert.equal(data.cwd, 'TEST CWD');
                                return 'foo';
                            };
                            await eslint.lintText('syntax error');
                            const formatter = await util.resolveFormatter(eslintInfo, format);
                            const text = await formatter.format(expectedResults);
                            assert.equal(text, 'foo');
                        },
                    );

                    it
                    (
                        'should throw an error if a formatter cannot be resolved',
                        async () =>
                        {
                            const eslintInfo = { eslint: new ESLint() };
                            await assert.rejects
                            (
                                () => util.resolveFormatter(eslintInfo, '~missing-formatter'),
                                /\bThere was a problem loading formatter\b/,
                            );
                        },
                    );
                }

                describe
                (
                    'with ESLint 8.0',
                    () =>
                    {
                        const { ESLint } = require('eslint-8.0');
                        testResolveFormatter(ESLint);
                    },
                );

                describe
                (
                    'with ESLint 8.x',
                    () =>
                    {
                        const { ESLint } = require('eslint-8.x');
                        testResolveFormatter(ESLint);
                    },
                );

                describe
                (
                    'with FlatESLint 8.21',
                    () =>
                    {
                        const { FlatESLint } = require('eslint-8.21/use-at-your-own-risk');
                        testResolveFormatter(FlatESLint);
                    },
                );

                describe
                (
                    'with FlatESLint 8.x',
                    () =>
                    {
                        const { FlatESLint } = require('eslint-8.x/use-at-your-own-risk');
                        testResolveFormatter(FlatESLint);
                    },
                );
            },
        );

        describe
        (
            'resolveWriter',
            () =>
            {
                it
                (
                    'should default to fancyLog',
                    () =>
                    {
                        const write = util.resolveWriter();
                        assert.equal(write, require('fancy-log'));
                    },
                );

                it
                (
                    'should write to a writable stream',
                    done =>
                    {
                        let written = false;
                        const writable = new Writable({ objectMode: true });
                        const testValue = 'Formatted Output';
                        const writer = util.resolveWriter(writable);
                        writable._write =
                        (chunk, encoding, cb) =>
                        {
                            assert(chunk);
                            assert.equal(chunk, testValue);
                            written = true;
                            cb();
                        };
                        writable
                        .on('error', done)
                        .on
                        (
                            'finish',
                            () =>
                            {
                                assert.equal(written, true);
                                done();
                            },
                        );
                        writer(testValue);
                        writable.end();
                    },
                );
            },
        );

        describe
        (
            'writeResults',
            () =>
            {
                const testResults = [];

                it
                (
                    'should pass the value returned from the formatter to the writer',
                    async () =>
                    {
                        let writeCount = 0;
                        const formattedText = 'something happened';
                        const formatterObj =
                        {
                            format(results)
                            {
                                assert.equal(this, formatterObj);
                                assert(results);
                                assert.equal(results, testResults);
                                return formattedText;
                            },
                        };
                        await util.writeResults
                        (
                            testResults,
                            formatterObj,
                            value =>
                            {
                                assert(value);
                                assert.equal(value, formattedText);
                                ++writeCount;
                            },
                        );
                        assert.equal(writeCount, 1);
                    },
                );

                it
                (
                    'should not write an empty formatted text',
                    async () =>
                    {
                        const formatterObj =
                        {
                            format(results)
                            {
                                assert.equal(this, formatterObj);
                                assert(results);
                                assert.equal(results, testResults);
                                return '';
                            },
                        };
                        await
                        util.writeResults
                        (testResults, formatterObj, () => assert.fail('Unexpected call'));
                    },
                );

                it
                (
                    'should not write an undefined value',
                    async () =>
                    {
                        const formatterObj =
                        {
                            format(results)
                            {
                                assert(results);
                                assert.equal(results, testResults);
                            },
                        };
                        await
                        util.writeResults
                        (testResults, formatterObj, () => assert.fail('Unexpected call'));
                    },
                );
            },
        );
    },
);
