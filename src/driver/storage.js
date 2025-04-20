const {join} = require('node:path')
const fs = require('node:fs/promises')

const {
  UNDEFINED
} = require('../util')


class SimpleJsonStorage {
  #filepath
  #saveLock

  constructor({
    pathfilepath
  } = {}) {
    this.#filepath = filepath
  }

  async update (updater) {
    const storage = await this.load()
    const updated = updater(storage)
    await this.save(updated)
    return updated
  }

  async #wait () {
    while (this.#saveLock) {
      await this.#saveLock
    }
  }

  async save (storage) {
    await this.#wait()

    const {promise, resolve} = Promise.withResolvers()
    this.#saveLock = promise

    await fs.writeFile(filepath, JSON.stringify(storage))
    resolve()
    this.#saveLock = UNDEFINED

    return storage
  }

  async load () {
    await this.#wait()

    const content = await fs.readFile(this.#filepath, 'utf-8')
    return JSON.parse(content)
  }
}

module.exports = {
  SimpleJsonStorage
}
