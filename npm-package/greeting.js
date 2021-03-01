#!/usr/bin/env node
'use strict'

// 実行可能ファイルの例: package.jsonのbinで指定する

// process.argvの確認
console.log('********** DEBUG **********')
console.log(process.argv)
console.log('********** DEBUG **********')

// process.argvはNode.js自体の実行可能ファイルへのパスと
// greetingへのパスで始まるため、3番目以降の文字列を取り出して処理
process.argv.slice(2).forEach(name => console.log(`Hello ${name}!`))


