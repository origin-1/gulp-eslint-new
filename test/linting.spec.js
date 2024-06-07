'use strict';

const { ESLINT_PKG }        = require('#util');

const { createVinylDirectory, createVinylFile, finishStream, isESLint9Supported, isEmptyArray } =
require('./test-util');

const { strict: assert }    = require('assert');
const gulpESLintNew         = require('gulp-eslint-new');
const { join, resolve }     = require('path');
const { satisfies }         = require('semver');
const { Readable }          = require('stream');
const VinylFile             = require('vinyl');

async function testConfig(options)
{
    const filePath = 'file.js';
    const file = createVinylFile(filePath, 'var foo = bar(\'Hi\');');
    await finishStream(gulpESLintNew(options).end(file));
    assert.equal(file.eslint.filePath, file.path);
    assert(Array.isArray(file.eslint.messages));
    assert.equal(file.eslint.messages.length, 2);
    const [message1, message2] = file.eslint.messages;
    assert.equal(typeof message1.message, 'string');
    assert.equal(message1.line, 1);
    assert.equal(typeof message1.column, 'number');
    assert.equal(message1.ruleId, 'no-unused-vars');
    assert.equal(message1.severity, 2);
    assert.equal(typeof message2.message, 'string');
    assert.equal(message2.line, 1);
    assert.equal(typeof message2.column, 'number');
    assert.equal(message2.ruleId, 'eol-last');
    assert.equal(message2.severity, 2);
}

async function testIgnoreByPath(options, dataList)
{
    const stream = gulpESLintNew(options);
    for (const data of dataList)
    {
        const file = data.file =
        createVinylFile(join('__CWD__', data.filePath), '');
        stream.write(file);
    }
    await finishStream(stream.end());
    for (const { file, filePath, expectdMessage } of dataList)
    {
        const message = `for file "${filePath}"`;
        assert.equal(file.eslint.filePath, file.path, message);
        assert(Array.isArray(file.eslint.messages, message));
        assert.equal(file.eslint.messages.length, 1, message);
        assert.equal(file.eslint.messages[0].message, expectdMessage, message);
        assert.equal(file.eslint.errorCount, 0, message);
        assert.equal(file.eslint.warningCount, 1, message);
        assert.equal(file.eslint.fixableErrorCount, 0, message);
        assert.equal(file.eslint.fixableWarningCount, 0, message);
        assert.equal(file.eslint.fatalErrorCount, 0, message);
    }
}

describe
(
    'gulp-eslint-new plugin',
    () =>
    {
        function testCommonLinting(eslintPkg, useEslintrcConfig)
        {
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
                        [ESLINT_PKG]:   eslintPkg,
                        baseConfig:
                        { rules: { 'no-sync': 1, 'no-var': 2, 'strict': [2, 'global'] } },
                        configType:     'eslintrc',
                        useEslintrc:    false,
                    } :
                    {
                        [ESLINT_PKG]:       eslintPkg,
                        configType:         'flat',
                        overrideConfig:
                        {
                            languageOptions: { sourceType: 'script' },
                            rules:
                            { 'no-sync': 1, 'no-var': 2, 'strict': [2, 'global'] },
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
                    const eslintVersion = file._eslintInfo.eslint.version;
                    if (satisfies(eslintVersion, useEslintrcConfig ? '>=8.8' : '>=8.23'))
                    {
                        assert.equal(file.eslint.suppressedMessages.length, 1);
                        assert.equal(file.eslint.suppressedMessages[0].ruleId, 'strict');
                    }
                    assert.deepEqual
                    (file.eslint.usedDeprecatedRules, [{ replacedBy: [], ruleId: 'no-sync' }]);
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
                            { [ESLINT_PKG]: eslintPkg, configType: 'eslintrc', overrideConfig } :
                            { [ESLINT_PKG]: eslintPkg, configType: 'flat', overrideConfig };
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
                                [ESLINT_PKG]:       eslintPkg,
                                configType:         'eslintrc',
                                overrideConfigFile: join(__dirname, 'config/eslintrc-config.js'),
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_PKG]:       eslintPkg,
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
                                [ESLINT_PKG]:       eslintPkg,
                                configType:         'eslintrc',
                                cwd:                __dirname,
                                overrideConfigFile: 'config/eslintrc-config.js',
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_PKG]:       eslintPkg,
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
                                [ESLINT_PKG]:       eslintPkg,
                                baseConfig:         { rules: { 'no-trailing-spaces': 2 } },
                                configType:         'eslintrc',
                                fix:                true,
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_PKG]:       eslintPkg,
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
                                [ESLINT_PKG]:       eslintPkg,
                                baseConfig:         { rules: { 'no-trailing-spaces': 2 } },
                                configType:         'eslintrc',
                                fix:                ({ line }) => line > 1,
                                useEslintrc:        false,
                            } :
                            {
                                [ESLINT_PKG]:       eslintPkg,
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
                            { [ESLINT_PKG]: eslintPkg, configType: 'eslintrc', fix: null } :
                            { [ESLINT_PKG]: eslintPkg, configType: 'flat', fix: null };
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

        function testEslintrcLinting(eslintPkg)
        {
            it
            (
                'should ignore files by path',
                async () =>
                {
                    const options =
                    {
                        [ESLINT_PKG]:       eslintPkg,
                        configType:         'eslintrc',
                        cwd:                resolve('__CWD__'),
                        baseConfig:         { ignorePatterns: ['ignored-*'] },
                        useEslintrc:        false,
                        warnIgnored:        true,
                    };
                    const dataList =
                    [
                        {
                            filePath: '.git/file1.js',
                            expectdMessage:
                            'File ignored by default. Use a negated ignore pattern (like ' +
                            '"!<relative/path/to/filename>") to override.',
                        },
                        {
                            filePath: 'node_modules/file2.js',
                            expectdMessage:
                            'File ignored by default. Use a negated ignore pattern like ' +
                            '"!**/node_modules/*" to override.',
                        },
                        {
                            filePath: 'node_modules_bak/ignored-file3.js',
                            expectdMessage:
                            'File ignored because of a matching ignore pattern. Set "ignore" ' +
                            'option to false to override.',
                        },
                        {
                            filePath: '.file4.js',
                            expectdMessage:
                            'File ignored by default. Use a negated ignore pattern (like ' +
                            '"!<relative/path/to/filename>") to override.',
                        },
                    ];
                    await testIgnoreByPath(options, dataList);
                },
            );

            describe
            (
                '.eslintignore',
                () =>
                {
                    it
                    (
                        'should ignore a file',
                        async () =>
                        {
                            const file = createVinylFile('ignored.js', '');
                            await finishStream
                            (
                                gulpESLintNew
                                (
                                    {
                                        [ESLINT_PKG]:   eslintPkg,
                                        configType:     'eslintrc',
                                        cwd:            resolve('eslintignore'),
                                        useEslintrc:    false,
                                    },
                                )
                                .end(file),
                            );
                            assert(!file.eslint);
                        },
                    );

                    it
                    (
                        'should unignore a file',
                        async () =>
                        {
                            const file =
                            createVinylFile('project/node_modules/dependency/index.js', '');
                            await finishStream
                            (
                                gulpESLintNew
                                (
                                    {
                                        [ESLINT_PKG]:   eslintPkg,
                                        configType:     'eslintrc',
                                        cwd:            resolve('eslintignore'),
                                        useEslintrc:    false,
                                    },
                                )
                                .end(file),
                            );
                            assert(file.eslint);
                        },
                    );
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
                        [ESLINT_PKG]:                   eslintPkg,
                        configType:                     'eslintrc',
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
                                [ESLINT_PKG]:   eslintPkg,
                                configType:     'eslintrc',
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
                                    [ESLINT_PKG]:   eslintPkg,
                                    baseConfig:
                                    { extends: join(__dirname, 'config/eslintrc-config.js') },
                                    configType:     'eslintrc',
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
                                    [ESLINT_PKG]:   eslintPkg,
                                    baseConfig:     { extends: './config/eslintrc-config.js' },
                                    configType:     'eslintrc',
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
                                    [ESLINT_PKG]:   eslintPkg,
                                    baseConfig:     { extends: '~shareable/eslintrc-config' },
                                    configType:     'eslintrc',
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
                            (
                                gulpESLintNew
                                (
                                    {
                                        [ESLINT_PKG]:   eslintPkg,
                                        configType:     'eslintrc',
                                        useEslintrc:    true,
                                    },
                                )
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
                        },
                    );

                    it
                    (
                        'when false, should ignore a configuration file',
                        async () =>
                        {
                            const file = createVinylFile('semi/file.js', '$()');
                            await finishStream
                            (
                                gulpESLintNew
                                (
                                    {
                                        [ESLINT_PKG]:   eslintPkg,
                                        configType:     'eslintrc',
                                        useEslintrc:    false,
                                    },
                                )
                                .end(file),
                            );
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
                                    [ESLINT_PKG]:       eslintPkg,
                                    configType:         'eslintrc',
                                    overrideConfig:     { plugins: [pluginName] },
                                    useEslintrc:        false,
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

        function testFlatLinting(eslintPkg)
        {
            it
            (
                'should ignore files by path',
                async () =>
                {
                    const options =
                    {
                        [ESLINT_PKG]:       eslintPkg,
                        configType:         'flat',
                        cwd:                resolve('__CWD__'),
                        overrideConfigFile: true,
                        warnIgnored:        true,
                    };
                    const dataList =
                    [
                        {
                            filePath: '.git/file1.js',
                            expectdMessage:
                            'File ignored. If this file is matched by a global ignore pattern, ' +
                            'it can be unignored by setting the "ignore" option to false.',
                        },
                        {
                            filePath: 'node_modules/file2.js',
                            expectdMessage:
                            'File ignored by default because it is located under the ' +
                            'node_modules directory. Use ignore pattern "!**/node_modules/**" to ' +
                            'override.',
                        },
                        {
                            filePath: 'node_modules_bak/file3',
                            expectdMessage:
                            'File ignored. If this file is matched by a global ignore pattern, ' +
                            'it can be unignored by setting the "ignore" option to false.',
                        },
                        {
                            filePath:       '../file4.js',
                            expectdMessage: 'File ignored because outside of base path.',
                        },
                        {
                            filePath: 'file5.ts',
                            expectdMessage:
                            'File ignored. If this file is matched by a global ignore pattern, ' +
                            'it can be unignored by setting the "ignore" option to false.',
                        },
                    ];
                    await testIgnoreByPath(options, dataList);
                },
            );

            it
            (
                'should unignore a file',
                async () =>
                {
                    const file = createVinylFile('project/node_modules/dependency/index.js', '');
                    await finishStream
                    (
                        gulpESLintNew
                        (
                            {
                                [ESLINT_PKG]:       eslintPkg,
                                configType:         'flat',
                                overrideConfig:     { ignores: ['!**/node_modules/**'] },
                                overrideConfigFile: true,
                            },
                        )
                        .end(file),
                    );
                    assert(file.eslint);
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
                await finishStream(gulpESLintNew('semi/.eslintrc.js').end(file));
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
            'should ignore files with null content',
            async () =>
            {
                const file = createVinylDirectory();
                await finishStream(gulpESLintNew().end(file));
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
                    finishStream(gulpESLintNew().end(file)),
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
                                    { rules: { 'no-octal': 2, 'no-undef': 1, 'semi-style': 1 } },
                                    configType:     'eslintrc',
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
                            [{ replacedBy: [], ruleId: 'semi-style' }],
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
                                    {
                                        rules:
                                        { 'no-octal': 2, 'no-undef': 1, 'semi-style': 1 },
                                    },
                                    configType:     'eslintrc',
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
                            [{ replacedBy: [], ruleId: 'semi-style' }],
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
                    'when not specified, should not warn about an ignored file',
                    async () =>
                    {
                        const file = createVinylFile('node_modules/file.js', '');
                        await finishStream
                        (gulpESLintNew({ configType: 'eslintrc', useEslintrc: false }).end(file));
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
                testCommonLinting('eslint-8.0', true);
                testEslintrcLinting('eslint-8.0');
            },
        );

        describe
        (
            'with ESLint 8.x',
            () =>
            {
                testCommonLinting('eslint-8.x', true);
                testEslintrcLinting('eslint-8.x');
            },
        );

        describe
        (
            'with FlatESLint 8.21',
            () =>
            {
                testCommonLinting('eslint-8.21', false);
                testFlatLinting('eslint-8.21');
            },
        );

        describe
        (
            'with FlatESLint 8.x',
            () =>
            {
                testCommonLinting('eslint-8.x', false);
                testFlatLinting('eslint-8.x');

                it
                (
                    '"reportUnusedDisableDirectives" linter option should be considered',
                    async () =>
                    {
                        const file = createVinylFile('file.js', '// eslint-disable-line');
                        const options =
                        {
                            [ESLINT_PKG]:       'eslint-8.x',
                            baseConfig:
                            { linterOptions: { reportUnusedDisableDirectives: true } },
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

        const describe_v9 = isESLint9Supported ? describe : describe.skip;

        describe_v9
        (
            'with ESLint 9.x',
            () =>
            {
                testCommonLinting('eslint-9.x', false);
                testFlatLinting('eslint-9.x');

                it
                (
                    '"reportUnusedDisableDirectives" linter option should be considered',
                    async () =>
                    {
                        const file = createVinylFile('file.js', '// eslint-disable-line');
                        const options =
                        {
                            [ESLINT_PKG]:       'eslint-9.x',
                            baseConfig:
                            { linterOptions: { reportUnusedDisableDirectives: 'error' } },
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
                        assert.equal(message.severity, 2);
                    },
                );
            },
        );

        describe_v9
        (
            'with LegacyESLint 9.x',
            () =>
            {
                testCommonLinting('eslint-9.x', true);
                testEslintrcLinting('eslint-9.x');
            },
        );
    },
);
