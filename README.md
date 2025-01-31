[![Build Status](https://github.com/kaelzhang/gametra/actions/workflows/nodejs.yml/badge.svg)](https://github.com/kaelzhang/gametra/actions/workflows/nodejs.yml)
[![Coverage](https://codecov.io/gh/kaelzhang/gametra/branch/master/graph/badge.svg)](https://codecov.io/gh/kaelzhang/gametra)

> Still in development

# Gametra

A cloud game driver and automator

- Gametra is element-ignostic, it does not care about the element you are interacting with, but only the position of the mouse and the key you are pressing.

## Install

```sh
$ npm i gametra
```

## Usage

```js
const {
  Game,
  ImageMatcher
} = require('gametra')

const game = new Game({
  url: 'https://www.google.com'
})

await game.launch()

await game.click(100, 100)

await game.screenshot()
```

## License

[MIT](LICENSE)
