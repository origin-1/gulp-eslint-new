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
                    const { eslintOptions } = organizeOptions({ configType });
                    assert.equal(eslintOptions.cwd, process.cwd());
                },
            );

            it
            (
                'should normalize "cwd"',
                () =>
                {
                    const cwd = `${process.cwd()}/foo/..`;
                    const { eslintOptions } = organizeOptions({ configType, cwd });
                    assert.equal(eslintOptions.cwd, process.cwd());
                },
            );

            it
            (
                'should not fail if "cwd" is invalid',
                () =>
                {
                    const { eslintOptions } = organizeOptions({ configType, cwd: null });
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
