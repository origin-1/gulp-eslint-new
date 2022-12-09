'use strict';

// npm install @eslint/eslintrc globals gulp gulp-eslint-new

const globals         = require('globals');
const { series, src } = require('gulp');
const gulpESLintNew   = require('gulp-eslint-new');
const { join }        = require('path');

/**
 * Simple example of using ESLint and a formatter.
 * Note: ESLint does not write to the console itself.
 * Use `format` or `formatEach` to print ESLint results.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function basic() {
    return src('demo/**/*.js')
    // Default: use local linting config.
    .pipe(gulpESLintNew({
        configType: 'flat',
        cwd:        join(__dirname, 'demo'),  // Directory containing "eslint.config.js".
    }))
    // Format ESLint results and print them to the console.
    .pipe(gulpESLintNew.format());
}

/**
 * Inline ESLint configuration.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function inlineConfig() {
    return src('demo/**/*.js')
    .pipe(gulpESLintNew({
        configType:         'flat',
        overrideConfig:
        {
            rules:              {
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
            languageOptions:    { globals: { $: 'readonly', ...globals.node } },
        },
        overrideConfigFile: 'demo/eslint.config.js',
        warnIgnored:        true,
    }))
    .pipe(gulpESLintNew.format());
}

/**
 * Load eslintrc configuration file.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function loadConfig() {
    const { FlatCompat } = require('@eslint/eslintrc');
    const compat = new FlatCompat({ baseDirectory: __dirname });
    return src('demo/**/*.js')
    .pipe(gulpESLintNew({
        configType:     'flat',
        cwd:            join(__dirname, 'demo'), // Directory containing "eslint.config.js".
        // Load a specific eslintrc config.
        overrideConfig: compat.config(require(join(__dirname, 'eslint-custom-config.json'))),
    }))
    .pipe(gulpESLintNew.format());
}

/**
 * Load flat configuration file.
 *
 * @returns {NodeJS.ReadWriteStream} gulp file stream.
 */
function loadFlatConfig() {
    return src('demo/**/*.js')
    .pipe(gulpESLintNew({
        configType:         'flat',
        // Load a specific flat config.
        overrideConfigFile: 'eslint-custom-flat-config.js',
    }))
    .pipe(gulpESLintNew.format());
}

/**
 * The default task will run all above tasks.
 */
module.exports =
{
    'default':
    series(
        basic,
        inlineConfig,
        loadConfig,
        loadFlatConfig,
        async () => { // eslint-disable-line require-await
            console.log('All tasks completed successfully.');
        },
    ),
    'basic':            basic,
    'inline-config':    inlineConfig,
    'load-config':      loadConfig,
    'load-flat-config': loadFlatConfig,
};