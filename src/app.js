require("isomorphic-fetch")
const React = require("react")
const ReactDom = require("react-dom/server")
const h = React.createElement

const { Scope, fork } = require("./effector")
const { HomePage } = require("./pages/home")

const App = ({ scope }) => {
  return h(Scope.Provider, { value: scope }, h(HomePage, null))
}

async function render() {
  const scope = await fork({ start: HomePage.preload, ctx: { user: "alice" } })

  const string = ReactDom.renderToString(h(App, { scope }))

  return string
}

module.exports = { render }
