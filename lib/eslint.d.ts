import type { ESLint, Linter } from 'eslint';

type ConfigData = Linter.Config;

type ESLintOptions = ESLint.Options;

interface FlatConfig
{
    files?:             string[];
    ignores?:           string[];
    languageOptions?:   LanguageOptions;
    linterOptions?:
    {
        noInlineConfig?:                boolean;
        reportUnusedDisableDirectives?: boolean;
    };
    name?:              string;
    plugins?:           Record<string, Plugin>;
    processor?:         string | Linter.Processor;
    rules?:             Linter.RulesRecord;
    settings?:          Record<string, unknown>;
}

type FormatterContext = ESLint.LintResultData & ResultsMeta;

type FormatterFunction =
(results: ESLint.LintResult[], context?: FormatterContext) => string | Promise<string>;

type GlobalConf = boolean | 'off' | 'readable' | 'readonly' | 'writable' | 'writeable';

interface LanguageOptions
{
    ecmaVersion?:   number | 'latest';
    globals?:       Record<string, GlobalConf>;
    parser?:        string | Linter.ParserModule;
    parserOptions?: Linter.ParserOptions;
    sourceType?:    'script' | 'module' | 'commonjs';
}

type LintMessage = Linter.LintMessage;

type LintResult = ESLint.LintResult;

interface LoadedFormatter
{ format(results: ESLint.LintResult[], resultsMeta: ResultsMeta): string | Promise<string>; }

type Plugin = ESLint.Plugin & { parsers?: Record<string, Linter.ParserModule> | undefined; };

interface ResultsMeta
{
    maxWarningsExceeded?:
    {
        foundWarnings: number;
        maxWarnings: number;
    };
}
