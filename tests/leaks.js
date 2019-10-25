const { iterate } = require("leakage")
jest.mock("node-fetch", () => () =>
  Promise.resolve({
    test: console.log("imported"),
    json: () => {
      console.log("fetch called")
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
    await render(
      { path: "/alice", url: "http://localhost:3000/alice" },
      "alice",
    )
    console.timeEnd("render")
    console.log("render 1 end")

    console.log("render 2 start")
    console.time("render2")
    await render(
      { path: "/alice", url: "http://localhost:3000/alice" },
      "alice",
    )
    console.timeEnd("render2")
    console.log("render 2 end")
  })
  test.skip("does not leak", () =>
    iterate.async(async () => {
      await render(
        { path: "/alice", url: "http://localhost:3000/alice" },
        "alice",
      )
    }))
})
