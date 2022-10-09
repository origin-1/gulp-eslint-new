import { ESLint, Linter } from 'eslint';

type ConfigData = Linter.Config;

type ESLintOptions = ESLint.Options;

type FormatterContext = ESLint.LintResultData & ResultsMeta;

type FormatterFunction =
(results: ESLint.LintResult[], context?: FormatterContext) => string | Promise<string>;

type LintMessage = Linter.LintMessage;

type LintResult = ESLint.LintResult;

interface LoadedFormatter {
    format(results: ESLint.LintResult[], resultsMeta: ResultsMeta): string | Promise<string>;
}

interface ResultsMeta {
    maxWarningsExceeded?: {
        foundWarnings: number;
        maxWarnings: number;
    };
}
