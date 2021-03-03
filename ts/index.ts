import { promises } from 'fs'

// テスト
export class MyClass {
  readFile(...paths: string[]) {
    return Promise.any(
      paths.map(
        p => promises.readFile(p, 'utf8')
      )
    )
  }
}
