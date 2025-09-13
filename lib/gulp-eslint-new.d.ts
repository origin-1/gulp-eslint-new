import type { TransformCallback }   from 'node:stream';
import type * as eslint             from './eslint';
import 'node';

type Awaitable<T = unknown> = T | PromiseLike<T>;

type ESLintrcOptions    = eslint.ESLintrcOptions;
type FlatESLintOptions  = eslint.FlatESLintOptions;
type LintMessage        = eslint.LintMessage;

type LintResultStreamFunction<Type> =
((action: (value: Type, callback: TransformCallback) => void) => NodeJS.ReadWriteStream) &
((action: (value: Type) => Awaitable) => NodeJS.ReadWriteStream);

declare namespace gulpESLintNew
{
    interface AdditionalOptions
    {
        quiet?:
        | boolean
        | ((message: LintMessage, index: number, list: LintMessage[]) => unknown)
        | undefined;

        warnIgnored?: boolean | undefined;
    }

    /** @deprecated Use type {@link eslint.LintResultData|`ESLint.LintResultData`}. */
    type FormatterContext = eslint.LintResultData;

    type FormatterFunction = eslint.FormatterFunction;

    interface GulpESLintNew
    {
        /**
         * Append ESLint result to each file.
         *
         * @param options - Options for gulp-eslint-new.
         * @returns gulp file stream.
         */
        (options?: GulpESLintNewOptions): NodeJS.ReadWriteStream;

        /**
         * Append ESLint result to each file.
         *
         * @param overrideConfigFile - The path to a configuration file.
         * @returns gulp file stream.
         */
        (overrideConfigFile?: string): NodeJS.ReadWriteStream;

        /**
         * Handle each ESLint result as it passes through the stream.
         *
         * @param action - A function to handle each ESLint result.
         * @returns gulp file stream.
         */
        result: LintResultStreamFunction<LintResult>;

        /**
         * Handle all ESLint results at the end of the stream.
         *
         * @param action - A function to handle all ESLint results.
         * @returns gulp file stream.
         */
        results: LintResultStreamFunction<LintResults>;

        /**
         * Fail when an ESLint error is found in an ESLint result.
         *
         * @returns gulp file stream.
         */
        failOnError(): NodeJS.ReadWriteStream;

        /**
         * Fail when the stream ends if any ESLint error(s) occurred.
         *
         * @returns gulp file stream.
         */
        failAfterError(): NodeJS.ReadWriteStream;

        /**
         * Format the results of each file individually.
         *
         * @param formatter -
         * A name or path of a formatter, a formatter object or a formatter function.
         * Defaults to a modified version of the
         * [stylish](https://eslint.org/docs/user-guide/formatters/#stylish) formatter.
         * @param writer -
         * A funtion or stream to write the formatted ESLint results.
         * Defaults to gulp's [fancy-log](https://github.com/gulpjs/fancy-log#readme).
         * @returns gulp file stream.
         */
        formatEach
        (
            formatter?: string | LoadedFormatter | FormatterFunction,
            writer?:    Writer | NodeJS.WritableStream
        ):
        NodeJS.ReadWriteStream;

        /**
         * Wait until all files have been linted and format all results at once.
         *
         * @param formatter -
         * A name or path of a formatter, a formatter object or a formatter function.
         * Defaults to a modified version of the
         * [stylish](https://eslint.org/docs/user-guide/formatters/#stylish) formatter.
         * @param writer -
         * A funtion or stream to write the formatted ESLint results.
         * Defaults to gulp's [fancy-log](https://github.com/gulpjs/fancy-log#readme).
         * @returns gulp file stream.
         */
        format
        (
            formatter?: string | LoadedFormatter | FormatterFunction,
            writer?:    Writer | NodeJS.WritableStream
        ):
        NodeJS.ReadWriteStream;

        /**
         * Overwrite source files with the fixed content provided by ESLint if present.
         *
         * @returns gulp file stream.
         */
        fix(): NodeJS.ReadWriteStream;
    }

    type GulpESLintNewEslintrcOptions
    =
    Omit<
        ESLintrcOptions,
        | 'cache'
        | 'cacheLocation'
        | 'cacheStrategy'
        | 'errorOnUnmatchedPattern'
        | 'extensions'
        | 'globInputPaths'
    >
    &
    AdditionalOptions;

    type GulpESLintNewFlatOptions
    =
    Omit<
        FlatESLintOptions,
        | 'cache'
        | 'cacheLocation'
        | 'cacheStrategy'
        | 'concurrency'
        | 'errorOnUnmatchedPattern'
        | 'globInputPaths'
        | 'passOnNoPatterns'
    >
    &
    AdditionalOptions;

    type GulpESLintNewOptions =
    | (GulpESLintNewEslintrcOptions | GulpESLintNewFlatOptions) & { configType?: null | undefined; }
    | GulpESLintNewEslintrcOptions & { configType: 'eslintrc'; }
    | GulpESLintNewFlatOptions & { configType: 'flat'; };

    type LintResult = eslint.LintResult;

    type LintResults
    =
    LintResult[]
    &
    {
        errorCount:          number;
        fatalErrorCount:     number;
        warningCount:        number;
        fixableErrorCount:   number;
        fixableWarningCount: number;
    };

    type LoadedFormatter = eslint.LoadedFormatter;

    /** @deprecated Use type {@link eslint.ResultsMeta|`ESLint.ResultsMeta`}. */
    type ResultsMeta = eslint.ResultsMeta;

    type Writer = (str: string) => Awaitable;
}

declare const gulpESLintNew: gulpESLintNew.GulpESLintNew;

export = gulpESLintNew;
