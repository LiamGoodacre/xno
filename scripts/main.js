define([
  'react',
  'bacon',
  'mori',
  'lens',
  ''
], function (React, Bacon, M, L) {
  var _ = React.DOM

  /*
  Sca = A | B | C
  Loc = Sca * Sca
  Player = X | O
  Board = Map Loc Player
  Play = Active | Draw | Won
  Game = Player * Play * Board
  Void = () -> ()
  Action = Bus (Game -> Game) -> Void
  */

  /* A scalar is a three-valued type for col/row indexing */
  var A = 'A'
  var B = 'B'
  var C = 'C'

  /* A location is a pair of scalars */
  var Loc = function (col, row) {
    return M.hash_map('col', col, 'row', row) }
  var col = L.lens('col')
  var row = L.lens('row')

  var allPlaces = [
    [Loc(A, A), Loc(B, A), Loc(C, A)],
    [Loc(A, B), Loc(B, B), Loc(C, B)],
    [Loc(A, C), Loc(B, C), Loc(C, C)]
  ]

  /* A player is either X or O */
  var X = 'X'
  var O = 'O'

  /* Play is either Active, a Draw, or Won */
  var Active = 'Active'
  var Draw = 'Draw'
  var Won = 'Won'

  /* A game board is a mapping from Locations to Players */
  var Board = M.hash_map //: Map Loc Player

  /* A game is a hash of a player, a play state, and a board */
  var Game = function () {
    //  The default game
    return M.hash_map(
      'player', X,        //  Player X to go first
      'play', Active,     //  Ready for play
      'board', Board()    //  The empty board
    )
  }

  /* Lenses for games and boards */
  var player = L.lens('player')
  var play = L.lens('play')
  var board = L.lens('board')
  var at = function (k) {
    return L.comp(board, L.lens(k))
  }

  var otherPlayer = function (player) {
    return (X == player) ? O : X
  }

  var switchPlayer = player.mod(otherPlayer)

  var step = function (game, input) {
    return input(game) }

  var Action = function (f) {
    return function (actionBus) {
      return function () { return actionBus.push(f) }
    }
  }

  var reset = Action(Game)

  var place = function (loc) {
    return Action(function (game) {
      var p = player.get(game)
      var g = at(loc).set(p)(game)
      return switchPlayer(g)
    })
  }

  var Btn = function (ps, xs) {
    ps.className += ' btn btn-default btn-lg '
    return _.button(ps, xs)
  }

  var Grid = function (actions, grid) {
    return _.pre({ className: 'well text-center' }, allPlaces.map(function (places) {
      return _.div(null, places.map(function (p) {
        return Btn({ onClick: place(p)(actions) },
          _.span(null, (at(p).get(grid) || '-').toString()))
      }))
    }))
  }

  var Debug = function (game) {
    return _.div(null, [
      _.h2(null, 'State'),
      _.pre({ className: 'well' }, game.toString())
    ])
  }

  var render = function (actions) {
    return function (game) {
      return _.div(null, [
        _.div(null, [
          _.h1(null, 'Xs and Os'),
          _.h2(null, 'GAME ON!') ]),
        _.blockquote(null, 'Player: ' + player.get(game).toString()),
        Grid(actions, game),
        _.div(null, Btn({ onClick: reset(actions) }, 'Reset')),
        Debug(game)
      ])
    }
  }

  var input = new Bacon.Bus()
  var games = input.scan(Game(), step)
  var views = games.map(render(input))

  views.onValue(function (dom) {
    return React.renderComponent(dom, document.querySelector('.game'))
  })

})