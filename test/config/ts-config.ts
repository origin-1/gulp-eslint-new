import js               from '@eslint/js';
import type { Linter }  from 'eslint';

const recommended: Linter.Config = js.configs.recommended;

export default [recommended, { rules: { 'eol-last': 'error', 'no-undef': 'off' } }];
