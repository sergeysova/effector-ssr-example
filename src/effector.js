const Effector = require("effector")

const domain = Effector.createDomain("app domain")

module.exports = {
  createEvent: domain.event,
  createStore: domain.store,
  createEffect: domain.effect,
  createDomain: domain.domain,
  domain,
}
