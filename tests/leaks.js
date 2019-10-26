const { iterate } = require("leakage")
jest.mock("node-fetch", () => () =>
  Promise.resolve({
    json: () => {
      return Promise.resolve({ name: "alice", friends: ["bob"] })
    },
  }),
)
const { render } = require("../src/app")
const fetch = require("node-fetch")

describe("render", () => {
  test("timer", async () => {
    console.time("fetch")
    await (await fetch()).json()
    console.timeEnd("fetch")

    console.log("render 1 start")
    console.time("render")
    await render({
      ctx: { path: "/alice", url: "http://localhost:3000/alice" },
      user: "alice",
    })
    console.timeEnd("render")
    console.log("render 1 end")

    console.log("render 2 start")
    console.time("render2")
    await render({
      ctx: { path: "/alice", url: "http://localhost:3000/alice" },
      user: "alice",
    })
    console.timeEnd("render2")
    console.log("render 2 end")
  })
  test(
    "does not leak",
    () =>
      iterate.async(async () => {
        await render({
          ctx: { path: "/alice", url: "http://localhost:3000/alice" },
          user: "alice",
        })
      }),
    50000,
  )
})
