'use strict';

const { createConfig }  = require('@origin-1/eslint-config');
const eslintPluginTsdoc = require('eslint-plugin-tsdoc');
const globals           = require('globals');

module.exports =
createConfig
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
        rules:              { 'no-throw-literal': 'off' },
    },
);
