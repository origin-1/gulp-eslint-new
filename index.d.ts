import { ESLint, Linter }    from 'eslint';
import                            'node';
import { TransformCallback } from 'stream';

export type GulpESLintAction<Type>
	= ((value: Type, callback: TransformCallback) => unknown) | ((value: Type) => Promise<unknown>);

export type GulpESLintOptions =
	Omit<
	ESLint.Options,
	| 'cache'
	| 'cacheLocation'
	| 'cacheStrategy'
	| 'errorOnUnmatchedPattern'
	| 'extensions'
	| 'globInputPaths'
	>
	& {
		/** @deprecated Use `overrideConfigFile` instead. */
		configFile?: string | undefined;

		/**
		 * @deprecated
		 * Use `overrideConfig.env` instead. Note the different option name and format.
		 */
		envs?: string[] | undefined;

		/** @deprecated Use `overrideConfig.globals` instead. Note the different format. */
		globals?: string[] | undefined;

		/** @deprecated Use `overrideConfig.parser` instead. */
		parser?: string | undefined;

		/** @deprecated Use `overrideConfig.parserOptions` instead. */
		parserOptions?: Linter.ParserOptions | undefined;

		quiet?:
		| boolean
		| ((message: Linter.LintMessage, index: number, list: Linter.LintMessage[]) => unknown)
		| undefined;

		/** @deprecated Use `overrideConfig.rules` instead. */
		rules?: Partial<Linter.RulesRecord> | undefined;

		/** @deprecated Use `warnIgnored` instead. */
		warnFileIgnored?: boolean | undefined;

		warnIgnored?: boolean | undefined;
	};

export type GulpESLintResult = ESLint.LintResult;

export type GulpESLintResults =
	GulpESLintResult[] &
	{
		errorCount:          number;
		fatalErrorCount:     number;
		warningCount:        number;
		fixableErrorCount:   number;
		fixableWarningCount: number;
	};

export type GulpESLintWriter = (str: string) => unknown | Promise<unknown>;

declare const gulpESLintNew: {
	/**
	 * Append ESLint result to each file.
	 *
	 * @param options Options for gulp-eslint-new.
	 * @returns gulp file stream.
	 */
	(options?: GulpESLintOptions): NodeJS.ReadWriteStream;

	/**
	 * Append ESLint result to each file.
	 *
	 * @param overrideConfigFile The path to a configuration file.
	 * @returns gulp file stream.
	 */
	(overrideConfigFile?: string): NodeJS.ReadWriteStream;

	/**
	 * Handle each ESLint result as it passes through the stream.
	 *
	 * @param action - A function to handle each ESLint result.
	 * @returns gulp file stream.
	 */
	result(action: GulpESLintAction<GulpESLintResult>): NodeJS.ReadWriteStream;

	/**
	 * Handle all ESLint results at the end of the stream.
	 *
	 * @param action - A function to handle all ESLint results.
	 * @returns gulp file stream.
	 */
	results(action: GulpESLintAction<GulpESLintResults>): NodeJS.ReadWriteStream;

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
	 * @param formatter
	 * The name or function for an ESLint result formatter.
	 * Defaults to the [stylish](https://eslint.org/docs/user-guide/formatters/#stylish) formatter.
	 * @param writer
	 * A funtion or stream to write the formatted ESLint results.
	 * Defaults to gulp's [fancy-log](https://github.com/gulpjs/fancy-log#readme).
	 * @returns gulp file stream.
	 */
	formatEach(
		formatter?: string | ESLint.Formatter['format'],
		writer?: GulpESLintWriter | NodeJS.WritableStream
	): NodeJS.ReadWriteStream;

	/**
	 * Wait until all files have been linted and format all results at once.
	 *
	 * @param formatter
	 * The name or function for an ESLint result formatter.
	 * Defaults to the [stylish](https://eslint.org/docs/user-guide/formatters/#stylish) formatter.
	 * @param writer
	 * A funtion or stream to write the formatted ESLint results.
	 * Defaults to gulp's [fancy-log](https://github.com/gulpjs/fancy-log#readme).
	 * @returns gulp file stream.
	 */
	format(
		formatter?: string | ESLint.Formatter['format'],
		writer?: GulpESLintWriter | NodeJS.WritableStream
	): NodeJS.ReadWriteStream;
};
export default gulpESLintNew;
