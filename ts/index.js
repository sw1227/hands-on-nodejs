"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyClass = void 0;
const fs_1 = require("fs");
// テスト
class MyClass {
    readFile(...paths) {
        return Promise.any(paths.map(p => fs_1.promises.readFile(p, 'utf8')));
    }
}
exports.MyClass = MyClass;
