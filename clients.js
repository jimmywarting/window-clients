(() => {
  // My own identity
  const ID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8)
    return v.toString(16)
  })

  let installed = true // document visibilityChange syncs data after unload event
  let bc = new BroadcastChannel('$clients$polyfill$')
  let hidden
  let visibilityChange
  
  // This is my window state
  let state = {
    focused: document.hasFocus(),
    visibilityState: document[hidden] ? 'hidden' : 'visible',
    url: location.href
  }
  
  // holds all client id's
  const idMap = {}
  
  // Set the name of the hidden property and the change event for visibility
  if (typeof document.hidden !== 'undefined') {
    hidden = 'hidden'
    visibilityChange = 'visibilitychange'
  } else if (typeof document.webkitHidden !== 'undefined') {
    hidden = 'webkitHidden'
    visibilityChange = 'webkitvisibilitychange'
  }
  
  bc.onmessage = evt => {
    let [id, type, data] = evt.data
    
    if (type === 'install') {
      idMap[id] = data
      bc.postMessage([ID, 'stateChange', state])
    }

    if (type === 'uninstall') {
      delete idMap[id]
    }

    if (type === 'stateChange') {
      idMap[id] = data
    }

    if (type === 'navigate' && id === ID) {
      location.href = data
    }

    if (type === 'focus' && id === ID) {
      window.focus()
    }

    if (type === 'msg' && id === ID) {
      window.postMessage(data, '*')
    }
  }

  function handleStateChange() {
    state = {
      focused: document.hasFocus(),
      visibilityState: document[hidden] ? 'hidden' : 'visible',
      url: location.href
    }
    installed && bc.postMessage([ID, 'stateChange', state])
  }

  // I would have done a getter method but the state can't be retrived
  // synchronous so we sync them whenever they change
  window.addEventListener('popstate', handleStateChange, false)
  window.addEventListener('focus', handleStateChange, false)
  window.addEventListener('blur', handleStateChange, false)
  window.addEventListener('beforeunload', () => {
    installed = false
    bc.postMessage([ID, 'uninstall'])
  }, true)

  // let bc = new BroadcastChannel('$clients$polyfill$')
  // window.addEventListener('beforeunload', () => bc.postMessage(["4699d574-0e9a-4ab1-8279-7e8c6925d3b5", 'uninstall']), false)
  document.addEventListener(visibilityChange, handleStateChange, false)

  bc.postMessage([ID, 'install', state])
  
  class Client {
    constructor(id) {
      this.id = id
      this.frameType = 'top-level'
    }

    get url() {
      return idMap[this.id].url
    }
    
    postMessage(msg) {
      bc.postMessage([this.id, 'msg', msg])
    }

    [Symbol.toStringTag] () {
      return 'Client'
    }
  }

  class WindowClient extends Client {

    // Won't work :(
    focus() {
      bc.postMessage([this.id, 'focus', url])
    }

    // Returns a boolean wether or not the document is focused
    get focused() {
      return idMap[this.id].focused
    }

    // returns a string if the page is visible, not neccerarly focused
    get visibilityState() {
      return idMap[this.id].visibilityState
    }

    // Change the pages url
    navigate(url) {
      bc.postMessage([this.id, 'navigate', url])
    }

    [Symbol.toStringTag]() {
      return 'WindowClient'
    }
  }

  window.clients = new class Clients {
    claim() {}

    get(id) {
      let res = idMap[id] ? new WindowClient(id) : void 0
      return Promise.resolve(res)
    }

    matchAll(opts) {
      return Promise.resolve(
        Object.keys(idMap)
        .filter(id => id !== ID) // ignore self
        .map(id => new WindowClient(id))
      )
    }

    openWindow(url) {
      window.open(url)
    }
    
    [Symbol.toStringTag]() {
      return 'Clients'
    }
  }

})()
