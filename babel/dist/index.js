"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MyClass = void 0;

var _fs = require("fs");

// テスト
class MyClass {
  readFile(...paths) {
    return Promise.any(paths.map(p => _fs.promises.readFile(p, 'utf8')));
  }

}

exports.MyClass = MyClass;