/* eslint-env mocha */

'use strict';

const { ESLINT_KEY, organizeOptions }   = require('#util');
const { isEmptyArray }                  = require('./test-util');
const { strict: assert }                = require('assert');

describe('organizeOptions', () => {

    it('should wrap a string config value into "overrideConfigFile"', () => {
        const { eslintOptions, migratedOptions } = organizeOptions('Config/Path');
        assert.deepEqual(eslintOptions, { overrideConfigFile: 'Config/Path' });
        assert(isEmptyArray(migratedOptions));
    });

    it('should migrate "configFile" to "overrideConfigFile"', () => {
        const { eslintOptions, migratedOptions } = organizeOptions({ configFile: 'Config/Path' });
        assert.deepEqual(
            eslintOptions,
            { overrideConfig: { }, overrideConfigFile: 'Config/Path' }
        );
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'configFile', newName: 'overrideConfigFile', formatChanged: false }]
        );
    });

    it('should migrate an "envs" array to an "env" object', () => {
        const { eslintOptions, migratedOptions }
        = organizeOptions({ envs: ['foo:true', 'bar:false', 'baz'] });
        assert.deepEqual(
            eslintOptions,
            { overrideConfig: { env: { foo: true, bar: false, baz: true } } }
        );
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'envs', newName: 'overrideConfig.env', formatChanged: true }]
        );
    });

    it('should migrate "extends"', () => {
        const { eslintOptions, migratedOptions } = organizeOptions({ extends: 'foo' });
        assert.deepEqual(eslintOptions, { overrideConfig: { extends: 'foo' } });
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'extends', newName: 'overrideConfig.extends', formatChanged: false }]
        );
    });

    it('should migrate a "globals" array to an object', () => {
        const { eslintOptions, migratedOptions }
        = organizeOptions({ globals: ['foo:true', 'bar:false', 'baz'] });
        assert.deepEqual(
            eslintOptions,
            { overrideConfig: { globals: { foo: true, bar: false, baz: false } } }
        );
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'globals', newName: 'overrideConfig.globals', formatChanged: true }]
        );
    });

    it('should migrate "ignorePattern" to "ignorePatterns"', () => {
        const { eslintOptions, migratedOptions }
        = organizeOptions({ ignorePattern: ['foo', 'bar', 'baz'] });
        assert.deepEqual(
            eslintOptions,
            { overrideConfig: { ignorePatterns: ['foo', 'bar', 'baz'] } }
        );
        assert.deepEqual(
            migratedOptions,
            [
                {
                    oldName: 'ignorePattern',
                    newName: 'overrideConfig.ignorePatterns',
                    formatChanged: false
                }
            ]
        );
    });

    it('should migrate "parser"', () => {
        const { eslintOptions, migratedOptions } = organizeOptions({ parser: 'foo' });
        assert.deepEqual(eslintOptions, { overrideConfig: { parser: 'foo' } });
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'parser', newName: 'overrideConfig.parser', formatChanged: false }]
        );
    });

    it('should migrate "parserOptions"', () => {
        const { eslintOptions, migratedOptions } = organizeOptions({ parserOptions: 'foo' });
        assert.deepEqual(eslintOptions, { overrideConfig: { parserOptions: 'foo' } });
        assert.deepEqual(
            migratedOptions,
            [
                {
                    oldName: 'parserOptions',
                    newName: 'overrideConfig.parserOptions',
                    formatChanged: false
                }
            ]
        );
    });

    it('should migrate a "plugins" arrays', () => {
        const { eslintOptions, migratedOptions } = organizeOptions({ plugins: ['foo', 'bar'] });
        assert.deepEqual(eslintOptions, { overrideConfig: { plugins: ['foo', 'bar'] } });
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'plugins', newName: 'overrideConfig.plugins', formatChanged: false }]
        );
    });

    it('should not migrate a "plugins" object', () => {
        const { eslintOptions, migratedOptions } = organizeOptions({ plugins: { foo: 'bar' } });
        assert.deepEqual(eslintOptions, { overrideConfig: { }, plugins: { foo: 'bar' } });
        assert(isEmptyArray(migratedOptions));
    });

    it('should migrate "rules"', () => {
        const { eslintOptions, migratedOptions } = organizeOptions({ rules: 'foo' });
        assert.deepEqual(eslintOptions, { overrideConfig: { rules: 'foo' } });
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'rules', newName: 'overrideConfig.rules', formatChanged: false }]
        );
    });

    it('should migrate "warnFileIgnored"', () => {
        const { migratedOptions, warnIgnored } = organizeOptions({ warnFileIgnored: true });
        assert.equal(warnIgnored, true);
        assert.deepEqual(
            migratedOptions,
            [{ oldName: 'warnFileIgnored', newName: 'warnIgnored', formatChanged: false }]
        );
    });

    it('should migrate undefined legacy options', () => {
        const { eslintOptions, migratedOptions }
        = organizeOptions(
            {
                configFile:     undefined,
                envs:           undefined,
                extends:        undefined,
                globals:        undefined,
                ignorePattern:  undefined,
                parser:         undefined,
                parserOptions:  undefined,
                rules:          undefined
            }
        );
        assert.deepEqual(
            eslintOptions,
            {
                overrideConfig: {
                    env:            undefined,
                    extends:        undefined,
                    globals:        undefined,
                    ignorePatterns: undefined,
                    parser:         undefined,
                    parserOptions:  undefined,
                    rules:          undefined
                },
                overrideConfigFile: undefined
            }
        );
        assert.deepEqual(
            migratedOptions.map(({ oldName }) => oldName),
            [
                'configFile',
                'envs',
                'extends',
                'globals',
                'ignorePattern',
                'parser',
                'parserOptions',
                'rules'
            ]
        );
    });

    it('should return a custom value for ESLint', () => {
        const expected = { };
        const { ESLint: actual } = organizeOptions({ [ESLINT_KEY]: expected });
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
            () => organizeOptions(options),
            ({ code, message }) =>
                code === 'ESLINT_INVALID_OPTIONS'
                && message.includes(Object.keys(options).join(', '))
        );
    });

    it('should fail if "overrideConfig" is not an object or null', () => {
        assert.throws(
            () => organizeOptions({ overrideConfig: 'foo' }),
            ({ code, message }) =>
                code === 'ESLINT_INVALID_OPTIONS' && /\boverrideConfig\b/.test(message)
        );
    });

    it('should fail if "envs" is not an array or falsy', () => {
        assert.throws(
            () => organizeOptions({ envs: 'foo' }),
            ({ code, message }) =>
                code === 'ESLINT_INVALID_OPTIONS' && /\benvs\b/.test(message)
        );
    });

    it('should fail if "globals" is not an array or falsy', () => {
        assert.throws(
            () => organizeOptions({ globals: { } }),
            ({ code, message }) =>
                code === 'ESLINT_INVALID_OPTIONS' && /\bglobals\b/.test(message)

        );
    });

    it('should not modify an existing overrideConfig', () => {
        const options = { overrideConfig: { }, parser: 'foo' };
        organizeOptions(options);
        assert.deepEqual(options.overrideConfig, { });
    });

});
