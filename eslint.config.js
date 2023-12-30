'use strict';

const { createFlatConfig }          = require('@origin-1/eslint-config');
const eslintPluginEslintComments    = require('eslint-plugin-eslint-comments');
const eslintPluginTsdoc             = require('eslint-plugin-tsdoc');
const globals                       = require('globals');

module.exports =
createFlatConfig
(
    {
        ignores: ['**/.*', 'coverage', 'example/demo'],
    },
    {
        files:              ['**/*.js'],
        jsVersion:          2020,
        languageOptions:    { sourceType: 'script' },
    },
    {
        files:              ['test/*.spec.js'],
        languageOptions:    { globals: globals.mocha },
    },
    {
        files:              ['**/*.ts'],
        tsVersion:          '4.2.0',
        languageOptions:    { parserOptions: { project: 'tsconfig.json' } },
        plugins:            { 'tsdoc': eslintPluginTsdoc },
        rules:              { 'tsdoc/syntax': 'error' },
    },
    {
        languageOptions:    { globals: globals.node },
        plugins:            { 'eslint-comments': eslintPluginEslintComments },
        rules:
        {
            'no-throw-literal':                         'off',
            'eslint-comments/disable-enable-pair':      'error',
            'eslint-comments/no-aggregating-enable':    'error',
            'eslint-comments/no-duplicate-disable':     'error',
            'eslint-comments/no-unlimited-disable':     'error',
            'eslint-comments/no-unused-enable':         'error',
        },
    },
);
