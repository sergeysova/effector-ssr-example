const { HomePage } = require("./home")

const routes = [
  {
    path: "/:name",
    component: HomePage,
    exact: true,
  },
  {
    component: () => null,
  },
]

module.exports = { routes }
