import gulpESLintNew, { GulpESLintWriter } from '..';

const isStream = (stream: NodeJS.ReadWriteStream) => void stream;

isStream(gulpESLintNew.result(() => undefined));
gulpESLintNew.result(result => void result);
gulpESLintNew.result((result, callback) => callback());
// @ts-expect-error No arguments.
gulpESLintNew.result();
// @ts-expect-error Too many arguments to callback.
gulpESLintNew.result((result, callback, foo) => foo);

isStream(gulpESLintNew.results(() => undefined));
gulpESLintNew.results(results => void results);
gulpESLintNew.results((results, callback) => callback());
// @ts-expect-error No arguments.
gulpESLintNew.results();
// @ts-expect-error Too many arguments to callback.
gulpESLintNew.results((results, callback, foo) => foo);

isStream(gulpESLintNew.failOnError());

isStream(gulpESLintNew.failAfterError());

isStream(gulpESLintNew.formatEach());
gulpESLintNew.formatEach('test');
gulpESLintNew.formatEach({ format: () => 'test' });
gulpESLintNew.formatEach(() => 'test');
(writer: NodeJS.WritableStream | GulpESLintWriter | undefined) =>
	gulpESLintNew.formatEach(undefined, writer);

isStream(gulpESLintNew.format());
gulpESLintNew.format('test');
gulpESLintNew.format({ format: () => 'test' });
gulpESLintNew.format(() => 'test');
(writer: NodeJS.WritableStream | GulpESLintWriter | undefined) =>
	gulpESLintNew.format(undefined, writer);

isStream(gulpESLintNew.fix());
