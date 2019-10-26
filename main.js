const Koa = require("koa")
const Router = require("@koa/router")

const { render } = require("./src/app")
const { routes } = require("./src/pages")

const app = new Koa()
const router = new Router()

const handler = async (ctx) => {
  const config = {
    url: ctx.url,
    path: ctx.path,
    params: { ...ctx.params },
    query: { ...ctx.query },
  }
  ctx.body = await render(config)
}

routes.forEach((route) => {
  router.get(route.path || "*", handler)
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000)
