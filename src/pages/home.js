const fetch = require("node-fetch")
const React = require("react")
const h = React.createElement
const { forward } = require("effector")
const { useStore, useList } = require("@zerobias/effector-react/ssr")
const { createEvent, createEffect, createStore } = require("../effector")

const users = {
  alice: "9s0p2",
  bob: "sw17q",
  carol: "k38w6",
}

const started = createEvent("started")
const fetchUser = createEffect("fetchUser")
const $user = createStore("guest", { name: "$user" })
const $friends = createStore([], { name: "$friends" })
const $friendsTotal = $friends.map((list) => list.length)

fetchUser.use(async ({ user }) => {
  return (await fetch(`https://api.myjson.com/bins/${users[user]}`)).json()
})

forward({
  from: started,
  to: fetchUser,
})

$user.on(fetchUser.done, (_, { result }) => result.name)
$friends.on(fetchUser.done, (_, { result }) => result.friends)

const User = () => {
  const user = useStore($user)
  return h("h2", {}, user)
}

const Friends = () => {
  return useList($friends, (friend) => h("li", {}, friend))
}

const Total = () => {
  const total = useStore($friendsTotal)
  return h("small", null, "Total: ", total)
}

const HomePage = () => {
  return h(
    React.Fragment,
    null,
    h(User, null),
    h("b", null, "Friends:"),
    h("ol", null, h(Friends, null)),
    h(Total, null),
  )
}

HomePage.preload = started

module.exports = { HomePage }
