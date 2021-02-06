'use strict'
const level = require('level')
const { join } = require('path')
// 同じディレクトリ内のleveldbディレクトリにDBの状態を保存
const db = level(join(__dirname, 'leveldb'))

// todo:からtodo;までの範囲のキーを持つデータを取得
exports.fetchAll = async () => {
  const result = []
  for await (const v of db.createValueStream({ gt: 'todo:', lt: 'todo;' })) {
    result.push(JSON.parse(v))
  }
  return result
}

// セカンダリインデックスを利用して実装
// そのままだとcompletedで絞り込めないので、keyにcompletedを含めて範囲検索
// そこから得られたidそれぞれについて実際のデータを取得
exports.fetchByCompleted = async completed => {
  const promises = []
  for await (const id of db.createValueStream({
    // セカンダリインデックスの検索
    gt: `todo-completed-${completed}:`,
    lt: `todo-completed-${completed};`
  })) {
    promises.push(
      db.get(`todo:${id}`).then(JSON.parse)
    )
  }
  return Promise.all(promises)
}

// ToDoとセカンダリインデックスを保存
// 整合性を保つため、バッチ更新する
exports.create = todo => db.batch()
  // ToDoの保存
  .put(`todo:${todo.id}`, JSON.stringify(todo))
  // セカンダリインデックスの保存
  .put(`todo-completed-${todo.completed}:${todo.id}`, todo.id)
  .write()

exports.update = (id, update) =>
  db.get(`todo:${id}`).then(
    content => {
      const oldTodo = JSON.parse(content)
      const newTodo = {
        ...oldTodo,
        ...update
      }
      let batch = db.batch().put(`todo:${id}`, JSON.stringify(newTodo))
      // completedが変化した場合、セカンダリインデックスも操作する
      // 整合性が必要なのでbatch
      if (oldTodo.completed !== newTodo.completed) {
        batch = batch
          .del(`todo-completed-${oldTodo.completed}:${id}`)
          .put(`todo-completed-${newTodo.completed}:${id}`, id)
      }
      return batch.write().then(() => newTodo)
    },
    // ToDoが存在しない場合はnullを返し、それ以外はエラーにする
    err => err.notFound ? null : Promise.reject(err)
  )

exports.remove = id =>
  db.get(`todo:${id}`).then(
    content => db.batch()
      .del(`todo:${id}`)
      .del(`todo-completed-true:${id}`)
      .del(`todo-completed-false:${id}`)
      .write()
      .then(() => id),
    // ToDoが存在しない場合はnullを返し、それ以外はエラーにする
    err => err.notFound ? null : Promise.reject(err)
  )
