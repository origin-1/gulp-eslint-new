<a name="1.9.0"></a>
## [1.9.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.9.0) (2023-12-16)

* The top level option `reportUnusedDisableDirectives` is no longer supported with flat config, as it was removed in ESLint 8.56.
* Updated code examples.

<a name="1.8.4"></a>
## [1.8.4](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.8.4) (2023-10-02)

* Fixed default setting and normalization of the option `cwd` with flat config.
* Clarified that the option `warnIgnored` defaults to `false`.

<a name="1.8.3"></a>
## [1.8.3](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.8.3) (2023-07-30)

* Using `export =` syntax in TypeScript type declaration file to enable type hinting in editors.

<a name="1.8.2"></a>
## [1.8.2](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.8.2) (2023-07-05)

* Consolidated errors thrown when invalind options are passed to `gulpESLintNew`:
  * Updated error messages to clarify that `undefined` is a valid value for the options `quiet`, `warnIgnored` and `warnFileIgnored`.
  * Removed property `code` from the error thrown when an invalid value is specified for the option `configType`.
* Improved TypeScript type declarations.

<a name="1.8.1"></a>
## [1.8.1](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.8.1) (2023-06-18)

* Added validation for the legacy option `warnFileIgnored`.
* gulp-eslint-new will now normalize `cwd` directories like ESLint 8.43.
* `overrideConfig` validation is deferred to ESLint.

<a name="1.8.0"></a>
## [1.8.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.8.0) (2023-05-20)

* Added validation for the options `quiet` and `warnIgnored`.
* The miniumum supported TypeScript version is now 4.2.
* Fixed and updated ignored file messages.
* Improved TypeScript type declarations.
* Improved readme file.

<a name="1.7.2"></a>
## [1.7.2](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.7.2) (2023-02-11)

* Improved TypeScript type declarations for the flat configuration system.
* Improved readme file.

<a name="1.7.1"></a>
## [1.7.1](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.7.1) (2022-12-02)

* Fixed "premature close" error when piping into a `failAfterError` stream from a `fix` stream.
* Removed useless text `domainEmitter` `[object Object]` from gulp error output.
* Fixed a code example.

<a name="1.7.0"></a>
## [1.7.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.7.0) (2022-11-01)

* Added support for the flat configuration system.
* The `format` method of a `LoadedFormatter` object is now passed a second argument, as in ESLint 8.25 or later.
* If option `cwd` is not specified, then `cwd` will be set to the current directory in the `ESLint` constructor options.
  This should avoid unexpected inconsistencies between ESLint and gulp-eslint-new in determining the current directory.
* Updated TypeScript type declarations.
* Updated examples and documentation.

<a name="1.6.0"></a>
## [1.6.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.6.0) (2022-09-12)

* Improved performance by lazy loading all dependencies.
* Allowing older versions of package [@types/node](https://www.npmjs.com/package/@types/node) (for Node.js < 18).
* Printing a warning when legacy options are migrated.
* Printing a warning when the function `fix` is used without the option `fix`.
* Updated documentation.

<a name="1.5.1"></a>
## [1.5.1](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.5.1) (2022-06-14)

* If ESLint ≥ 8.8 is used, ESLint results produced by ignored files now include the property `suppressedMessages`.

<a name="1.5.0"></a>
## [1.5.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.5.0) (2022-06-07)

* Using the modified stylish formatter by default.
  If any fixable problems are found, the modified stylish formatter will output a link with instructions about the autofix function, instead of proposing the CLI option `--fix`.
* Formalized support for any version of ESLint 8.
* Transferred project to [Origin₁](https://github.com/origin-1).
* Improved readme file.

<a name="1.4.4"></a>
## [1.4.4](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.4.4) (2022-05-19)

* Fixed a regression in version 1.4.3 that caused a `TypeError` when `gulpESLintNew` was called with a string argument.
* Minimal change in the readme file.

<a name="1.4.3"></a>
## [1.4.3](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.4.3) (2022-05-18)

* When a dependency throws an error during an asynchronous stream operation, the emitted `PluginError` now includes the stack trace when printed.
* Improved TypeScript type declarations.
* Clarified code examples in the readme file.

<a name="1.4.2"></a>
## [1.4.2](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.4.2) (2022-02-27)

* Added type definition for function `fix`.
* Updated TSDoc.

<a name="1.4.1"></a>
## [1.4.1](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.4.1) (2022-02-26)

* Fixed type inference for the arguments of callbacks provided to the functions `result` and `results`.

<a name="1.4.0"></a>
## [1.4.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.4.0) (2022-02-13)

* Added support for legacy option `extends`.
* Simplified and completed documentation of legacy options.
* `formatEach` now uses one formatter per instance of ESLint.
* Improved TypeScript type declarations.
* Normalized markdown of readme file and changelog.

<a name="1.3.0"></a>
## [1.3.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.3.0) (2022-02-05)

* Added support for new argument types to the functions `format` and `formatEach`:
  * `formatter` can now be a formatter object as resolved by the ESLint method [`loadFormatter`](https://eslint.org/docs/developer-guide/nodejs-api#-eslintloadformatternameorpath).
  * `writer` can now be an async function.
* Improved TypeScript type declarations.
* Clarified the documentation.

<a name="1.2.0"></a>
## [1.2.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.2.0) (2022-01-29)

* New function [`fix`](https://github.com/origin-1/gulp-eslint-new#gulpeslintnewfix).
* All functions exported by gulp-eslint-new are now available as named exports when gulp-eslint-new is imported with the `import` keyword (statically or dynamically).
* When the option `quiet` is used, ESLint results now include the properties `usedDeprecatedRules` and (for ESLint ≥ 8.8) `suppressedMessages`.
* The functions `result` and `results` now throw a `TypeError` when called with an invalid argument.
* Updated examples and documentation.

<a name="1.1.2"></a>
## [1.1.2](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.1.2) (2022-01-15)

* Formatting streams with ignored files no longer throws an exception when the option `warnIgnored` is used.
* Added migration instructions to the readme file.
* Updated examples.

<a name="1.1.1"></a>
## [1.1.1](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.1.1) (2022-01-08)

* Changed installation instructions so that gulp-eslint-new gets added to the devDependencies.
* Fixed a typo in an error message.

<a name="1.1.0"></a>
## [1.1.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.1.0) (2021-12-06)

* Added support for new formatter features in ESLint 8.4:
  * [Async formatters](https://github.com/eslint/eslint/pull/15243)
  * [`cwd` in formatter context](https://github.com/eslint/eslint/pull/13392)
* Updated TypeScript type declarations.
* Updated a link in the readme file.

<a name="1.0.0"></a>
## [1.0.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/1.0.0) (2021-11-14)

* Using the new ESLint formatter API.
* Added TypeScript type declarations.
* `result` and `results` streams now support async functions as handlers.
* Updated examples and documentation.
* Added package.json to package exports.
* Fix: `format` and `results` streams now stay open until the end of asynchronous operations in all supported versions of Node.js.

<a name="0.6.0"></a>
## [0.6.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/0.6.0) (2021-11-06)

* Using ESLint 8.2.
* Results lists have now the same "Count" properties of a single result: `fixableErrorCount`, `fixableWarningCount` and `fatalErrorCount`, in addition to the previously featured `errorCount` and `warningCount`.

<a name="0.5.1"></a>
## [0.5.1](https://github.com/origin-1/gulp-eslint-new/releases/tag/0.5.1) (2021-11-04)

* Unuseful ESLint options are now rejected: `errorOnUnmatchedPattern`, `extensions`, `globInputPaths` and cache-related ones.
* Errors and warnings generated by gulp-eslint-new are now more similar to those generated by ESLint 8.
* Updated examples and documentation.

<a name="0.5.0"></a>
## [0.5.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/0.5.0) (2021-10-27)

* Using ESLint 8.1.
* Updated documentation.

<a name="0.4.0"></a>
## [0.4.0](https://github.com/origin-1/gulp-eslint-new/releases/tag/0.4.0) (2021-10-10)

* Using ESLint 8.
* Changed plugin name to **gulp-eslint-new**.

<a name="0.3.2"></a>
## [0.3.2](https://github.com/origin-1/gulp-eslint7/releases/tag/0.3.2) (2021-09-11)

* Updated dependencies in prospect of ESLint 8.

<a name="0.3.1"></a>
## [0.3.1](https://github.com/origin-1/gulp-eslint7/releases/tag/0.3.1) (2021-05-03)

* Updated readme file.

<a name="0.3.0"></a>
## [0.3.0](https://github.com/origin-1/gulp-eslint7/releases/tag/0.3.0) (2020-07-03)

* Fixed `plugins` option handling to accept both an array (old API) or a map-like object (new API).

<a name="0.2.1"></a>
## [0.2.1](https://github.com/origin-1/gulp-eslint7/releases/tag/0.2.1) (2020-06-30)

* Minor optimizations.
* Showing npm badge in the readme file.

<a name="0.2.0"></a>
## [0.2.0](https://github.com/origin-1/gulp-eslint7/releases/tag/0.2.0) (2020-06-27)

* Accepting all appliable [`ESLint` constructor](https://eslint.org/docs/developer-guide/nodejs-api#-new-eslintoptions) and [`CLIEngine` constructor](https://eslint.org/docs/developer-guide/nodejs-api#cliengine) options.
* Updated readme file.

<a name="0.1.0"></a>
## [0.1.0](https://github.com/origin-1/gulp-eslint7/releases/tag/0.1.0) (2020-06-22)

Initial release derived from [gulp-eslint](https://github.com/adametry/gulp-eslint).
* Using ESLint 7.
* Disambiguated plugin name to **gulp-eslint7**.

---

For the changelog of gulp-eslint until forking, see
[here](https://github.com/adametry/gulp-eslint/blob/v6.0.0/CHANGELOG.md).
