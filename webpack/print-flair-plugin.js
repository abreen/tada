const { getFlair } = require("./log")

module.exports = {
  apply: compiler => {
    compiler.hooks.afterEmit.tap("AfterEmitPlugin", () => {
      console.log(getFlair())
    })
  },
}
