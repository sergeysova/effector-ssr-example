const Koa = require("koa")
const Router = require("@koa/router")

const { render } = require("./src/app")

const app = new Koa()
const router = new Router()

router.get("/alice", async (ctx) => {
  // const body = await render(ctx, "alice")
  // ctx.body = body
  ctx.body = await render({ ctx, user: "alice" })
})

// router.get("/bob", async (ctx) => {
//   ctx.body = await render(ctx, "bob")
// })

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000)
