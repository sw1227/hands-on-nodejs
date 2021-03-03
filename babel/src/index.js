import { promises } from 'fs'

// テスト
export class MyClass {
  readFile(...paths) {
    return Promise.any(
      paths.map(
        p => promises.readFile(p, 'utf8')
      )
    )
  }
}
