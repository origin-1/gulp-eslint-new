'use strict';

const { createConfig } = require('@origin-1/eslint-config');

const config =
createConfig
(
    {
        files:      '*.js',
        jsVersion:  2020,
    },
    {
        files:          '*.ts',
        tsVersion:      '4.2.0',
        parserOptions:  { project: 'tsconfig.json' },
        plugins:        ['tsdoc'],
        rules:          { 'tsdoc/syntax': 'error' },
    },
    {
        files:      ['*.js', '*.ts'],
        env:        { node: true },
        extends:    'plugin:eslint-comments/recommended',
        rules:      { 'no-throw-literal': 'off' },
    },
);

config.ignorePatterns = ['/coverage', '/example/demo'];

module.exports = config;
