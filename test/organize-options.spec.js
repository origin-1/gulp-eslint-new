'use strict';

const { ESLINT_PKG, organizeOptions }   = require('#util');
const { strict: assert }                = require('assert');

describe
(
    'organizeOptions',
    () =>
    {
        function testCwd(configType)
        {
            it
            (
                'should use the current directory as `cwd` if "cwd" is undefined',
                () =>
                {
                    const { eslintOptions } =
                    organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', configType });
                    assert.equal(eslintOptions.cwd, process.cwd());
                },
            );

            it
            (
                'should normalize "cwd"',
                () =>
                {
                    const cwd = `${process.cwd()}/foo/..`;
                    const { eslintOptions } =
                    organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', configType, cwd });
                    assert.equal(eslintOptions.cwd, process.cwd());
                },
            );

            it
            (
                'should not fail if "cwd" is invalid',
                () =>
                {
                    const { eslintOptions } =
                    organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', configType, cwd: null });
                    assert.equal(eslintOptions.cwd, null);
                },
            );
        }

        it
        (
            'should wrap a string config value into "overrideConfigFile"',
            () =>
            {
                const { eslintOptions } = organizeOptions('Config/Path');
                assert.equal(eslintOptions.cwd, process.cwd());
                assert.equal(eslintOptions.overrideConfigFile, 'Config/Path');
            },
        );

        describe
        (
            'with "configType" "eslintrc"',
            () => { testCwd('eslintrc'); },
        );

        describe
        (
            'with "configType" "flat"',
            () => { testCwd('flat'); },
        );

        it
        (
            'should throw an error if the current version of ESLint does not support eslintrc ' +
            'config with "configType" "eslintrc"',
            () =>
            {
                assert.throws
                (() => organizeOptions({ [ESLINT_PKG]: 'eslint-10.0', configType: 'eslintrc' }));
            },
        );

        it
        (
            'should throw an error if the current version of ESLint does not support flat config ' +
            'with "configType" "flat"',
            () =>
            {
                assert.throws
                (() => organizeOptions({ [ESLINT_PKG]: 'eslint-8.0', configType: 'flat' }));
            },
        );

        it
        (
            'should not fail with an undefined argument',
            () =>
            {
                assert.doesNotThrow(() => organizeOptions());
                assert.doesNotThrow(() => organizeOptions(undefined));
            },
        );

        it
        (
            'should fail if a forbidden option is specified',
            () =>
            {
                const options =
                {
                    cache:                      true,
                    cacheFile:                  '\0',
                    cacheLocation:              '\0',
                    cacheStrategy:              'metadata',
                    concurrency:                'off',
                    errorOnUnmatchedPattern:    true,
                    extensions:                 [],
                    globInputPaths:             false,
                    passOnNoPatterns:           false,
                };
                assert.throws
                (
                    () => organizeOptions(options),
                    ({ code, message }) =>
                    code === 'ESLINT_INVALID_OPTIONS' &&
                    message.includes(Object.keys(options).join(', ')),
                );
            },
        );

        it
        (
            'should fail if "configType" is not a valid value',
            () =>
            {
                assert.throws
                (
                    () => organizeOptions({ configType: 'foo' }),
                    ({ message }) => /\bconfigType\b/.test(message),
                );
            },
        );

        it
        (
            'should fail if "quiet" is not a valid value',
            () =>
            {
                assert.throws
                (
                    () => organizeOptions({ quiet: 'foo' }),
                    ({ message }) => /\bquiet\b/.test(message),
                );
            },
        );

        describe
        (
            '"fix" with "quiet"',
            () =>
            {
                it
                (
                    'should not change "fix" when "quiet" is false',
                    () =>
                    {
                        const { eslintOptions } =
                        organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', fix: true, quiet: false });
                        assert.equal(eslintOptions.fix, true);
                    },
                );

                it
                (
                    'should not change "fix" when autofix is not enabled',
                    () =>
                    {
                        {
                            const { eslintOptions } =
                            organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', quiet: true });
                            assert(!('fix' in eslintOptions));
                        }
                        {
                            const { eslintOptions } =
                            organizeOptions
                            ({ [ESLINT_PKG]: 'eslint-8.x', fix: false, quiet: true });
                            assert.equal(eslintOptions.fix, false);
                        }
                    },
                );

                it
                (
                    'should not change "fix" when "fix" is invalid',
                    () =>
                    {
                        const { eslintOptions } =
                        organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', fix: 'foo', quiet: true });
                        assert.equal(eslintOptions.fix, 'foo');
                    },
                );

                it
                (
                    'should fix only errors when "quiet" is true and "fix" is true',
                    () =>
                    {
                        const { eslintOptions } =
                        organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', fix: true, quiet: true });
                        const { fix } = eslintOptions;
                        assert.equal(typeof fix, 'function');
                        assert.equal(fix({ severity: 2 }), true);
                        assert.equal(fix({ severity: 1 }), false);
                    },
                );

                it
                (
                    'should fix only filtered messages when "quiet" is a function',
                    () =>
                    {
                        const quietArgs = [];
                        const quiet =
                        (...args) =>
                        {
                            quietArgs.push(args);
                            return args[0].ruleId === 'foo' ? 'truthy' : '';
                        };
                        const { eslintOptions } =
                        organizeOptions({ [ESLINT_PKG]: 'eslint-8.x', fix: true, quiet });
                        const { fix } = eslintOptions;
                        assert.equal(typeof fix, 'function');
                        const fooMessage = { ruleId: 'foo' };
                        const barMessage = { ruleId: 'bar' };
                        assert(fix(fooMessage));
                        assert(!fix(barMessage));
                        assert.deepEqual(quietArgs, [[fooMessage], [barMessage]]);
                    },
                );

                it
                (
                    'should fix only filtered errors when "quiet" is true and "fix" is a function',
                    () =>
                    {
                        const fixArgs = [];
                        const fixOption =
                        (...args) =>
                        {
                            fixArgs.push(args);
                            return args[0].ruleId === 'foo';
                        };
                        const { eslintOptions } =
                        organizeOptions
                        ({ [ESLINT_PKG]: 'eslint-8.x', fix: fixOption, quiet: true });
                        const { fix } = eslintOptions;
                        assert.equal(typeof fix, 'function');
                        const fooError = { ruleId: 'foo', severity: 2 };
                        const barError = { ruleId: 'bar', severity: 2 };
                        const fooWarning = { ruleId: 'foo', severity: 1 };
                        assert(fix(fooError));
                        assert(!fix(barError));
                        assert(!fix(fooWarning));
                        assert.deepEqual(fixArgs, [[fooError], [barError]]);
                    },
                );
            },
        );

        it
        (
            'should fail if "warnIgnored" is not a valid value',
            () =>
            {
                assert.throws
                (
                    () => organizeOptions({ warnIgnored: 'foo' }),
                    ({ message }) => /\bwarnIgnored\b/.test(message),
                );
            },
        );

        it
        (
            'should not fail if "overrideConfig" is invalid',
            () =>
            {
                const { eslintOptions } = organizeOptions({ overrideConfig: 'foo' });
                assert.equal(eslintOptions.overrideConfig, 'foo');
            },
        );

        it
        (
            'should not modify the properties of a specified "overrideConfig" object',
            () =>
            {
                const overrideConfig = { foo: 'bar' };
                const options = { overrideConfig, parser: 'baz' };
                organizeOptions(options);
                assert.equal(options.overrideConfig, overrideConfig);
                assert.deepEqual(overrideConfig, { foo: 'bar' });
            },
        );

        it
        (
            'should preserve "overrideConfig" with "configType" "flat"',
            () =>
            {
                const overrideConfig = { root: true };
                const { eslintOptions } =
                organizeOptions({ configType: 'flat', overrideConfig, parser: 'foo' });
                assert.equal(eslintOptions.overrideConfig, overrideConfig);
            },
        );
    },
);
