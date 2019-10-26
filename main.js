const Koa = require("koa")
const Router = require("@koa/router")

const { render } = require("./src/app")

const app = new Koa()
const router = new Router()

router.get("/alice", async (ctx) => {
  ctx.body = await render({ ctx, user: "alice" })
})

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000)
