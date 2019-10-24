const { iterate } = require("leakage")
const { render } = require("../src/app")

describe("render", () => {
  test("does not leak", () =>
    iterate.async(async () => {
      await render(
        { path: "/alice", url: "http://localhost:3000/alice" },
        "alice",
      )
    }))
})
