'use strict'
const express = require('express')
let todos = [
  { id: 1, title: 'ネーム', completed: false },
  { id: 2, title: '下書き', completed: true }
]
const app = express()

// JSONのリクエストボディを受け付けるためのミドルウェアを全体で使用
app.use(express.json())

// ToDo一覧の取得
app.get('/api/todos', (req, res) => {
  if (!req.query.completed) {
    return res.json(todos)
  }
  // completedクエリパラメータが指定された場合はToDoをフィルタリング
  const completed = req.query.completed === 'true'
  res.json(todos.filter(todo => todo.completed === completed))
})

// 全クライアントに対するSSE送信関数を保持する配列
let sseSenders = []
// SSEのIDを管理するための変数（更新されるのはToDoの更新時で、同じIDが複数クライアントに対して使われる）
let sseId = 1

// TODO一蘭の取得(SSE)
app.get('/api/todos/events', (req, res) => {
  // タイムアウトを抑止
  // 例えば1000にすると、1secごとにタイムアウトして数秒後に再接続される
  req.socket.setTimeout(0)
  res.set({
    // Content-TypeでSSEであることを示す
    'Content-Type': 'text/event-stream'
  })
  // このクライアントにSSEを送信する関数を作成して登録
  const send = (id, data) => res.write(`id: ${id}\ndata: ${data}\n\n`)
  sseSenders.push(send)
  // リクエスト発生時点の状態を送信
  send(sseId, JSON.stringify(todos))
  // リクエストがクローズされたらレスポンスを終了してSSE送信関数を配列から削除
  req.on('close', () => {
    res.end()
    sseSenders = sseSenders.filter(_send => _send !== send)
  })
})

// ToDoの更新に伴い、前クライアントに対してSSEを送信する
function onUpdateTodos() {
  sseId += 1
  const data = JSON.stringify(todos)
  sseSenders.forEach(send => send(sseId, data)) // 全クライアントに対する送信
}


// ToDoのIDの値を管理するための変数
let id = 2
app.post('/api/todos', (req, res, next) => {
  const { title } = req.body
  if (typeof title != 'string' || !title) {
    // titleがリクエストに含まれない場合はstatus code 400 (Bad Request)
    const err = new Error('title is required')
    err.statusCode = 400
    // エラーハンドリングミドルウェアに流す
    return next(err)
  }
  // ToDoの作成
  const todo = { id: id += 1, title, completed: false }
  todos.push(todo)
  // Status code 201(Created)で結果を返す
  res.status(201).json(todo)

  // SSE送信
  onUpdateTodos()
})

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.log(err)
  res.status(err.statusCode || 500).json({ error: err.message })
})

app.listen(3000)


// Next.jsによるルーティング
// <Memo>
// 例えば「未完了のToDo」をクリックすると<Link href="/active" />により
// /activeへのリクエストが生じる。↓の記述によってこれはNextのリクエストハンドラに渡され、
// /pages/active.jsが返される。この中ではTodosコンポーネントが描画(SSR)されるが、
// useEffectによって/api/todos?completed=falseの内容がfetchされ、それに基づいた描画が行われる。
// React周りの/activeへのリクエストと、expressで実装した/api/以下へのリクエストが統一的に扱われていることに注意
const next = require('next')
const dev= process.env.NODE_ENV != 'production'
const nextApp = next({ dev })

nextApp.prepare().then(
  // pagesディレクトリ内の各React componentに対するサーバーサイドルーティング
  () => app.get('*', nextApp.getRequestHandler()),
  err => {
    console.error(err)
    process.exit(1)
  }
)