import type { ESLint, Linter, Rule } from 'eslint';

type ConfigData = Linter.Config;

type ESLintOptions =
Omit<
    ESLint.Options,
    | 'baseConfig'
    | 'fixTypes'
    | 'overrideConfig'
    | 'overrideConfigFile'
    | 'plugins'
    | 'reportUnusedDisableDirectives'
    | 'resolvePluginsRelativeTo'
> &
{
    baseConfig?:                    Linter.Config | null | undefined;
    fixTypes?:                      Rule.RuleMetaData['type'][] | null | undefined;
    overrideConfig?:                Linter.Config | null | undefined;
    overrideConfigFile?:            string | null | undefined;
    plugins?:                       Record<string, ESLint.Plugin> | null | undefined;
    reportUnusedDisableDirectives?: Linter.StringSeverity | null | undefined;
    resolvePluginsRelativeTo?:      string | null | undefined;
};

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
    plugins?:           Record<string, ESLint.Plugin>;
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
    parser?:        Linter.ParserModule;
    parserOptions?: Linter.ParserOptions;
    sourceType?:    'script' | 'module' | 'commonjs';
}

type LintMessage = Linter.LintMessage;

type LintResult = ESLint.LintResult;

interface LoadedFormatter
{ format(results: ESLint.LintResult[], resultsMeta: ResultsMeta): string | Promise<string>; }

interface ResultsMeta
{
    maxWarningsExceeded?:
    {
        foundWarnings: number;
        maxWarnings: number;
    };
}
