const Koa = require("koa")
const Router = require("@koa/router")

const { render } = require("./src/app")

const app = new Koa()
const router = new Router()

router.get("/", async (ctx, next) => {
  ctx.body = await render()
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000)
