const React = require("react")
const ReactDom = require("react-dom/server")
const h = React.createElement

const Effector = require("effector")
const Ssr = require("@zerobias/effector-react/ssr")

const Router = require("react-router-dom")
const { matchRoutes, renderRoutes } = require("react-router-config")

const { domain, createEvent } = require("./effector")
const { routes } = require("./pages")

const App = ({ scope }) => {
  return h(Ssr.Provider, { value: scope }, renderRoutes(routes))
}

const defaultEvent = createEvent()

async function render(context) {
  const routerContext = {}
  const branch = matchRoutes(routes, context.path)

  const start = branch[0].route.component.preload || defaultEvent

  const Scope = Ssr.createScope({ domain, start })
  const scope = await Ssr.fork(Scope, { ctx: context })

  const string = ReactDom.renderToString(
    h(
      Router.StaticRouter,
      { location: context.url, context: routerContext },
      h(App, { scope }),
    ),
  )

  return string
}

module.exports = { render }
