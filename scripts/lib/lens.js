/*
  Author: Liam Goodacre
*/
define(['mori'], function (M) {
  var Lib = {}

  var mod = Lib.mod = function (l) {
    return function (f) {
      return function (m) {
        return l.set(f(l.get(m)))(m)
      }
    }
  }

  var Lens = Lib.Lens = function (get, set) {
    var inst = {}
    inst.get = get
    inst.set = set
    inst.mod = mod(inst)
    return inst
  }

  var get = function (k) {
    return function (m) { return M.get(m, k) }
  }

  var set = function (k) {
    return function (v) {
      return function (m) { return M.assoc(m, k, v) }
    }
  }

  var lens = Lib.lens = function (k) {
    return Lens(get(k), set(k))
  }

  Lib.get = function (l) { return l.get }
  Lib.set = function (l) { return l.set }

  var id = function (v) { return v }

  var constant = function (v) {
    return function () { return v }
  }

  var idLens = Lib.id = Lens(id, constant)

  var comp = Lib.comp = function (f, g) {
    return Lens(
      function (m) { return g.get(f.get(m)) },
      function (v) {
        return function (m) {
          var n = f.get(m)
          return f.set(g.set(v)(n))(m)
        }
      })
  }

  var seq = Lib.seq = function (xs) {
    return xs.reduce(comp, idLens)
  }

  var path = Lib.path = function (xs) {
    return seq(xs.map(lens))
  }

  return Lib
})