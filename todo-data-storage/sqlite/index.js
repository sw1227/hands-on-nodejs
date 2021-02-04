'use strict'
const { promisify } = require('util')
const { join, resolve } = require('path')
const { rejects } = require('assert')
const sqlite3 = process.env.NODE_ENV === 'production'
  ? require('sqlite3')
  : require('sqlite3').verbose()

  // todo-data-storage/sqlite/sqliteというファイルにDBの状態を保存
const db = new sqlite3.Database(join(__dirname, 'sqlite'))

// コールバックパターンのメソッドをPromise化
const dbGet = promisify(db.get.bind(db))
const dbRun = function() {
  return new Promise((resolve, reject) =>
    db.run.apply(db, [
      ...arguments, // function() {}の引数（ここではdbRunの引数）
      function (err) {
        err ? reject(err) : resolve(this)
      }
    ])
  )
}
const dbAll = promisify(db.all.bind(db))

dbRun(`CREATE TABLE IF NOT EXISTS todo (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL
)`).catch(err => {
  // テーブル作成に失敗したらアプリケーション終了
  console.error(err)
  process.exit(1)
})

// DBのデータをToDoオブジェクトに変換(completed: 0/1 to boolean)
function rowToTodo (row) {
  return { ...row, completed: !!row.completed }
}

exports.fetchAll = () => {
  dbAll('SELECT * FROM todo').then(rows => rows.map(rowToTodo))
}

exports.fetchByCompleted = completed => {
  dbAll('SELECT * FROM todo WHERE completed = ?', completed)
    .then(rows => rows.map(rowToTodo))
}

exports.create = async todo => {
  // 成功時にはundefinedで解決されるPromiseインスタンスを返すのでreturnしない
  await dbRun(
    'INSERT INTO todo VALUES (?, ?, ?)',
    todo.id,
    todo.title,
    todo.completed
  )
}

exports.update = (id, update) => {
  // 第二引数updateにtitle, completedプロパティが含まれるか調べる
  const setColumns = []
  const values = []
  for (const column of ['title', 'completed']) {
    if (column in update) {
      setColumns.push(`${column} = ?`)
      values.push(update[column])
    }
  }
  values.push(id)
  // UPDATEの結果changesが1なら更新後のTODOを返し、そうでなければnullを返す
  return dbRun(`UPDATE todo SET ${setColumns.join()} WHERE id = ?`, values)
    .then(({ changes }) => changes === 1
      ? dbGet('SELECT * FROM todo WHERE id = ?', id).then(rowToTodo)
      : null
    )
}

// DELETEの結果changesが0ならIDを、そうでなければnullを返す
exports.remove = id => dbRun('DELETE FROM todo WHERE id = ?', id)
  .then(({ changes }) => changes === 1 ? id : null)
