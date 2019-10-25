const React = require("react")
const Effector = require("effector")
const EffectorReact = require("effector-react")

const stack = []

const app = Effector.createDomain()
const Scope = React.createContext(null)

module.exports = {
  createEvent: app.event,
  createStore: app.store,
  createEffect: app.effect,
  createDomain: app.domain,
  sample: Effector.sample,
  forward: Effector.forward,
  scopeBind,
  invoke,
  fork: ({ start, ctx }) => fork({ start, ctx, domain: app }),
  useStore,
  useList,
  useScopeEvent,
  Scope,
}

/* invoke event in scope */
function invoke(unit, payload) {
  if (stack.length === 0) {
    throw Error("invoke cannot be called outside of forked .watch")
  }
  Effector.launch(stack[stack.length - 1](unit), payload)
}

/* bind event to scope */
function scopeBind(unit) {
  if (stack.length === 0) {
    throw Error("scopeBind cannot be called outside of forked .watch")
  }
  const result = stack[stack.length - 1](unit)
  return (payload) => {
    Effector.launch(result, payload)
  }
}

/*
bind event to scope. works like React.useCallback, but for scopes
*/
function useScopeEvent(event) {
  const scope = React.useContext(Scope)
  const unit = scope.find(store)
  const result = (payload) => Effector.launch(unit, payload)
  return React.useCallback(result, [event])
}

/*
fork graph and launch all effectx with that ctx
*/
async function fork({ start, ctx, domain }) {
  await 0
  const { scope, req, syncComplete } = cloneGraph(domain)
  Effector.launch(scope.find(start), ctx)
  syncComplete()
  await req
  console.log("forked")
  return scope
}

function useStore(store) {
  return EffectorReact.useStore(useScopeStore(store))
}
function useList(store, opts) {
  return EffectorReact.useList(useScopeStore(store), opts)
}
function useScopeStore(store) {
  const scope = React.useContext(Scope)
  return scope.find(store).meta.wrapped
}

/* watchers for bare graph nodes */
function createWatch(node, cb) {
  return Effector.forward({
    from: node,
    to: Effector.createNode({
      node: [
        Effector.step.run({
          fn(result) {
            cb(result)
          },
        }),
      ],
      family: {
        type: "crosslink",
        owners: [],
      },
      meta: { op: "watch" },
    }),
  })
}

/**
everything we need to clone graph section
reachable from given unit

to erase, call clearNode(clone.node)
*/
function cloneGraph(unit) {
  unit = unit.graphite || unit
  const list = flatGraph(unit)
  const clones = list.map(copyUnit)
  let resolve
  let reject
  const req = new Promise((rs, rj) => {
    resolve = rs
    reject = rj
  })
  const fxCount = {
    current: 0,
    req,
    resolve,
    reject,
    syncComplete: false,
  }
  let fxID = 0

  const tryCompleteInitPhase = () => {
    if (!fxCount.syncComplete) return
    if (fxCount.current !== 0) return
    const id = fxID
    Promise.resolve().then(() => {
      if (id !== fxID) return
      fxCount.resolve()
    })
  }

  const refs = new Map()
  const handlers = new Map()
  queryClone({ op: "fx" }, (node) => {
    const { scope, seq } = node
    scope.done = findClone(scope.done)
    scope.fail = findClone(scope.fail)
    scope.anyway = findClone(scope.anyway)

    Effector.forward({
      from: getNode(scope.anyway),
      to: Effector.createNode({
        meta: { fork: true },
        node: [
          Effector.step.barrier({}),
          Effector.step.barrier({}),
          Effector.step.run({
            fn() {
              fxCount.current -= 1
              // console.log('in flight effects: %d', fxCount.current)
              if (fxCount.current === 0) {
                fxID += 1
                tryCompleteInitPhase()
              }
            },
          }),
        ],
      }),
    })
  })
  queryItem({ unit: "store" }, (item) => {
    cloneRef(item.seq[1].data.store)
    cloneRef(item.seq[3].data.store)
  })
  queryItem({ op: "sample", sample: "source" }, (item) => {
    cloneRef(item.scope.hasSource)
    cloneRef(item.seq[0].data.store)
  })
  queryItem({ op: "sample", sample: "clock" }, (item) => {
    cloneRef(item.scope.hasSource)
    cloneRef(item.scope.sourceState)
    cloneRef(item.scope.clockState)
  })
  queryItem({ op: "sample", sample: "store" }, (item) => {
    cloneRef(item.scope.state)
  })
  queryItem({ op: "combine" }, (item) => {
    cloneRef(item.scope.target)
    cloneRef(item.scope.isFresh)
  })

  queryClone({ unit: "store" }, (node) => {
    const { seq, meta } = node
    const plainState = getRef(seq[1].data.store)
    const oldState = getRef(seq[3].data.store)
    seq[1] = copyStep(seq[1])
    seq[2] = copyStep(seq[2])
    seq[3] = copyStep(seq[3])
    seq[1].data.store = plainState
    seq[2].data.store = oldState
    seq[3].data.store = oldState
    meta.plainState = plainState
    meta.wrapped = wrapStore(node)
  })
  queryClone({ op: "sample", sample: "source" }, ({ scope, seq }) => {
    scope.hasSource = getRef(scope.hasSource)
    seq[0].data.store = getRef(seq[0].data.store)
  })
  queryClone({ op: "sample", sample: "clock" }, ({ scope }) => {
    scope.hasSource = getRef(scope.hasSource)
    scope.sourceState = getRef(scope.sourceState)
    scope.clockState = getRef(scope.clockState)
  })
  queryClone({ op: "sample", sample: "store" }, ({ scope }) => {
    scope.state = getRef(scope.state)
  })
  queryClone({ op: "combine" }, ({ scope }) => {
    scope.target = getRef(scope.target)
    scope.isFresh = getRef(scope.isFresh)
  })

  queryClone({ op: "map" }, ({ scope }) => {
    if (scope.state) {
      scope.state = getRef(scope.state)
    }
  })
  queryClone({ op: "on" }, ({ scope }) => {
    scope.state = getRef(scope.state)
  })

  queryClone({ unit: "domain" }, ({ scope }) => {
    scope.history = {
      domains: new Set(),
      stores: new Set(),
      events: new Set(),
      effects: new Set(),
    }
  })
  queryClone({ unit: "effect" }, ({ scope, seq }) => {
    scope.runner = findClone(scope.runner)
    seq.push(
      Effector.step.tap({
        fn() {
          fxCount.current += 1
          // console.log('in flight effects: %d', fxCount.current)
          fxID += 1
        },
      }),
    )
  })
  queryClone({ op: "watch" }, ({ scope }) => {
    const handler = scope.handler
    scope.handler = (data) => {
      stack.push(findClone)
      try {
        handler(data)
      } finally {
        stack.pop()
      }
    }
  })

  clones.forEach((clone) => {
    reallocSiblings(clone.next)
    reallocSiblings(clone.family.links)
    reallocSiblings(clone.family.owners)
  })
  return {
    syncComplete() {
      fxCount.syncComplete = true
      if (fxCount.current === 0) {
        fxID += 1
        tryCompleteInitPhase()
      }
    },
    req,
    scope: {
      find: findClone,
      graphite: Effector.createNode({
        node: [],
        meta: { unit: "domain" },
        family: {
          type: "domain",
          links: clones,
        },
      }),
    },
  }
  function queryItem(query, cb) {
    queryList(list, query, cb)
  }
  function queryClone(query, cb) {
    queryList(clones, query, cb)
  }
  function queryList(list, query, cb) {
    list
      .filter((item) => {
        for (const key in query) {
          if (item.meta[key] !== query[key]) return false
        }
        return true
      })
      .forEach(cb)
  }
  function getRef(ref) {
    if (ref == null) throw Error("no ref")
    if (!refs.has(ref)) throw Error("no ref found")
    return refs.get(ref)
  }
  function cloneRef(ref) {
    if (ref == null) throw Error("no ref")
    if (refs.has(ref)) return
    refs.set(ref, { ...ref })
  }
  function reallocSiblings(siblings) {
    siblings.forEach((node, i) => {
      if (!node.meta.fork) siblings[i] = findClone(node)
    })
  }
  function findClone(unit) {
    unit = unit.graphite || unit
    let index = list.indexOf(unit)
    if (index === -1) index = clones.indexOf(unit)
    if (index === -1) throw Error("not found")
    return clones[index]
  }
  function copyStep(step) {
    return {
      id: step.id,
      id: step.id,
      type: step.type,
      data: { ...step.data },
    }
  }
  function getNode(unit) {
    return unit.graphite || unit
  }
  function copyUnit(node) {
    return Effector.createNode({
      node: [...node.seq.map(copyStep)],
      child: [...node.next],
      family: {
        type: node.family.type,
        links: [...node.family.links],
        owners: [...node.family.owners],
      },
      meta: { ...node.meta },
      scope: { ...node.scope },
    })
  }
  function flatGraph(unit) {
    const visited = new Set()
    traverse(unit.graphite || unit)
    function traverse(node) {
      if (visited.has(node)) return
      visited.add(node)
      node.next.forEach(traverse)
      node.family.owners.forEach(traverse)
      node.family.links.forEach(traverse)
    }
    return [...visited]
  }
  function wrapStore(node) {
    return {
      kind: "store",
      getState: () => node.meta.plainState.current,
      updates: {
        watch: (cb) => createWatch(node, cb),
      },
      graphite: node,
      family: node.family,
    }
  }
}
