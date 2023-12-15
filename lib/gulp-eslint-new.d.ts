import type * as eslint             from './eslint';
import 'node';
import type { TransformCallback }   from 'stream';

type Awaitable<T = unknown> = T | Promise<T>;

type ConfigData     = eslint.ConfigData;
type FlatConfig     = eslint.FlatConfig;
type ESLintOptions  = eslint.ESLintOptions;
type LintMessage    = eslint.LintMessage;

type LintResultStreamFunction<Type> =
((action: (value: Type, callback: TransformCallback) => void) => NodeJS.ReadWriteStream) &
((action: (value: Type) => Awaitable) => NodeJS.ReadWriteStream);

declare namespace gulpESLintNew
{
    type FormatterContext = eslint.FormatterContext;

    type FormatterFunction = eslint.FormatterFunction;

    interface GulpESLintNew
    {
        /**
         * Append ESLint result to each file.
         *
         * @param options - Options for gulp-eslint-new.
         * @returns gulp file stream.
         */
        (options?: GulpESLintOptions): NodeJS.ReadWriteStream;

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
        result: LintResultStreamFunction<GulpESLintResult>;

        /**
         * Handle all ESLint results at the end of the stream.
         *
         * @param action - A function to handle all ESLint results.
         * @returns gulp file stream.
         */
        results: LintResultStreamFunction<GulpESLintResults>;

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
            writer?: GulpESLintWriter | NodeJS.WritableStream
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
            writer?: GulpESLintWriter | NodeJS.WritableStream
        ):
        NodeJS.ReadWriteStream;

        /**
         * Overwrite source files with the fixed content provided by ESLint if present.
         *
         * @returns gulp file stream.
         */
        fix(): NodeJS.ReadWriteStream;
    }

    type GulpESLintOptions =
    (GulpESLintrcOptions & { configType?: 'eslintrc' | null | undefined; }) |
    (GulpFlatESLintOptions & { configType: 'flat'; });

    type GulpESLintResult = eslint.LintResult;

    type GulpESLintResults
    =
    GulpESLintResult[] &
    {
        errorCount:          number;
        fatalErrorCount:     number;
        warningCount:        number;
        fixableErrorCount:   number;
        fixableWarningCount: number;
    };

    type GulpESLintWriter = (str: string) => Awaitable;

    type GulpESLintrcOptions
    =
    Omit<
        ESLintOptions,
        | 'cache'
        | 'cacheLocation'
        | 'cacheStrategy'
        | 'errorOnUnmatchedPattern'
        | 'extensions'
        | 'globInputPaths'
        | 'plugins'
    > &
    {
        /** @deprecated Use `overrideConfigFile` instead. */
        configFile?: ESLintOptions['overrideConfigFile'];

        /**
         * @deprecated
         * Use `overrideConfig.env` or `baseConfig.env` instead.
         * Note the different option name and format.
         */
        envs?: string[] | undefined;

        /** @deprecated Use `overrideConfig.extends` or `baseConfig.extends` instead. */
        extends?: ConfigData['extends'];

        /**
         * @deprecated
         * Use `overrideConfig.globals` or `baseConfig.globals` instead. Note the different format.
         */
        globals?: string[] | undefined;

        /**
         * @deprecated
         * Use `overrideConfig.ignorePatterns` or `baseConfig.ignorePatterns` instead.
         * Note the different option name.
         */
        ignorePattern?: ConfigData['ignorePatterns'];

        /** @deprecated Use `overrideConfig.parser` or `baseConfig.parser` instead. */
        parser?: ConfigData['parser'];

        /** @deprecated Use `overrideConfig.parserOptions` or `baseConfig.parserOptions` instead. */
        parserOptions?: ConfigData['parserOptions'];

        plugins?: ESLintOptions['plugins'] | ConfigData['plugins'];

        quiet?:
        | boolean
        | ((message: LintMessage, index: number, list: LintMessage[]) => unknown)
        | undefined;

        /** @deprecated Use `overrideConfig.rules` or `baseConfig.rules` instead. */
        rules?: ConfigData['rules'];

        /** @deprecated Use `warnIgnored` instead. */
        warnFileIgnored?: boolean | undefined;

        warnIgnored?: boolean | undefined;
    };

    type GulpFlatESLintOptions
    =
    Pick<
        ESLintOptions,
        | 'allowInlineConfig'
        | 'cwd'
        | 'fix'
        | 'fixTypes'
        | 'ignore'
        | 'plugins'
    > &
    {
        baseConfig?: FlatConfig | (string | FlatConfig)[] | null | undefined;

        ignorePatterns?: string[] | null | undefined;

        overrideConfig?: FlatConfig | (string | FlatConfig)[] | null | undefined;

        overrideConfigFile?: string | true | null | undefined;

        quiet?:
        | boolean
        | ((message: LintMessage, index: number, list: LintMessage[]) => unknown)
        | undefined;

        warnIgnored?: boolean | undefined;
    };

    type LoadedFormatter = eslint.LoadedFormatter;

    type ResultsMeta = eslint.ResultsMeta;
}

declare const gulpESLintNew: gulpESLintNew.GulpESLintNew;

export = gulpESLintNew;
