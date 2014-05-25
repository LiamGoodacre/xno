/*
  Some basic lens functionality with helpers for Mori.

  Author: Liam Goodacre
*/
define(['lib/mori'], function (M) {
  var Lib = {}

  //  Modify
  //: Lens m a -> (a -> b) -> m a -> m b
  var mod = Lib.mod = function (l) {
    return function (f) {
      return function (m) {
        return l.set(f(l.get(m)))(m)
      }
    }
  }

  //  The lens constructor
  var Lens = Lib.Lens = function (get, set) {
    var inst = {}
    inst.get = get
    inst.set = set
    //  Provide a convenience modify method
    inst.mod = mod(inst)
    return inst
  }

  //  Accessor functions
  Lib.get = function (l) { return l.get }
  Lib.set = function (l) { return l.set }

  //  The identity lens
  var idLens = Lib.id = Lens(
    function (v) { return v },
    function (v) { return function () { return v } })

  //  Lens composition
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

  //  Lens sequencing (folded composition)
  var seq = Lib.seq = function (xs) {
    return xs.reduce(comp, idLens)
  }


  /*  Mori specific  */

  //  Construct a Mori lens
  var lens = Lib.lens = function (k) {
    return Lens(
      function (m) { return M.get(m, k) },
      function (v) {
        return function (m) { return M.assoc(m, k, v) }
      })
  }

  //  A mori lens path
  //  Given a collection of keys
  //  Build mori lenses form them
  //  Then sequence them
  var path = Lib.path = function (xs) {
    return seq(xs.map(lens))
  }

  return Lib
})