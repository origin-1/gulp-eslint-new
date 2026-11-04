'use strict';

const { createConfig }      = require('@origin-1/eslint-config');
const eslintPluginOrigin1   = require('@origin-1/eslint-plugin');
const eslintPluginTsdoc     = require('eslint-plugin-tsdoc');
const globals               = require('globals');

module.exports =
createConfig
(
    { ignores: ['**/.*/**', 'coverage', 'example/demo'] },
    {
        files:              ['**/*.js'],
        ignores:            ['lib'],
        jsVersion:          2020,
    },
    {
        files:              ['lib/**/*.js'],
        jsVersion:          2019,
    },
    {
        files:              ['test/*.spec.js'],
        languageOptions:    { globals: globals.mocha },
    },
    {
        files:              ['**/*.js'],
        languageOptions:    { globals: globals.node, sourceType: 'script' },
        plugins:            { globals: globals.node },
        rules:              { 'no-throw-literal': 'off' },
    },
    {
        files:              ['**/*.ts'],
        tsVersion:          '5.0.0',
        plugins:            { 'tsdoc': eslintPluginTsdoc },
        rules:              { 'tsdoc/syntax': 'error' },
    },
    {
        files:              ['**/*.json', '**/.eslintrc'],
        jsonVersion:        'standard',
    },
    {
        files:              ['tsconfig.json'],
        language:           'json/jsonc',
        languageOptions:    { allowTrailingCommas: true },
    },
    {
        files:              ['package.json'],
        plugins:            { '@origin-1': eslintPluginOrigin1 },
        rules:              { '@origin-1/package-json-fields': 'error' },
    },
);
