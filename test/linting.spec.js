/* eslint-env mocha */

'use strict';

const { ESLINT_KEY, GULP_WARN_KEY } = require('#util');

const { createVinylDirectory, createVinylFile, finished, isEmptyArray } =
require('./test-util');

const { strict: assert }            = require('assert');
const gulpESLintNew                 = require('gulp-eslint-new');
const { join, resolve }             = require('path');
const { satisfies }                 = require('semver');
const { Readable }                  = require('stream');
const File                          = require('vinyl');

async function testConfig(options) {
    const filePath = 'file.js';
    const file = createVinylFile(filePath, 'console.log(\'Hi\');;');
    await finished(gulpESLintNew(options).resume().end(file));
    assert.equal(file.eslint.filePath, file.path);
    assert(Array.isArray(file.eslint.messages));
    assert.equal(file.eslint.messages.length, 2);
    const [message1, message2] = file.eslint.messages;
    assert.equal(typeof message1.message, 'string');
    assert.equal(message1.line, 1);
    assert.equal(typeof message1.column, 'number');
    assert.equal(message1.ruleId, 'no-extra-semi');
    assert.equal(message1.severity, 2);
    assert.equal(typeof message2.message, 'string');
    assert.equal(message2.line, 1);
    assert.equal(typeof message2.column, 'number');
    assert.equal(message2.ruleId, 'eol-last');
    assert.equal(message2.severity, 2);
}

describe('gulp-eslint-new plugin', () => {

    function testLinting(ESLint) {

        it('should throw an error after warning about migrated options', async () => {
            let actualMessage;
            const gulpWarn =
            message => {
                actualMessage = message;
            };
            assert.throws(
                () =>
                    gulpESLintNew(
                        { [ESLINT_KEY]: ESLint, [GULP_WARN_KEY]: gulpWarn, configFile: 42 },
                    ),
                ({ constructor: { name } }) => name === 'ESLintInvalidOptionsError',
            );
            assert(typeof actualMessage === 'string');
        });

        it('should configure an alternate parser', async () => {
            require('@typescript-eslint/parser').clearCaches();
            const file = createVinylFile('file.ts', 'function fn(): void { }');
            await finished(
                gulpESLintNew(
                    {
                        [ESLINT_KEY]: ESLint,
                        baseConfig: {
                            parser: '@typescript-eslint/parser',
                            rules: { 'eol-last': 'error' },
                        },
                        useEslintrc: false,
                    },
                )
                    .resume()
                    .on('end', () => {
                        for (const key of Object.keys(require('tslib'))) {
                            delete global[key];
                        }
                    })
                    .end(file),
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
                        [ESLINT_KEY]: ESLint,
                        baseConfig: { rules: { strict: [2, 'global'], 'valid-jsdoc': 1 } },
                        useEslintrc: false,
                    },
                )
                    .resume()
                    .end(file),
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
                assert(isEmptyArray(file.eslint.suppressedMessages));
            }
            assert.deepEqual(
                file.eslint.usedDeprecatedRules,
                [{ replacedBy: [], ruleId: 'valid-jsdoc' }],
            );
        });

        it('should emit an error when it fails to load a plugin', async () => {
            const pluginName = 'this-is-unknown-plugin';
            let err;
            await assert.rejects(
                finished(
                    gulpESLintNew(
                        { [ESLINT_KEY]: ESLint, overrideConfig: { plugins: [pluginName] } },
                    )
                        .on('error', error => {
                            err = error;
                        })
                        .end(createVinylFile('file.js', '')),
                ),
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
                }'`,
            );
        });

        it('"reportUnusedDisableDirectives" option should be considered', async () => {
            const file = createVinylFile('file.js', '// eslint-disable-line');
            await
            finished(
                gulpESLintNew({ [ESLINT_KEY]: ESLint, reportUnusedDisableDirectives: 'warn' })
                    .resume()
                    .end(file),
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.equal(file.eslint.messages.length, 1);
            const [message] = file.eslint.messages;
            assert.equal(
                message.message, 'Unused eslint-disable directive (no problems were reported).',
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
                        [ESLINT_KEY]: ESLint,
                        overrideConfig: { rules: { 'ok': 'error' } },
                        rulePaths: ['../custom-rules'],
                        useEslintrc: false,
                    },
                )
                    .resume()
                    .end(file),
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(isEmptyArray(file.eslint.messages));
        });

        describe('"overrideConfigFile" should work', () => {

            it('with an absolute path', async () => {
                await testConfig(
                    {
                        [ESLINT_KEY]: ESLint,
                        overrideConfigFile: join(__dirname, 'config/eslintrc-config.js'),
                        useEslintrc: false,
                    },
                );
            });

            it('with a relative path', async () => {
                await testConfig(
                    {
                        [ESLINT_KEY]: ESLint,
                        cwd: __dirname,
                        overrideConfigFile: 'config/eslintrc-config.js',
                        useEslintrc: false,
                    },
                );
            });

        });

        describe('"extends" should work', () => {

            it('with an absolute path', async () => {
                await testConfig(
                    {
                        [ESLINT_KEY]: ESLint,
                        baseConfig: { extends: join(__dirname, 'config/eslintrc-config.js') },
                        useEslintrc: false,
                    },
                );
            });

            it('with a relative path', async () => {
                await testConfig(
                    {
                        [ESLINT_KEY]: ESLint,
                        cwd: __dirname,
                        baseConfig: { extends: './config/eslintrc-config.js' },
                        useEslintrc: false,
                    },
                );
            });

            it('with a package', async () => {
                await testConfig(
                    {
                        [ESLINT_KEY]: ESLint,
                        baseConfig: { extends: '~shareable/eslintrc-config' },
                        useEslintrc: false,
                    },
                );
            });

        });

        describe('"useEslintrc" option', () => {

            it('when true, should consider a configuration file', async () => {
                const file = createVinylFile('semi/file.js', '$()');
                await finished(
                    gulpESLintNew({ [ESLINT_KEY]: ESLint, useEslintrc: true })
                        .resume()
                        .end(file),
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
                    gulpESLintNew({ [ESLINT_KEY]: ESLint, useEslintrc: false })
                        .resume()
                        .end(file),
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(isEmptyArray(file.eslint.messages));
            });

        });

        describe('"fix" option', () => {

            it('when true, should update buffered contents', async () => {
                const file = createVinylFile('fixable.js', 'var x = 0; ');
                await finished(
                    gulpESLintNew(
                        {
                            [ESLINT_KEY]: ESLint,
                            baseConfig: { rules: { 'no-trailing-spaces': 2 } },
                            fix: true,
                            useEslintrc: false,
                        },
                    )
                        .resume()
                        .end(file),
                );
                assert.equal(file.eslint.filePath, file.path);
                assert(isEmptyArray(file.eslint.messages));
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
                            [ESLINT_KEY]: ESLint,
                            baseConfig: { rules: { 'no-trailing-spaces': 2 } },
                            fix: ({ line }) => line > 1,
                            useEslintrc: false,
                        },
                    )
                        .resume()
                        .end(file),
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

    let originalCwd;

    beforeEach(() => {
        originalCwd = process.cwd();
        process.chdir(join(__dirname, 'fixtures'));
    });

    afterEach(() => {
        process.chdir(originalCwd);
        originalCwd = undefined;
    });

    it('should accept a string argument', async () => {
        const file = createVinylFile('file.js', '$()');
        await finished(
            gulpESLintNew('semi/.eslintrc')
                .resume()
                .end(file),
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

    it('should not raise a warning when no options are migrated', async () => {
        const gulpWarn = () => assert.fail('Unexpected warning');
        gulpESLintNew(
            {
                [GULP_WARN_KEY]: gulpWarn,
                overrideConfig: {
                    env: { },
                    extends: [],
                    globals: { },
                    ignorePatterns: [],
                    parser: '',
                    parserOptions: { },
                    plugins: [],
                    rules: { },
                },
                overrideConfigFile: null,
                plugins: { },
                useEslintrc: false,
                warnIgnored: true,
            },
        );
    });

    it('should raise a warning when options are migrated', async () => {
        let actualMessage;
        const gulpWarn =
        message => {
            actualMessage = message;
        };
        gulpESLintNew(
            {
                [GULP_WARN_KEY]: gulpWarn,
                configFile: null,
                envs: [],
                extends: [],
                globals: [],
                ignorePattern: [],
                parser: '',
                parserOptions: { },
                plugins: [],
                rules: { },
                useEslintrc: false,
                warnFileIgnored: true,
            },
        );
        assert(typeof actualMessage === 'string');
        assert(actualMessage.includes('\n • configFile → overrideConfigFile\n'));
        assert(actualMessage.includes('\n • envs → overrideConfig.env (format changed)\n'));
        assert(actualMessage.includes('\n • extends → overrideConfig.extends\n'));
        assert(
            actualMessage.includes('\n • globals → overrideConfig.globals (format changed)\n'),
        );
        assert(actualMessage.includes('\n • ignorePattern → overrideConfig.ignorePatterns\n'));
        assert(actualMessage.includes('\n • parser → overrideConfig.parser\n'));
        assert(actualMessage.includes('\n • parserOptions → overrideConfig.parserOptions\n'));
        assert(actualMessage.includes('\n • plugins → overrideConfig.plugins\n'));
        assert(actualMessage.includes('\n • rules → overrideConfig.rules\n'));
        assert(actualMessage.includes('\n • warnFileIgnored → warnIgnored\n'));
    });

    it('should set option "cwd" if undefined', async () => {
        let actualCwd;
        const ESLint =
        function ({ cwd }) {
            actualCwd = cwd;
        };
        gulpESLintNew({ [ESLINT_KEY]: ESLint });
        assert.equal(actualCwd, process.cwd());
    });

    it('should ignore files with null content', async () => {
        const file = createVinylDirectory();
        await finished(
            gulpESLintNew({ baseConfig: { rules: { 'strict': 2 } }, useEslintrc: false })
                .resume()
                .end(file),
        );
        assert(!file.eslint);
    });

    it('should emit an error when it takes a stream content', async () => {
        await assert.rejects(
            finished(
                gulpESLintNew({ useEslintrc: false })
                    .end(new File({ path: resolve('stream.js'), contents: Readable.from([]) })),
            ),
            {
                message: 'gulp-eslint-new doesn\'t support Vinyl files with Stream contents.',
                plugin: 'gulp-eslint-new',
            },
        );
    });

    describe('"warnIgnored" option', () => {

        it('when true, should warn when a file is ignored by .eslintignore', async () => {
            const file = createVinylFile('ignored.js', '(function () {ignore = abc;}});');
            await finished(
                gulpESLintNew({ useEslintrc: false, warnIgnored: true }).resume().end(file),
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.deepEqual(
                file.eslint.messages,
                [
                    {
                        fatal: false,
                        message:
                        'File ignored because of a matching ignore pattern. Set "ignore" ' +
                        'option to false to override.',
                        severity: 1,
                    },
                ],
            );
            assert.equal(file.eslint.errorCount, 0);
            assert.equal(file.eslint.warningCount, 1);
            assert.equal(file.eslint.fixableErrorCount, 0);
            assert.equal(file.eslint.fixableWarningCount, 0);
            assert.equal(file.eslint.fatalErrorCount, 0);
        });

        it('when true, should warn when a "node_modules" file is ignored', async () => {
            const file = createVinylFile(
                'node_modules/test/index.js',
                '(function () {ignore = abc;}});',
            );
            await finished(
                gulpESLintNew({ useEslintrc: false, warnIgnored: true }).resume().end(file),
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.deepEqual(
                file.eslint.messages,
                [
                    {
                        fatal: false,
                        message:
                        'File ignored by default. Use a negated ignore pattern like ' +
                        '"!node_modules/*" to override.',
                        severity: 1,
                    },
                ],
            );
            assert.equal(file.eslint.errorCount, 0);
            assert.equal(file.eslint.warningCount, 1);
            assert.equal(file.eslint.fixableErrorCount, 0);
            assert.equal(file.eslint.fixableWarningCount, 0);
            assert.equal(file.eslint.fatalErrorCount, 0);
        });

        it('when not true, should silently ignore files', async () => {
            const file = createVinylFile('ignored.js', '(function () {ignore = abc;}});');
            await finished(
                gulpESLintNew({ useEslintrc: false, warnIgnored: false }).resume().end(file),
            );
            assert(!file.eslint);
        });

    });

    describe('"quiet" option', () => {

        it('when true, should remove warnings', async () => {
            const file =
            createVinylFile('invalid.js', 'a = 01;\nb = 02; // eslint-disable-line');
            await finished(
                gulpESLintNew(
                    {
                        baseConfig: {
                            rules: { 'no-octal': 2, 'no-undef': 1, 'valid-jsdoc': 1 },
                        },
                        quiet: true,
                        useEslintrc: false,
                    },
                )
                    .resume()
                    .end(file),
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.equal(file.eslint.messages.length, 1);
            assert.equal(file.eslint.errorCount, 1);
            assert.equal(file.eslint.warningCount, 0);
            assert.equal(file.eslint.fixableErrorCount, 0);
            assert.equal(file.eslint.fixableWarningCount, 0);
            assert.equal(file.eslint.fatalErrorCount, 0);
            assert.deepEqual(
                file.eslint.usedDeprecatedRules,
                [{ replacedBy: [], ruleId: 'valid-jsdoc' }],
            );
        });

        it('when a function, should filter messages', async () => {
            const file = createVinylFile('invalid.js', 'a = 01;\nb = 02; // eslint-disable-line');
            await finished(
                gulpESLintNew(
                    {
                        baseConfig: {
                            rules: { 'no-octal': 2, 'no-undef': 1, 'valid-jsdoc': 1 },
                        },
                        quiet: ({ severity }) => severity === 1,
                        useEslintrc: false,
                    },
                )
                    .resume()
                    .end(file),
            );
            assert.equal(file.eslint.filePath, file.path);
            assert(Array.isArray(file.eslint.messages));
            assert.equal(file.eslint.messages.length, 1);
            assert.equal(file.eslint.errorCount, 0);
            assert.equal(file.eslint.warningCount, 1);
            assert.equal(file.eslint.fixableErrorCount, 0);
            assert.equal(file.eslint.fixableWarningCount, 0);
            assert.equal(file.eslint.fatalErrorCount, 0);
            assert.deepEqual(
                file.eslint.usedDeprecatedRules,
                [{ replacedBy: [], ruleId: 'valid-jsdoc' }],
            );
        });

    });

    describe('with ESLint 8.0', () => {
        const { ESLint } = require('eslint-8.0');
        testLinting(ESLint);
    });

    describe('with ESLint 8.x', () => {
        const { ESLint } = require('eslint-8.x');
        testLinting(ESLint);
    });

});
