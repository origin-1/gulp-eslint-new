/* eslint-env mocha */

'use strict';

const { ESLintKey }                                             = require('#util');
const { createVinylDirectory, createVinylFile, finished, noop } = require('./test-util');
const { strict: assert }                                        = require('assert');
const gulpESLintNew                                             = require('gulp-eslint-new');
const { join, resolve }                                         = require('path');
const { satisfies }                                             = require('semver');
const { Readable }                                              = require('stream');
const File                                                      = require('vinyl');

describe('gulp-eslint-new plugin', () => {

    function testLinting(ESLint) {

        it('should configure an alternate parser', async () => {
            require('@typescript-eslint/parser').clearCaches();
            const file = createVinylFile('file.ts', 'function fn(): void { }');
            await finished(
                gulpESLintNew(
                    {
                        [ESLintKey]: ESLint,
                        parser: '@typescript-eslint/parser',
                        rules: { 'eol-last': 'error' },
                        useEslintrc: false
                    }
                )
                    .on('data', noop)
                    .on('end', () => {
                        for (const key of Object.keys(require('tslib'))) {
                            delete global[key];
                        }
                    })
                    .end(file)
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.equal(file.eslint.messages.length, 1);
            const [message] = file.eslint.messages;
            assert.equal(typeof message.message, 'string');
            assert.equal(typeof message.line, 'number');
            assert.equal(typeof message.column, 'number');
            assert.equal(message.ruleId, 'eol-last');
            assert.equal(message.severity, 2);
        });

        it('should produce an expected result', async () => {
            const file = createVinylFile('use-strict.js', 'var x = 1;');
            await finished(
                gulpESLintNew(
                    {
                        [ESLintKey]: ESLint,
                        rules: { strict: [2, 'global'], 'valid-jsdoc': 1 },
                        useEslintrc: false
                    }
                )
                    .on('data', noop)
                    .end(file)
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.equal(file.eslint.messages.length, 1);
            const [message] = file.eslint.messages;
            assert.equal(typeof message.message, 'string');
            assert.equal(typeof message.line, 'number');
            assert.equal(typeof message.column, 'number');
            assert.equal(message.ruleId, 'strict');
            assert.equal(message.severity, 2);
            if (satisfies(ESLint.version, '>=8.8')) {
                assert(Array.isArray(file.eslint.suppressedMessages));
                assert.equal(file.eslint.suppressedMessages.length, 0);
            }
            assert.deepEqual(
                file.eslint.usedDeprecatedRules,
                [{ replacedBy: [], ruleId: 'valid-jsdoc' }]
            );
        });

        it('should ignore files with null content', async () => {
            const file = createVinylDirectory();
            await finished(
                gulpESLintNew({ [ESLintKey]: ESLint, rules: { 'strict': 2 }, useEslintrc: false })
                    .on('data', noop)
                    .end(file)
            );
            assert(!file.eslint);
        });

        it('should emit an error when it takes a stream content', async () => {
            await assert.rejects(
                finished(
                    gulpESLintNew(
                        { [ESLintKey]: ESLint, rules: { 'strict': 'error' }, useEslintrc: false }
                    )
                        .end(new File({ path: resolve('stream.js'), contents: Readable.from([]) }))
                ),
                {
                    message: 'gulp-eslint-new doesn\'t support Vinyl files with Stream contents.',
                    plugin: 'gulp-eslint-new'
                }
            );
        });

        it('should emit an error when it fails to load a plugin', async () => {
            const pluginName = 'this-is-unknown-plugin';
            let err;
            await assert.rejects(
                finished(
                    gulpESLintNew({ [ESLintKey]: ESLint, plugins: [pluginName] })
                        .on('error', error => {
                            err = error;
                        })
                        .end(createVinylFile('file.js', ''))
                )
            );
            assert.equal(err.plugin, 'gulp-eslint-new');
            assert.equal(err.name, 'Error');
            assert.equal(err.code, 'MODULE_NOT_FOUND');
            // Remove stack trace from error message as it's machine-dependent.
            const message = err.message.replace(/\n.*$/s, '');
            assert.equal(
                message,
                `Failed to load plugin '${
                    pluginName
                }' declared in 'CLIOptions': Cannot find module 'eslint-plugin-${
                    pluginName
                }'`
            );
        });

        it('"reportUnusedDisableDirectives" option should be considered', async () => {
            const file = createVinylFile('file.js', '// eslint-disable-line');
            await
            finished(
                gulpESLintNew({ [ESLintKey]: ESLint, reportUnusedDisableDirectives: 'warn' })
                    .on('data', noop)
                    .end(file)
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.equal(file.eslint.messages.length, 1);
            const [message] = file.eslint.messages;
            assert.equal(
                message.message, 'Unused eslint-disable directive (no problems were reported).'
            );
            assert.equal(message.line, 1);
            assert.equal(message.column, 1);
            assert.equal(message.ruleId, null);
            assert.equal(message.severity, 1);
        });

        it('"rulePaths" option should be considered', async () => {
            const file = createVinylFile('file.js', '');
            await finished(
                gulpESLintNew(
                    {
                        [ESLintKey]: ESLint,
                        overrideConfig: { rules: { 'ok': 'error' } },
                        rulePaths: ['../custom-rules'],
                        useEslintrc: false
                    }
                )
                    .on('data', noop)
                    .end(file)
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.equal(file.eslint.messages.length, 0);
        });

        describe('should support a sharable config', () => {

            async function testConfig(options, filePath) {
                const file = createVinylFile(filePath, 'console.log(\'Hi\');');
                await finished(gulpESLintNew(options).on('data', noop).end(file));
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.equal(file.eslint.messages.length, 1);
                const [message] = file.eslint.messages;
                assert.equal(typeof message.message, 'string');
                assert.equal(typeof message.line, 'number');
                assert.equal(typeof message.column, 'number');
                assert.equal(message.ruleId, 'eol-last');
                assert.equal(message.severity, 2);
            }

            it('with an absolute path', async () => {
                await testConfig(
                    {
                        [ESLintKey]: ESLint,
                        overrideConfigFile: join(__dirname, 'eslintrc-sharable-config.js'),
                        useEslintrc: false
                    },
                    'no-newline.js'
                );
            });

            it('with a relative path', async () => {
                await testConfig(
                    {
                        [ESLintKey]: ESLint,
                        cwd: __dirname,
                        overrideConfigFile: 'eslintrc-sharable-config.js',
                        useEslintrc: false
                    },
                    'no-newline.js'
                );
            });

        });

        describe('"useEslintrc" option', () => {

            it('when true, should consider a configuration file', async () => {
                const file = createVinylFile('semi/file.js', '$()');
                await finished(
                    gulpESLintNew({ [ESLintKey]: ESLint, useEslintrc: true })
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.equal(file.eslint.messages.length, 1);
                const [message] = file.eslint.messages;
                assert.equal(typeof message.message, 'string');
                assert.equal(typeof message.line, 'number');
                assert.equal(typeof message.column, 'number');
                assert.equal(message.ruleId, 'semi');
                assert.equal(message.severity, 2);
                assert.equal(file.eslint.errorCount, 1);
                assert.equal(file.eslint.warningCount, 0);
                assert.equal(file.eslint.fixableErrorCount, 1);
                assert.equal(file.eslint.fixableWarningCount, 0);
                assert.equal(file.eslint.fatalErrorCount, 0);
            });

            it('when false, should ignore a configuration file', async () => {
                const file = createVinylFile('semi/file.js', '$()');
                await finished(
                    gulpESLintNew({ [ESLintKey]: ESLint, useEslintrc: false })
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.equal(file.eslint.messages.length, 0);
            });

        });

        describe('"warnIgnored" option', () => {

            it('when true, should warn when a file is ignored by .eslintignore', async () => {
                const file = createVinylFile('ignored.js', '(function () {ignore = abc;}});');
                await finished(
                    gulpESLintNew({ [ESLintKey]: ESLint, useEslintrc: false, warnIgnored: true })
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.deepEqual(
                    file.eslint.messages,
                    [
                        {
                            fatal: false,
                            message:
                            'File ignored because of a matching ignore pattern. Set "ignore" '
                            + 'option to false to override.',
                            severity: 1
                        }
                    ]
                );
                if (satisfies(ESLint.version, '>=8.8')) {
                    assert(Array.isArray(file.eslint.suppressedMessages));
                    assert.equal(file.eslint.suppressedMessages.length, 0);
                }
                assert.equal(file.eslint.errorCount, 0);
                assert.equal(file.eslint.warningCount, 1);
                assert.equal(file.eslint.fixableErrorCount, 0);
                assert.equal(file.eslint.fixableWarningCount, 0);
                assert.equal(file.eslint.fatalErrorCount, 0);
            });

            it('when true, should warn when a "node_modules" file is ignored', async () => {
                const file = createVinylFile(
                    'node_modules/test/index.js',
                    '(function () {ignore = abc;}});'
                );
                await finished(
                    gulpESLintNew({ [ESLintKey]: ESLint, useEslintrc: false, warnIgnored: true })
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.deepEqual(
                    file.eslint.messages,
                    [
                        {
                            fatal: false,
                            message:
                            'File ignored by default. Use a negated ignore pattern like '
                            + '"!node_modules/*" to override.',
                            severity: 1
                        }
                    ]
                );
                if (satisfies(ESLint.version, '>=8.8')) {
                    assert(Array.isArray(file.eslint.suppressedMessages));
                    assert.equal(file.eslint.suppressedMessages.length, 0);
                }
                assert.equal(file.eslint.errorCount, 0);
                assert.equal(file.eslint.warningCount, 1);
                assert.equal(file.eslint.fixableErrorCount, 0);
                assert.equal(file.eslint.fixableWarningCount, 0);
                assert.equal(file.eslint.fatalErrorCount, 0);
            });

            it('when not true, should silently ignore files', async () => {
                const file = createVinylFile('ignored.js', '(function () {ignore = abc;}});');
                await finished(
                    gulpESLintNew({ [ESLintKey]: ESLint, useEslintrc: false, warnIgnored: false })
                        .on('data', noop)
                        .end(file)
                );
                assert(!file.eslint);
            });

        });

        describe('"quiet" option', () => {

            it('when true, should remove warnings', async () => {
                const file
                = createVinylFile('invalid.js', 'a = 01;\nb = 02; // eslint-disable-line');
                await finished(
                    gulpESLintNew(
                        {
                            [ESLintKey]: ESLint,
                            quiet: true,
                            rules: { 'no-octal': 2, 'no-undef': 1, 'valid-jsdoc': 1 },
                            useEslintrc: false
                        }
                    )
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.equal(file.eslint.messages.length, 1);
                if (satisfies(ESLint.version, '>=8.8')) {
                    assert(Array.isArray(file.eslint.suppressedMessages));
                    assert.equal(file.eslint.suppressedMessages.length, 2);
                }
                assert.equal(file.eslint.errorCount, 1);
                assert.equal(file.eslint.warningCount, 0);
                assert.equal(file.eslint.fixableErrorCount, 0);
                assert.equal(file.eslint.fixableWarningCount, 0);
                assert.equal(file.eslint.fatalErrorCount, 0);
                assert.deepEqual(
                    file.eslint.usedDeprecatedRules,
                    [{ replacedBy: [], ruleId: 'valid-jsdoc' }]
                );
            });

            it('when a function, should filter messages', async () => {
                const file
                = createVinylFile('invalid.js', 'a = 01;\nb = 02; // eslint-disable-line');
                await finished(
                    gulpESLintNew(
                        {
                            [ESLintKey]: ESLint,
                            quiet: ({ severity }) => severity === 1,
                            rules: { 'no-octal': 2, 'no-undef': 1, 'valid-jsdoc': 1 },
                            useEslintrc: false
                        }
                    )
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.equal(file.eslint.messages.length, 1);
                if (satisfies(ESLint.version, '>=8.8')) {
                    assert(Array.isArray(file.eslint.suppressedMessages));
                    assert.equal(file.eslint.suppressedMessages.length, 2);
                }
                assert.equal(file.eslint.errorCount, 0);
                assert.equal(file.eslint.warningCount, 1);
                assert.equal(file.eslint.fixableErrorCount, 0);
                assert.equal(file.eslint.fixableWarningCount, 0);
                assert.equal(file.eslint.fatalErrorCount, 0);
                assert.deepEqual(
                    file.eslint.usedDeprecatedRules,
                    [{ replacedBy: [], ruleId: 'valid-jsdoc' }]
                );
            });

        });

        describe('"fix" option', () => {

            it('when true, should update buffered contents', async () => {
                const file = createVinylFile('fixable.js', 'var x = 0; ');
                await finished(
                    gulpESLintNew(
                        {
                            [ESLintKey]: ESLint,
                            fix: true,
                            rules: { 'no-trailing-spaces': 2 },
                            useEslintrc: false
                        }
                    )
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.equal(file.eslint.messages.length, 0);
                assert.equal(file.eslint.errorCount, 0);
                assert.equal(file.eslint.warningCount, 0);
                assert.equal(file.eslint.fixableErrorCount, 0);
                assert.equal(file.eslint.fixableWarningCount, 0);
                assert.equal(file.eslint.fatalErrorCount, 0);
                assert.equal(file.eslint.output, 'var x = 0;');
                assert.equal(file.contents.toString(), 'var x = 0;');
            });

            it('when a function, should update buffered contents', async () => {
                const file = createVinylFile('fixable.js', 'var x = 0; \nvar y = 1; ');
                await finished(
                    gulpESLintNew(
                        {
                            [ESLintKey]: ESLint,
                            fix: ({ line }) => line > 1,
                            rules: { 'no-trailing-spaces': 2 },
                            useEslintrc: false
                        }
                    )
                        .on('data', noop)
                        .end(file)
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(Array.isArray(file.eslint.messages));
                assert.equal(file.eslint.messages.length, 1);
                assert.equal(file.eslint.errorCount, 1);
                assert.equal(file.eslint.warningCount, 0);
                assert.equal(file.eslint.fixableErrorCount, 1);
                assert.equal(file.eslint.fixableWarningCount, 0);
                assert.equal(file.eslint.fatalErrorCount, 0);
                assert.equal(file.eslint.output, 'var x = 0; \nvar y = 1;');
                assert.equal(file.contents.toString(), 'var x = 0; \nvar y = 1;');
            });

        });

    }

    beforeEach(() => {
        process.chdir('test/fixtures');
    });

    afterEach(() => {
        process.chdir('../..');
    });

    describe('with ESLint 8.0', () => {
        const { ESLint } = require('eslint-8.0');
        testLinting(ESLint);
    });

    describe('with ESLint 8.x', () => {
        const { ESLint } = require('eslint-8.x');
        testLinting(ESLint);
    });

    it('should accept a string argument', async () => {
        const file = createVinylFile('file.js', '$()');
        await finished(
            gulpESLintNew('semi/.eslintrc')
                .on('data', noop)
                .end(file)
        );
        assert.equal(file.eslint.filePath, file.path);
        assert(Array.isArray(file.eslint.messages));
        assert.equal(file.eslint.messages.length, 1);
        const [message] = file.eslint.messages;
        assert.equal(typeof message.message, 'string');
        assert.equal(typeof message.line, 'number');
        assert.equal(typeof message.column, 'number');
        assert.equal(message.ruleId, 'semi');
        assert.equal(message.severity, 2);
        assert.equal(file.eslint.errorCount, 1);
        assert.equal(file.eslint.warningCount, 0);
        assert.equal(file.eslint.fixableErrorCount, 1);
        assert.equal(file.eslint.fixableWarningCount, 0);
        assert.equal(file.eslint.fatalErrorCount, 0);
        assert.equal(file._eslintInfo.eslint.constructor.name, 'ESLint');
    });

});
