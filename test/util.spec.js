/* eslint-env mocha */

'use strict';

const util                                                      = require('#util');
const { createVinylDirectory, createVinylFile, finished, noop } = require('./test-util');
const { strict: assert }                                        = require('assert');
const { resolve }                                               = require('path');
const { satisfies }                                             = require('semver');
const { Writable }                                              = require('stream');

describe('utility functions', () => {

    describe('compareResultsByFilePath', () => {

        it('should return 1 if the first path goes after the second one', () => {
            assert.equal(
                util.compareResultsByFilePath(
                    { filePath: '/a/b/file.js' },
                    { filePath: '/a/b/FILE.js' }
                ),
                1
            );
        });

        it('should return -1 if the first path goes before the second one', () => {
            assert.equal(util.compareResultsByFilePath({ filePath: 'C:' }, { filePath: 'D:' }), -1);
        });

        it('should return 0 if both paths are equal', () => {
            assert.equal(util.compareResultsByFilePath({ filePath: '' }, { filePath: '' }), 0);
        });

    });

    describe('createIgnoreResult should create a warning', () => {

        function test(filePath, baseDir, expectedMessage) {
            const result = util.createIgnoreResult(filePath, baseDir);
            assert(result);
            assert.equal(result.filePath, filePath);
            assert.equal(result.errorCount, 0);
            assert.equal(result.warningCount, 1);
            assert.equal(result.fixableErrorCount, 0);
            assert.equal(result.fixableWarningCount, 0);
            assert.equal(result.fatalErrorCount, 0);
            assert(Array.isArray(result.messages));
            assert.deepEqual(
                result.messages,
                [{ fatal: false, severity: 1, message: expectedMessage }]
            );
        }

        it('for a hidden file', () => {
            test(
                resolve('.hidden.js'),
                process.cwd(),
                'File ignored by default. Use a negated ignore pattern (like '
                + '"!<relative/path/to/filename>") to override.'
            );
        });

        it('for a file in a hidden folder', () => {
            test(
                resolve('.hidden/file.js'),
                process.cwd(),
                'File ignored by default. Use a negated ignore pattern (like '
                + '"!<relative/path/to/filename>") to override.'
            );
        });

        it('for a file outside the base directory', () => {
            test(
                resolve('../file.js'),
                process.cwd(),
                'File ignored because of a matching ignore pattern. Set "ignore" option to false '
                + 'to override.'
            );
        });

        it('for a path that includes "node_modules"', () => {
            test(
                resolve('node_modules/test/index.js'),
                process.cwd(),
                'File ignored by default. Use a negated ignore pattern like "!node_modules/*" to '
                + 'override.'
            );
        });

        it('for a path that includes "node_modules" in the base directory', () => {
            test(
                resolve('node_modules/file.js'),
                resolve('node_modules'),
                'File ignored because of a matching ignore pattern. Set "ignore" option to false '
                + 'to override.'
            );
        });

        it('for a path with a part that starts with "node_modules"', () => {
            test(
                resolve('node_modules_bak/file.js'),
                process.cwd(),
                'File ignored because of a matching ignore pattern. Set "ignore" option to false '
                + 'to override.'
            );
        });

        it('for a file ignored by ".eslintignore"', () => {
            test(
                resolve('ignored.js'),
                process.cwd(),
                'File ignored because of a matching ignore pattern. Set "ignore" option to false '
                + 'to override.'
            );
        });

    });

    describe('createTransform', () => {

        it('should handle files in a stream', async () => {
            let actualFile;
            let finishCalled = false;
            const expectedFile = createVinylFile('invalid.js', 'x = 1;');
            await finished(
                util
                    .createTransform(
                        file => {
                            actualFile = file;
                        }
                    )
                    .on('data', file => {
                        assert.equal(file, expectedFile);
                        actualFile = file;
                    })
                    .on('finish', () => {
                        assert(actualFile);
                        finishCalled = true;
                    })
                    .end(expectedFile)
            );
            assert(finishCalled);
        });

        it('should flush when stream is ending', async () => {
            let count = 0;
            let finalCount = 0;
            let finishCalled = false;
            const files = [
                createVinylFile('invalid.js', 'x = 1;'),
                createVinylFile('undeclared.js', 'x = 0;')
            ];
            const testStream = util
                .createTransform(
                    file => {
                        assert(files.includes(file));
                        count += 1;
                    }, () => {
                        assert.equal(count, files.length);
                        assert.equal(testStream._writableState.ending, true);
                        finalCount = count;
                    }
                )
                .on('data', noop)
                .on('finish', () => {
                    assert.equal(finalCount, files.length);
                    finishCalled = true;
                });
            files.forEach(file => testStream.write(file));
            testStream.end();
            await finished(testStream);
            assert(finishCalled);
        });

        it('should catch errors in an asynchronous file handler', done => {
            util
                .createTransform(
                    () => new Promise((_, reject) => {
                        setImmediate(() => reject('foo'));
                    })
                )
                .on('error', err => {
                    assert(err.message, 'foo');
                    assert(err.plugin, 'gulp-eslint-new');
                    done();
                })
                .end(createVinylFile('file.js', ''));
        });

        it('should catch errors in an asynchronous flush handler', done => {
            util
                .createTransform(
                    noop,
                    () => new Promise((_, reject) => {
                        setImmediate(reject('foo'));
                    })
                )
                .on('error', err => {
                    assert(err.message, 'foo');
                    assert(err.plugin, 'gulp-eslint-new');
                    done();
                })
                .end(createVinylFile('file.js', ''));
        });

    });

    describe('filterResult', () => {

        const result = {
            messages: [{
                ruleId: 'error',
                message: 'This is an error.',
                severity: 2
            }, {
                ruleId: 'warning',
                message: 'This is a warning.',
                severity: 1
            }, {
                ruleId: 'fixable error',
                message: 'This is a fixable error.',
                severity: 2,
                fix: { }
            }, {
                ruleId: 'fixable warning',
                message: 'This is a fixable warning.',
                severity: 1,
                fix: { }
            }, {
                ruleId: 'fatal error',
                message: 'This is a fatal error.',
                fatal: true,
                severity: 2
            }],
            errorCount: 3,
            warningCount: 2,
            fatalErrorCount: 1,
            foobar: 42
        };

        it('should remove error messages', () => {
            const quietResult = util.filterResult(result, util.isWarningMessage);
            assert(Array.isArray(quietResult.messages));
            assert.equal(quietResult.messages.length, 2);
            assert.equal(quietResult.errorCount, 0);
            assert.equal(quietResult.warningCount, 2);
            assert.equal(quietResult.fixableErrorCount, 0);
            assert.equal(quietResult.fixableWarningCount, 1);
            assert.equal(quietResult.fatalErrorCount, 0);
            assert.equal(quietResult.foobar, 42);
        });

        it('should remove warning messages', () => {
            const quietResult = util.filterResult(result, util.isErrorMessage);
            assert(Array.isArray(quietResult.messages));
            assert.equal(quietResult.messages.length, 3);
            assert.equal(quietResult.errorCount, 3);
            assert.equal(quietResult.warningCount, 0);
            assert.equal(quietResult.fixableErrorCount, 1);
            assert.equal(quietResult.fixableWarningCount, 0);
            assert.equal(quietResult.fatalErrorCount, 1);
            assert.equal(quietResult.foobar, 42);
        });

    });

    describe('fix', () => {

        it('should fix only a fixed file', done => {
            let actualDestArg;
            const actualFiles = [];
            const testStream = util.fix(destArg => {
                actualDestArg = destArg;
                return util.createTransform(file => {
                    actualFiles.push(file);
                });
            });
            const base = 'foobar';
            assert.equal(actualDestArg({ base }), base);
            const unfixedFile = createVinylFile('unfixed', 'unfixed');
            unfixedFile.eslint = { };
            const fixedFile = createVinylFile('fixed', 'fixed');
            fixedFile.eslint = { fixed: true };
            const ignoredFile = createVinylFile('ignored', 'ignored');
            const directory = createVinylDirectory();
            testStream.on('finish', () => {
                assert.deepEqual(actualFiles, [fixedFile]);
                done();
            });
            testStream.write(unfixedFile);
            testStream.write(fixedFile);
            testStream.write(ignoredFile);
            testStream.write(directory);
            testStream.end();
        });

    });

    describe('migrateOptions', () => {

        it('should migrate a string config value to "overrideConfigFile"', () => {
            const { eslintOptions } = util.migrateOptions('Config/Path');
            assert.deepEqual(eslintOptions, { overrideConfigFile: 'Config/Path' });
        });

        it('should migrate "configFile" to "overrideConfigFile"', () => {
            const { eslintOptions } = util.migrateOptions({ configFile: 'Config/Path' });
            assert.deepEqual(
                eslintOptions,
                { overrideConfig: { }, overrideConfigFile: 'Config/Path' }
            );
        });

        it('should migrate an "envs" array to an "env" object', () => {
            const { eslintOptions }
            = util.migrateOptions({ envs: ['foo:true', 'bar:false', 'baz'] });
            assert.deepEqual(
                eslintOptions,
                { overrideConfig: { env: { foo: true, bar: false, baz: true } } }
            );
        });

        it('should migrate "extends"', () => {
            const { eslintOptions } = util.migrateOptions({ extends: 'foo' });
            assert.deepEqual(eslintOptions, { overrideConfig: { extends: 'foo' } });
        });

        it('should migrate a "globals" array to an object', () => {
            const { eslintOptions }
            = util.migrateOptions({ globals: ['foo:true', 'bar:false', 'baz'] });
            assert.deepEqual(
                eslintOptions,
                { overrideConfig: { globals: { foo: true, bar: false, baz: false } } }
            );
        });

        it('should migrate "ignorePattern" to "ignorePatterns"', () => {
            const ignorePatterns = ['foo', 'bar', 'baz'];
            const { eslintOptions } = util.migrateOptions({ ignorePattern: ignorePatterns });
            assert.deepEqual(eslintOptions, { overrideConfig: { ignorePatterns } });
        });

        it('should migrate "parser"', () => {
            const { eslintOptions } = util.migrateOptions({ parser: 'foo' });
            assert.deepEqual(eslintOptions, { overrideConfig: { parser: 'foo' } });
        });

        it('should migrate "parserOptions"', () => {
            const { eslintOptions } = util.migrateOptions({ parserOptions: 'foo' });
            assert.deepEqual(eslintOptions, { overrideConfig: { parserOptions: 'foo' } });
        });

        it('should migrate a "plugins" arrays', () => {
            const { eslintOptions } = util.migrateOptions({ plugins: ['foo', 'bar'] });
            assert.deepEqual(eslintOptions, { overrideConfig: { plugins: ['foo', 'bar'] } });
        });

        it('should not migrate a "plugins" object', () => {
            const { eslintOptions } = util.migrateOptions({ plugins: { foo: 'bar' } });
            assert.deepEqual(eslintOptions, { overrideConfig: { }, plugins: { foo: 'bar' } });
        });

        it('should migrate "rules"', () => {
            const { eslintOptions } = util.migrateOptions({ rules: 'foo' });
            assert.deepEqual(eslintOptions, { overrideConfig: { rules: 'foo' } });
        });

        it('should treat "warnFileIgnored" as a synonym for "warnIgnored"', () => {
            const { warnIgnored } = util.migrateOptions({ warnFileIgnored: true });
            assert.equal(warnIgnored, true);
        });

        it('should suppress undefined legacy options', () => {
            const { eslintOptions } = util.migrateOptions({
                configFile:     undefined,
                envs:           undefined,
                extends:        undefined,
                globals:        undefined,
                ignorePattern:  undefined,
                parser:         undefined,
                parserOptions:  undefined,
                rules:          undefined
            });
            assert.deepEqual(eslintOptions, { overrideConfig: { } });
        });

        it('should return a default value for ESLint', () => {
            const { ESLint } = util.migrateOptions();
            assert.equal(typeof ESLint, 'function');
        });

        it('should return a custom value for ESLint', () => {
            const expected = { };
            const { ESLint: actual } = util.migrateOptions({ [util.ESLintKey]: expected });
            assert.equal(actual, expected);
        });

        it('should fail if a forbidden option is specified', () => {
            const options = {
                cache:                   true,
                cacheFile:               '\0',
                cacheLocation:           '\0',
                cacheStrategy:           'metadata',
                errorOnUnmatchedPattern: true,
                extensions:              [],
                globInputPaths:          false
            };
            assert.throws(
                () => util.migrateOptions(options),
                ({ code, message }) =>
                    code === 'ESLINT_INVALID_OPTIONS'
                    && message.includes(Object.keys(options).join(', '))
            );
        });

        it('should fail if "overrideConfig" is not an object or null', () => {
            assert.throws(
                () => util.migrateOptions({ overrideConfig: 'foo' }),
                ({ code, message }) =>
                    code === 'ESLINT_INVALID_OPTIONS' && /\boverrideConfig\b/.test(message)
            );
        });

        it('should fail if "envs" is not an array or falsy', () => {
            assert.throws(
                () => util.migrateOptions({ envs: 'foo' }),
                ({ code, message }) =>
                    code === 'ESLINT_INVALID_OPTIONS' && /\benvs\b/.test(message)
            );
        });

        it('should fail if "globals" is not an array or falsy', () => {
            assert.throws(
                () => util.migrateOptions({ globals: { } }),
                ({ code, message }) =>
                    code === 'ESLINT_INVALID_OPTIONS' && /\bglobals\b/.test(message)

            );
        });

        it('should not modify an existing overrideConfig', () => {
            const options = { overrideConfig: { }, parser: 'foo' };
            util.migrateOptions(options);
            assert.deepEqual(options.overrideConfig, { });
        });

    });

    describe('resolveFormatter', () => {

        function testResolveFormatter(ESLint) {

            const testResults = [
                {
                    filePath: 'foo',
                    messages: [{ column: 99, line: 42, message: 'bar' }],
                    suppressedMessages: [],
                    errorCount: 1,
                    warningCount: 0
                }
            ];

            it('should default to the "stylish" formatter', async () => {
                const eslintInfo = { eslint: new ESLint() };
                const formatter = await util.resolveFormatter(eslintInfo);
                const text = await formatter.format(testResults);
                assert.equal(
                    text.replace(/\x1b\[\d+m/g, ''), // eslint-disable-line no-control-regex
                    '\nfoo\n  42:99  warning  bar\n\n✖ 1 problem (1 error, 0 warnings)\n'
                );
            });

            it('should resolve a predefined formatter', async () => {
                const eslintInfo = { eslint: new ESLint() };
                const formatter = await util.resolveFormatter(eslintInfo, 'compact');
                const text = await formatter.format(testResults);
                assert.equal(
                    text.replace(/\x1b\[\d+m/g, ''), // eslint-disable-line no-control-regex
                    'foo: line 42, col 99, Warning - bar\n\n1 problem'
                );
            });

            it('should resolve a custom formatter', async () => {
                const eslintInfo = { eslint: new ESLint({ cwd: __dirname }) };
                const formatter = await util.resolveFormatter(eslintInfo, './custom-formatter');
                await formatter.format(testResults);
                const { args } = require('./custom-formatter');
                assert.equal(args[0], testResults);
                if (satisfies(ESLint.version, '>=8.4')) {
                    assert.equal(args[1].cwd, __dirname);
                }
                assert(args[1].rulesMeta);
            });

            it('should resolve a specified formatter object', async () => {
                const eslint = new ESLint();
                const eslintInfo = { cwd: process.cwd(), eslint };
                const formatter = await eslint.loadFormatter();
                const resolved = await util.resolveFormatter(eslintInfo, formatter);
                assert.equal(resolved, formatter);
            });

            it('should wrap a formatter function in an object', async () => {
                const eslintInfo = { cwd: 'TEST CWD', eslint: new ESLint() };
                const format = (actualResults, data) => {
                    assert.equal(actualResults, testResults);
                    assert(data.rulesMeta);
                    assert.equal(data.cwd, 'TEST CWD');
                    return 'foo';
                };
                const formatter = await util.resolveFormatter(eslintInfo, format);
                const text = await formatter.format(testResults);
                assert.equal(text, 'foo');
            });

            it('should throw an error if a formatter cannot be resolved', async () => {
                const eslintInfo = { eslint: new ESLint() };
                await assert.rejects(
                    () => util.resolveFormatter(eslintInfo, 'missing-formatter'),
                    /\bThere was a problem loading formatter\b/
                );
            });

        }

        describe('with ESLint 8.0', () => {
            const { ESLint } = require('eslint-8.0');
            testResolveFormatter(ESLint);
        });

        describe('with ESLint 8.x', () => {
            const { ESLint } = require('eslint-8.x');
            testResolveFormatter(ESLint);
        });

    });

    describe('resolveWriter', () => {

        it('should default to fancyLog', () => {
            const write = util.resolveWriter();
            assert.equal(write, require('fancy-log'));
        });

        it('should write to a writable stream', done => {
            let written = false;
            const writable = new Writable({ objectMode: true });
            const testValue = 'Formatted Output';
            const writer = util.resolveWriter(writable);
            writable._write = (chunk, encoding, cb) => {
                assert(chunk);
                assert.equal(chunk, testValue);
                written = true;
                cb();
            };
            writable
                .on('error', done)
                .on('finish', () => {
                    assert.equal(written, true);
                    done();
                });
            writer(testValue);
            writable.end();
        });

    });

    describe('writeResults', () => {

        const testResults = [];

        it('should pass the value returned from the formatter to the writer', async () => {
            let writeCount = 0;
            const formattedText = 'something happened';
            const formatterObj = {
                format(results) {
                    assert.equal(this, formatterObj);
                    assert(results);
                    assert.equal(results, testResults);
                    return formattedText;
                }
            };
            await util.writeResults(
                testResults,
                formatterObj,
                value => {
                    assert(value);
                    assert.equal(value, formattedText);
                    ++writeCount;
                }
            );
            assert.equal(writeCount, 1);
        });

        it('should not write an empty formatted text', async () => {
            const formatterObj = {
                format(results) {
                    assert.equal(this, formatterObj);
                    assert(results);
                    assert.equal(results, testResults);
                    return '';
                }
            };
            await
            util.writeResults(testResults, formatterObj, () => assert.fail('Unexpected call'));
        });

        it('should not write an undefined value', async () => {
            const formatterObj = {
                format(results) {
                    assert(results);
                    assert.equal(results, testResults);
                }
            };
            await
            util.writeResults(testResults, formatterObj, () => assert.fail('Unexpected call'));
        });

    });

});
