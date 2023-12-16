'use strict';

const js = require('@eslint/js');

module.exports = [js.configs.recommended, { rules: { 'eol-last': 'error', 'no-undef': 'off' } }];
