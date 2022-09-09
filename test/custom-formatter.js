'use strict';

const formatter =
(...args) =>
    new Promise(
        resolve => {
            setImmediate(
                () => {
                    formatter.args = args;
                    resolve();
                },
            );
        },
    );
module.exports = formatter;
