import type { ESLint, Linter } from 'eslint';

interface ESLintrcOptions
{
    // File enumeration
    cwd?:                           string | undefined;
    errorOnUnmatchedPattern?:       boolean | undefined;
    extensions?:                    string[] | undefined;
    globInputPaths?:                boolean | undefined;
    ignore?:                        boolean | undefined;
    ignorePath?:                    string | undefined;

    // Linting
    allowInlineConfig?:             boolean | undefined;
    baseConfig?:                    Linter.LegacyConfig | undefined;
    overrideConfig?:                Linter.LegacyConfig | undefined;
    overrideConfigFile?:            string | undefined;
    plugins?:                       Record<string, ESLint.Plugin> | undefined;
    reportUnusedDisableDirectives?: Linter.StringSeverity | undefined;
    resolvePluginsRelativeTo?:      string | undefined;
    rulePaths?:                     string[] | undefined;
    useEslintrc?:                   boolean | undefined;

    // Autofix
    fix?:
    boolean | ((message: Linter.LintMessage) => boolean) | undefined;
    fixTypes?:                      FixType[] | null | undefined;

    // Caching
    cache?:                         boolean | undefined;
    cacheLocation?:                 string | undefined;
    cacheStrategy?:                 ESLint.CacheStrategy | undefined;

    // Unused
    flags?:                         string[] | undefined;
}

type FlatESLintOptions  = ESLint.Options;
type FormatterFunction  = ESLint.FormatterFunction;
type LintMessage        = Linter.LintMessage;
type LintResult         = ESLint.LintResult;
type LintResultData     = ESLint.LintResultData;
type LoadedFormatter    = ESLint.LoadedFormatter;
type ResultsMeta        = ESLint.ResultsMeta;
