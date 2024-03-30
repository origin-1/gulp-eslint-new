'use strict';

// npm install -D eslint@8 gulp gulp-eslint-new

const { series, src } = require('gulp');
const gulpESLintNew   = require('gulp-eslint-new');

/**
 * Simple example of using ESLint and a formatter.
 * Note: ESLint does not write to the console itself.
 * Use `format` or `formatEach` to print ESLint results.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function basic()
{
    return src('demo/**/*.js')
    // Default: use local linting config.
    .pipe(gulpESLintNew())
    // Format ESLint results and print them to the console.
    .pipe(gulpESLintNew.format());
}

/**
 * Inline ESLint configuration.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function inlineConfig()
{
    return src('demo/**/*.js')
    .pipe
    (
        gulpESLintNew
        (
            {
                overrideConfig:
                {
                    rules:
                    {
                        'no-alert':             0,
                        'no-bitwise':           0,
                        'camelcase':            1,
                        'curly':                1,
                        'eqeqeq':               0,
                        'no-eq-null':           0,
                        'guard-for-in':         1,
                        'no-empty':             1,
                        'no-use-before-define': 0,
                        'no-obj-calls':         2,
                        'no-unused-vars':       0,
                        'new-cap':              1,
                        'no-shadow':            0,
                        'strict':               2,
                        'no-invalid-regexp':    2,
                        'comma-dangle':         2,
                        'no-undef':             1,
                        'no-new':               1,
                        'no-extra-semi':        1,
                        'no-debugger':          2,
                        'no-caller':            1,
                        'semi':                 1,
                        'quotes':               0,
                        'no-unreachable':       2,
                    },
                    globals:    { $: 'readonly' },
                    env:        { 'node': true },
                },
                warnIgnored: true,
            },
        ),
    )
    .pipe(gulpESLintNew.format());
}

/**
 * Load configuration file.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function loadConfig()
{
    return src('demo/**/*.js')
    .pipe
    (
        gulpESLintNew
        (
            {
                // Load a specific ESLint config.
                overrideConfigFile: 'custom-config/eslintrc-config.json',
            },
        ),
    )
    .pipe(gulpESLintNew.format());
}

/**
 * Shorthand way to load a configuration file.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function loadConfigShorthand()
{
    return src('demo/**/*.js')
    // Load a specific ESLint config
    .pipe(gulpESLintNew('custom-config/eslintrc-config.json'))
    .pipe(gulpESLintNew.format());
}

/**
 * The default task will run all above tasks.
 */
module.exports =
{
    'default':
    series
    (
        basic,
        inlineConfig,
        loadConfig,
        loadConfigShorthand,
        async () => // eslint-disable-line require-await
        {
            console.log('All tasks completed successfully.');
        },
    ),
    'basic':                    basic,
    'inline-config':            inlineConfig,
    'load-config':              loadConfig,
    'load-config-shorthand':    loadConfigShorthand,
};
