import type { ESLint, Linter } from 'eslint';

type ConfigData = Linter.Config;

type ESLintOptions = ESLint.Options;

interface FlatConfig
{
    files?: string[] | undefined;
    ignores?: string[] | undefined;
    languageOptions?: LanguageOptions | undefined;
    linterOptions?:
    {
        noInlineConfig?:                boolean | undefined;
        reportUnusedDisableDirectives?: boolean | undefined;
    };
    name?: string | undefined;
    plugins?: Record<string, Plugin> | undefined;
    processor?: string | Linter.Processor | undefined;
    rules?: Linter.RulesRecord | undefined;
    settings?: Linter.Config['settings'];
}

type FormatterContext = ESLint.LintResultData & ResultsMeta;

type FormatterFunction =
(results: ESLint.LintResult[], context?: FormatterContext) => string | Promise<string>;

type GlobalConf = boolean | 'off' | 'readable' | 'readonly' | 'writable' | 'writeable';

interface LanguageOptions
{
    ecmaVersion?:   number | 'latest' | undefined;
    globals?:       Record<string, GlobalConf> | undefined;
    parser?:        string | Linter.ParserModule | undefined;
    parserOptions?: object | undefined;
    sourceType?:    'script' | 'module' | 'commonjs' | undefined;
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
