import Module from 'node:module'

// Stubs `server-only` (which throws outside Next's bundler) so backend
// modules can be exercised from standalone tsx scripts.
const origLoad = Module._load
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Module._load = function (request, parent, isMain) {
  if (request === 'server-only') return {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return origLoad.call(this, request, parent, isMain)
}
