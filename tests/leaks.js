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

    console.time("render")
    await render(
      { path: "/alice", url: "http://localhost:3000/alice" },
      "alice",
    )
    console.timeEnd("render")

    console.time("render")
    await render(
      { path: "/alice", url: "http://localhost:3000/alice" },
      "alice",
    )
    console.timeEnd("render")
  })
  test.skip("does not leak", () =>
    iterate.async(async () => {
      await render(
        { path: "/alice", url: "http://localhost:3000/alice" },
        "alice",
      )
    }))
})
