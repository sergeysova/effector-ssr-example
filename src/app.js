const React = require("react")
const h = React.createElement
const Effector = require("effector")
const ReactDom = require("react-dom/server")
const Router = require("react-router-dom")
const { matchRoutes, renderRoutes } = require("react-router-config")

const { Scope, fork, createEvent } = require("./effector")
const { routes } = require("./pages")

const App = ({ scope }) => {
  return h(Scope.Provider, { value: scope }, renderRoutes(routes))
}

const defaultEvent = createEvent()

async function render(ctx, user) {
  const routerContext = {}
  const branch = matchRoutes(routes, ctx.path)

  const scope = await fork({
    start: branch[0].route.component.preload || defaultEvent,
    ctx: { user },
  })

  const string = ReactDom.renderToString(
    h(
      Router.StaticRouter,
      { location: ctx.url, context: routerContext },
      h(App, { scope }),
    ),
  )

  Effector.clearNode(scope)

  return string
}

module.exports = { render }
