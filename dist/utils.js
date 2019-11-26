"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
exports.capitalizeFirstLetter = capitalizeFirstLetter;
function queryPromise(str) {
    return new Promise((resolve, reject) => {
        main_1.con.query(str, (err, result) => {
            if (err)
                reject(err);
            resolve(result);
        });
    });
}
exports.queryPromise = queryPromise;
