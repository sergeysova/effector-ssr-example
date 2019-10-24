const Koa = require("koa")
const Router = require("@koa/router")

const { render } = require("./src/app")

const app = new Koa()
const router = new Router()

router.get("/alice", async (ctx, next) => {
  ctx.body = await render(ctx, "alice")
})

router.get("/bob", async (ctx) => {
  ctx.body = await render(ctx, "bob")
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000)
