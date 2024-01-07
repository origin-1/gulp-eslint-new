'use strict';

const { ESLINT_KEY, GULP_WARN_KEY } = require('#util');

const { createVinylDirectory, createVinylFile, finishStream, isEmptyArray } =
require('./test-util');

const { strict: assert }            = require('assert');
const gulpESLintNew                 = require('gulp-eslint-new');
const { join, resolve }             = require('path');
const { satisfies }                 = require('semver');
const { Readable }                  = require('stream');
const VinylFile                     = require('vinyl');

async function testConfig(options)
{
    const filePath = 'file.js';
    const file = createVinylFile(filePath, 'console.log(\'Hi\');;');
    await finishStream(gulpESLintNew(options).end(file));
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

describe
(
    'gulp-eslint-new plugin',
    () =>
    {
        function testCommonLinting(ESLint)
        {
            const useEslintrcConfig = ESLint.name === 'ESLint';

            it
            (
                'should produce an expected result',
                async () =>
                {
                    const file =
                    createVinylFile('use-strict.js', '/* eslint-disable strict */\nvar x = 1;');
                    const options =
                    useEslintrcConfig ?
                    {
                        [ESLINT_KEY]:   ESLint,
                        baseConfig:
                        { rules: { 'no-var': 2, 'strict': [2, 'global'], 'valid-jsdoc': 1 } },
                        useEslintrc:    false,
                    } :
                    {
                        [ESLINT_KEY]:       ESLint,
                        configType:         'flat',
                        overrideConfig:
                        {
                            languageOptions: { sourceType: 'script' },
                            rules:
                            { 'no-var': 2, 'strict': [2, 'global'], 'valid-jsdoc': 1 },
                        },
                        overrideConfigFile: true,
                    };
                    await finishStream(gulpESLintNew(options).end(file));
                    assert.equal(file.eslint.filePath, file.path);
                    assert(Array.isArray(file.eslint.messages));
                    assert.equal(file.eslint.messages.length, 1);
                    const [message] = file.eslint.messages;
                    assert.equal(typeof message.message, 'string');
                    assert.equal(typeof message.line, 'number');
                    assert.equal(typeof message.column, 'number');
                    assert.equal(message.ruleId, 'no-var');
                    assert.equal(message.severity, 2);
                    if (satisfies(ESLint.version, useEslintrcConfig ? '>=8.8' : '>=8.23'))
                    {
                        assert.equal(file.eslint.suppressedMessages.length, 1);
                        assert.equal(file.eslint.suppressedMessages[0].ruleId, 'strict');
                    }
                    assert.deepEqual
                    (
                        file.eslint.usedDeprecatedRules,
                        [{ replacedBy: [], ruleId: 'valid-jsdoc' }],
                    );
                },
            );

            describe
            (
                '"overrideConfig" option',
                () =>
                {
                    it
                    (
                        'when invalid, should throw an error',
                        () =>
                        {
                            const overrideConfig = () => { };
                            const options =
                            useEslintrcConfig ?
                            { [ESLINT_KEY]: ESLint, overrideConfig, useEslintrc: false } :
                            { [ESLINT_KEY]: ESLint, configType: 'flat', overrideConfig };
                            assert.throws
                            (
                                () => gulpESLintNew(options),
                                ({ code, constructor: { name } }) =>
                                code === 'ESLINT_INVALID_OPTIONS' &&
                                name === 'ESLintInvalidOptionsError',
                            );
                        },
                    );
                },
            );

            describe
            (
                '"overrideConfigFile" should work',
                () =>
                {
                    it
                    (
                        'with an absolute path',
                        async () =>
                        {
                            const options =
                            useEslintrcConfig ?
                            {
                                [ESLINT_KEY]:       ESLint,
                                overrideConfigFile: join(__dirname, 'config/eslintrc-config.js'),
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_KEY]:       ESLint,
                                configType:         'flat',
                                overrideConfigFile: join(__dirname, 'config/flat-config.js'),
                            };
                            await testConfig(options);
                        },
                    );

                    it
                    (
                        'with a relative path',
                        async () =>
                        {
                            const options =
                            useEslintrcConfig ?
                            {
                                [ESLINT_KEY]:       ESLint,
                                cwd:                __dirname,
                                overrideConfigFile: 'config/eslintrc-config.js',
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_KEY]:       ESLint,
                                configType:         'flat',
                                cwd:                __dirname,
                                overrideConfigFile: 'config/flat-config.js',
                            };
                            await testConfig(options);
                        },
                    );
                },
            );

            describe
            (
                '"fix" option',
                () =>
                {
                    it
                    (
                        'when true, should update buffered contents',
                        async () =>
                        {
                            const file = createVinylFile('fixable.js', 'var x = 0; ');
                            const options =
                            useEslintrcConfig ?
                            {
                                [ESLINT_KEY]:       ESLint,
                                baseConfig:         { rules: { 'no-trailing-spaces': 2 } },
                                fix:                true,
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_KEY]:       ESLint,
                                configType:         'flat',
                                fix:                true,
                                overrideConfig:     { rules: { 'no-trailing-spaces': 2 } },
                                overrideConfigFile: true,
                            };
                            await finishStream(gulpESLintNew(options).end(file));
                            assert.equal(file.eslint.filePath, file.path);
                            assert(isEmptyArray(file.eslint.messages));
                            assert.equal(file.eslint.errorCount, 0);
                            assert.equal(file.eslint.warningCount, 0);
                            assert.equal(file.eslint.fixableErrorCount, 0);
                            assert.equal(file.eslint.fixableWarningCount, 0);
                            assert.equal(file.eslint.fatalErrorCount, 0);
                            assert.equal(file.eslint.output, 'var x = 0;');
                            assert.equal(file.contents.toString(), 'var x = 0;');
                        },
                    );

                    it
                    (
                        'when a function, should update buffered contents',
                        async () =>
                        {
                            const file = createVinylFile('fixable.js', 'var x = 0; \nvar y = 1; ');
                            const options =
                            useEslintrcConfig ?
                            {
                                [ESLINT_KEY]:       ESLint,
                                baseConfig:         { rules: { 'no-trailing-spaces': 2 } },
                                fix:                ({ line }) => line > 1,
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_KEY]:       ESLint,
                                configType:         'flat',
                                fix:                ({ line }) => line > 1,
                                overrideConfig:     { rules: { 'no-trailing-spaces': 2 } },
                                overrideConfigFile: true,
                            };
                            await finishStream(gulpESLintNew(options).end(file));
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
                        },
                    );

                    it
                    (
                        'when invalid, should throw an error',
                        () =>
                        {
                            const options =
                            useEslintrcConfig ?
                            { [ESLINT_KEY]: ESLint, fix: null } :
                            { [ESLINT_KEY]: ESLint, configType: 'flat', fix: null };
                            assert.throws
                            (
                                () => gulpESLintNew(options),
                                ({ code, constructor: { name } }) =>
                                code === 'ESLINT_INVALID_OPTIONS' &&
                                name === 'ESLintInvalidOptionsError',
                            );
                        },
                    );
                },
            );
        }

        function testEslintrcLinting(ESLint)
        {
            it
            (
                'should throw an error after warning about migrated options',
                () =>
                {
                    let actualMessage;
                    const gulpWarn =
                    message =>
                    {
                        actualMessage = message;
                    };
                    assert.throws
                    (
                        () =>
                        gulpESLintNew
                        ({ [ESLINT_KEY]: ESLint, [GULP_WARN_KEY]: gulpWarn, configFile: 42 }),
                        ({ code, constructor: { name } }) =>
                        code === 'ESLINT_INVALID_OPTIONS' &&
                        name === 'ESLintInvalidOptionsError',
                    );
                    assert(typeof actualMessage === 'string');
                },
            );

            it
            (
                'should ignore a file ignored by .eslintignore',
                async () =>
                {
                    const file = createVinylFile('ignored.js', '(function () {ignore = abc;}});');
                    await finishStream
                    (
                        gulpESLintNew
                        ({ [ESLINT_KEY]: ESLint, useEslintrc: false, warnIgnored: true })
                        .end(file),
                    );
                    assert.equal(file.eslint.filePath, file.path);
                    assert(Array.isArray(file.eslint.messages));
                    assert.deepEqual
                    (
                        file.eslint.messages,
                        [
                            {
                                fatal:      false,
                                message:
                                'File ignored because of a matching ignore pattern. Set "ignore" ' +
                                'option to false to override.',
                                severity:   1,
                            },
                        ],
                    );
                    assert.equal(file.eslint.errorCount, 0);
                    assert.equal(file.eslint.warningCount, 1);
                    assert.equal(file.eslint.fixableErrorCount, 0);
                    assert.equal(file.eslint.fixableWarningCount, 0);
                    assert.equal(file.eslint.fatalErrorCount, 0);
                },
            );

            it
            (
                '"reportUnusedDisableDirectives" option should be considered',
                async () =>
                {
                    const file = createVinylFile('file.js', '// eslint-disable-line');
                    const options =
                    {
                        [ESLINT_KEY]:                   ESLint,
                        reportUnusedDisableDirectives:  'warn',
                        useEslintrc:                    false,
                    };
                    await finishStream(gulpESLintNew(options).end(file));
                    assert.equal(file.eslint.filePath, file.path);
                    assert(Array.isArray(file.eslint.messages));
                    assert.equal(file.eslint.messages.length, 1);
                    const [message] = file.eslint.messages;
                    assert.equal
                    (
                        message.message,
                        'Unused eslint-disable directive (no problems were reported).',
                    );
                    assert.equal(message.line, 1);
                    assert.equal(message.column, 1);
                    assert.equal(message.ruleId, null);
                    assert.equal(message.severity, 1);
                },
            );

            it
            (
                '"rulePaths" option should be considered',
                async () =>
                {
                    const file = createVinylFile('file.js', '');
                    await finishStream
                    (
                        gulpESLintNew
                        (
                            {
                                [ESLINT_KEY]:   ESLint,
                                overrideConfig: { rules: { 'ok': 'error' } },
                                rulePaths:      ['../custom-rules'],
                                useEslintrc:    false,
                            },
                        )
                        .end(file),
                    );
                    assert.equal(file.eslint.filePath, file.path);
                    assert(isEmptyArray(file.eslint.messages));
                },
            );

            describe
            (
                '"extends" should work',
                () =>
                {
                    it
                    (
                        'with an absolute path',
                        async () =>
                        {
                            await testConfig
                            (
                                {
                                    [ESLINT_KEY]:   ESLint,
                                    baseConfig:
                                    { extends: join(__dirname, 'config/eslintrc-config.js') },
                                    useEslintrc:    false,
                                },
                            );
                        },
                    );

                    it
                    (
                        'with a relative path',
                        async () =>
                        {
                            await testConfig
                            (
                                {
                                    [ESLINT_KEY]:   ESLint,
                                    baseConfig:     { extends: './config/eslintrc-config.js' },
                                    cwd:            __dirname,
                                    useEslintrc:    false,
                                },
                            );
                        },
                    );

                    it
                    (
                        'with a package',
                        async () =>
                        {
                            await testConfig
                            (
                                {
                                    [ESLINT_KEY]:   ESLint,
                                    baseConfig:     { extends: '~shareable/eslintrc-config' },
                                    useEslintrc:    false,
                                },
                            );
                        },
                    );
                },
            );

            describe
            (
                '"useEslintrc" option',
                () =>
                {
                    it
                    (
                        'when true, should consider a configuration file',
                        async () =>
                        {
                            const file = createVinylFile('semi/file.js', '$()');
                            await finishStream
                            (gulpESLintNew({ [ESLINT_KEY]: ESLint, useEslintrc: true }).end(file));
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
                        },
                    );

                    it
                    (
                        'when false, should ignore a configuration file',
                        async () =>
                        {
                            const file = createVinylFile('semi/file.js', '$()');
                            await finishStream
                            (gulpESLintNew({ [ESLINT_KEY]: ESLint, useEslintrc: false }).end(file));
                            assert.equal(file.eslint.filePath, file.path);
                            assert(isEmptyArray(file.eslint.messages));
                        },
                    );
                },
            );

            it
            (
                'should emit an error when it fails to load a plugin',
                async () =>
                {
                    const pluginName = 'this-is-unknown-plugin';
                    let emittedError;
                    await assert.rejects
                    (
                        finishStream
                        (
                            gulpESLintNew
                            (
                                {
                                    [ESLINT_KEY]:   ESLint,
                                    overrideConfig: { plugins: [pluginName] },
                                    useEslintrc:    false,
                                },
                            )
                            .on
                            (
                                'error',
                                error =>
                                {
                                    emittedError = error;
                                },
                            )
                            .end(createVinylFile('file.js', '')),
                        ),
                    );
                    assert.equal(emittedError.plugin, 'gulp-eslint-new');
                    assert.equal(emittedError.name, 'Error');
                    assert.equal(emittedError.code, 'MODULE_NOT_FOUND');
                    // Remove stack trace from error message as it's machine-dependent.
                    const message = emittedError.message.replace(/\n.*$/s, '');
                    assert.equal
                    (
                        message,
                        `Failed to load plugin '${
                        pluginName
                        }' declared in 'CLIOptions': Cannot find module 'eslint-plugin-${
                        pluginName
                        }'`,
                    );
                },
            );
        }

        let originalCwd;

        beforeEach
        (
            () =>
            {
                originalCwd = process.cwd();
                process.chdir(join(__dirname, 'fixtures'));
            },
        );

        afterEach
        (
            () =>
            {
                process.chdir(originalCwd);
                originalCwd = undefined;
            },
        );

        it
        (
            'should accept a string argument',
            async () =>
            {
                const file = createVinylFile('file.js', '$()');
                await finishStream(gulpESLintNew('semi/.eslintrc').end(file));
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
            },
        );

        it
        (
            'should not raise a warning when no options are migrated',
            () =>
            {
                const gulpWarn = () => assert.fail('Unexpected warning');
                gulpESLintNew
                (
                    {
                        [GULP_WARN_KEY]:    gulpWarn,
                        overrideConfig:
                        {
                            env:            { },
                            extends:        [],
                            globals:        { },
                            ignorePatterns: [],
                            parser:         '',
                            parserOptions:  { },
                            plugins:        [],
                            rules:          { },
                        },
                        overrideConfigFile: null,
                        plugins:            { },
                        useEslintrc:        false,
                        warnIgnored:        true,
                    },
                );
            },
        );

        it
        (
            'should raise a warning when options are migrated',
            () =>
            {
                let actualMessage;
                const gulpWarn =
                message =>
                {
                    actualMessage = message;
                };
                gulpESLintNew
                (
                    {
                        [GULP_WARN_KEY]:    gulpWarn,
                        configFile:         null,
                        envs:               [],
                        extends:            [],
                        globals:            [],
                        ignorePattern:      [],
                        parser:             '',
                        parserOptions:      { },
                        plugins:            [],
                        rules:              { },
                        useEslintrc:        false,
                        warnFileIgnored:    true,
                    },
                );
                assert(typeof actualMessage === 'string');
                assert(actualMessage.includes('\n • configFile → overrideConfigFile\n'));
                assert(actualMessage.includes('\n • envs → overrideConfig.env (format changed)\n'));
                assert(actualMessage.includes('\n • extends → overrideConfig.extends\n'));
                assert
                (
                    actualMessage.includes
                    ('\n • globals → overrideConfig.globals (format changed)\n'),
                );
                assert
                (actualMessage.includes('\n • ignorePattern → overrideConfig.ignorePatterns\n'));
                assert(actualMessage.includes('\n • parser → overrideConfig.parser\n'));
                assert
                (actualMessage.includes('\n • parserOptions → overrideConfig.parserOptions\n'));
                assert(actualMessage.includes('\n • plugins → overrideConfig.plugins\n'));
                assert(actualMessage.includes('\n • rules → overrideConfig.rules\n'));
                assert(actualMessage.includes('\n • warnFileIgnored → warnIgnored\n'));
            },
        );

        it
        (
            'should set option "cwd" if undefined',
            () =>
            {
                let actualCwd;
                const ESLint =
                function ({ cwd })
                {
                    actualCwd = cwd;
                };
                gulpESLintNew({ [ESLINT_KEY]: ESLint });
                assert.equal(actualCwd, process.cwd());
            },
        );

        it
        (
            'should ignore files with null content',
            async () =>
            {
                const file = createVinylDirectory();
                await finishStream
                (
                    gulpESLintNew({ baseConfig: { rules: { 'strict': 2 } }, useEslintrc: false })
                    .end(file),
                );
                assert.equal(file.eslint, undefined);
            },
        );

        it
        (
            'should emit an error when it takes a stream content',
            async () =>
            {
                const file =
                new VinylFile({ path: resolve('stream.js'), contents: Readable.from([]) });
                await assert.rejects
                (
                    finishStream(gulpESLintNew({ useEslintrc: false }).end(file)),
                    {
                        message:
                        'gulp-eslint-new doesn\'t support Vinyl files with Stream contents.',
                        plugin: 'gulp-eslint-new',
                    },
                );
            },
        );

        describe
        (
            '"quiet" option',
            () =>
            {
                it
                (
                    'when true, should remove warnings',
                    async () =>
                    {
                        const file =
                        createVinylFile('invalid.js', 'a = 01;\nb = 02; // eslint-disable-line');
                        await finishStream
                        (
                            gulpESLintNew
                            (
                                {
                                    baseConfig:
                                    { rules: { 'no-octal': 2, 'no-undef': 1, 'valid-jsdoc': 1 } },
                                    quiet:          true,
                                    useEslintrc:    false,
                                },
                            )
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
                        assert.deepEqual
                        (
                            file.eslint.usedDeprecatedRules,
                            [{ replacedBy: [], ruleId: 'valid-jsdoc' }],
                        );
                    },
                );

                it
                (
                    'when a function, should filter messages',
                    async () =>
                    {
                        const file =
                        createVinylFile('invalid.js', 'a = 01;\nb = 02; // eslint-disable-line');
                        await finishStream
                        (
                            gulpESLintNew
                            (
                                {
                                    baseConfig:
                                    { rules: { 'no-octal': 2, 'no-undef': 1, 'valid-jsdoc': 1 } },
                                    quiet:          ({ severity }) => severity === 1,
                                    useEslintrc:    false,
                                },
                            )
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
                        assert.deepEqual
                        (
                            file.eslint.usedDeprecatedRules,
                            [{ replacedBy: [], ruleId: 'valid-jsdoc' }],
                        );
                    },
                );

                it
                (
                    'when invalid, should throw an error',
                    () =>
                    {
                        assert.throws
                        (
                            () => gulpESLintNew({ quiet: null }),
                            { constructor: Error },
                        );
                    },
                );
            },
        );

        describe
        (
            '"warnIgnored" option',
            () =>
            {
                it
                (
                    'when true, should warn about ignored files',
                    async () =>
                    {
                        const file1 = createVinylFile('.git/file1.js', '');
                        const file2 = createVinylFile('node_modules/file2.js', '');
                        const stream = gulpESLintNew({ useEslintrc: false, warnIgnored: true });
                        stream.write(file1);
                        stream.write(file2);
                        await finishStream(stream.end());
                        assert.equal(file1.eslint.filePath, file1.path);
                        assert(Array.isArray(file1.eslint.messages));
                        assert.equal(file1.eslint.messages.length, 1);
                        assert.equal(file1.eslint.errorCount, 0);
                        assert.equal(file1.eslint.warningCount, 1);
                        assert.equal(file1.eslint.fixableErrorCount, 0);
                        assert.equal(file1.eslint.fixableWarningCount, 0);
                        assert.equal(file1.eslint.fatalErrorCount, 0);
                        assert.equal(file2.eslint.filePath, file2.path);
                        assert(Array.isArray(file2.eslint.messages));
                        assert.equal(file2.eslint.messages.length, 1);
                        assert.equal(file2.eslint.errorCount, 0);
                        assert.equal(file2.eslint.warningCount, 1);
                        assert.equal(file2.eslint.fixableErrorCount, 0);
                        assert.equal(file2.eslint.fixableWarningCount, 0);
                        assert.equal(file2.eslint.fatalErrorCount, 0);
                    },
                );

                it
                (
                    'when not specified, should not warn about an ignored file',
                    async () =>
                    {
                        const file = createVinylFile('node_modules/file.js', '');
                        await finishStream(gulpESLintNew({ useEslintrc: false }).end(file));
                        assert.equal(file.eslint, undefined);
                    },
                );

                it
                (
                    'when invalid, should throw an error',
                    () =>
                    {
                        assert.throws
                        (() => gulpESLintNew({ warnIgnored: null }), { constructor: Error });
                    },
                );
            },
        );

        describe
        (
            'with ESLint 8.0',
            () =>
            {
                const { ESLint } = require('eslint-8.0');
                testCommonLinting(ESLint);
                testEslintrcLinting(ESLint);
            },
        );

        describe
        (
            'with ESLint 8.x',
            () =>
            {
                const { ESLint } = require('eslint-8.x');
                testCommonLinting(ESLint);
                testEslintrcLinting(ESLint);
            },
        );

        describe
        (
            'with FlatESLint 8.21',
            () =>
            {
                const { FlatESLint } = require('eslint-8.21/use-at-your-own-risk');
                testCommonLinting(FlatESLint);
            },
        );

        describe
        (
            'with FlatESLint 8.x',
            () =>
            {
                const { FlatESLint } = require('eslint-8.x/use-at-your-own-risk');
                testCommonLinting(FlatESLint);

                it
                (
                    '"reportUnusedDisableDirectives" linter option should be considered',
                    async function ()
                    {
                        if (!satisfies(FlatESLint.version, '>=8.56'))
                            this.skip();
                        const file = createVinylFile('file.js', '// eslint-disable-line');
                        const options =
                        {
                            [ESLINT_KEY]:       FlatESLint,
                            baseConfig:
                            { linterOptions: { reportUnusedDisableDirectives: 1 } },
                            configType:         'flat',
                            overrideConfigFile: true,
                        };
                        await finishStream(gulpESLintNew(options).end(file));
                        assert.equal(file.eslint.filePath, file.path);
                        assert(Array.isArray(file.eslint.messages));
                        assert.equal(file.eslint.messages.length, 1);
                        const [message] = file.eslint.messages;
                        assert.equal
                        (
                            message.message,
                            'Unused eslint-disable directive (no problems were reported).',
                        );
                        assert.equal(message.line, 1);
                        assert.equal(message.column, 1);
                        assert.equal(message.ruleId, null);
                        assert.equal(message.severity, 1);
                    },
                );
            },
        );
    },
);
