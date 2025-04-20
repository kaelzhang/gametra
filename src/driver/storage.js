const {join} = require('node:path')
const fs = require('node:fs/promises')

const {
  UNDEFINED
} = require('../util')


class SimpleJsonStorage {
  #filepath
  #saveLock

  constructor({
    filepath
  }) {
    this.#filepath = filepath
  }

  async #update (updater) {
    while (this.#saveLock) {
      await this.#saveLock
    }

    const {promise, resolve} = Promise.withResolvers()
    this.#saveLock = promise

    const updated = await updater.call(this)
    await fs.writeFile(this.#filepath, JSON.stringify(updated))

    resolve()
    this.#saveLock = UNDEFINED

    return updated
  }

  async save (storage) {
    return this.#update(() => storage)
  }

  async update (updater) {
    return this.#update(
      async () => {
        const storage = await this.#load()
        return updater(storage)
      }
    )
  }

  async load () {
    while (this.#saveLock) {
      await this.#saveLock
    }

    return this.#load()
  }

  async #load () {
    const content = await fs.readFile(this.#filepath, 'utf-8')
    return JSON.parse(content)
  }
}

module.exports = {
  SimpleJsonStorage
}
