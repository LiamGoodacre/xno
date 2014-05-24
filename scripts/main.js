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

  /* Given a player, return the other. */
  //: Player -> Player
  var otherPlayer = function (player) {
    return (X == player) ? O : X
  }

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

  /* An action is a function that can update the game state. */
  var Action = function (f) {
    return function (actionBus) {
      return function () { return actionBus.push(f) }
    }
  }

  /* Lenses for games and boards */
  var player = L.lens('player')
  var play = L.lens('play')
  var board = L.lens('board')
  var at = function (k) {
    return L.comp(board, L.lens(k))
  }

  /* Switch the player in a game. */
  //: Game -> Game
  var switchPlayer = player.mod(otherPlayer)



  /** Actions **/

  var doReset = Action(Game)

  var doPlace = function (loc) {
    return Action(function (game) {
      var p = player.get(game)
      var g = at(loc).set(p)(game)
      return switchPlayer(g)
    })
  }



  /** Rendering **/

  /* What kind of styling should each player be associated with */
  var playerStyle = M.hash_map(
    X, 'primary',
    O, 'warning'
  )

  /* Retrieve a player style or default */
  var getStyle = function (p) {
    return M.get(playerStyle, p) || 'default'
  }

  var Info = function (game) {
    var p = player.get(game)
    var style = getStyle(p)

    return _.blockquote(null,
      'Current player: ',
      _.span({ className: 'label label-' + style },
        player.get(game).toString()))
  }

  var Grid = function (actions, grid) {
    return _.pre({ className: 'well text-center' },
      allPlaces.map(function (places) {

        return _.div(null, places.map(function (p) {
          var cell = at(p).get(grid)

          return _.button({
            onClick: doPlace(p)(actions),
            className: 'btn btn-lg btn-' + getStyle(cell)
          }, _.span(null, (cell || '-').toString()))

        }))
      }))
  }

  var Debug = function (game) {
    return _.div(null, [
      _.h2(null, 'State'),
      _.pre({ className: 'well' }, game.toString())
    ])
  }

  /** Given an action bus, generate a game rendering function.
    * This renders the game info, the game grid, controls, and debug data.
    */
  //: Bus Action -> Game -> DOM
  var render = function (actions) {
    return function (game) {
      return _.div(null, [
        _.div(null, [
          _.h1(null, 'Xs and Os'),
          _.h2(null, 'GAME ON!') ]),
        Info(game),
        Grid(actions, game),
        _.div(null,
          _.button({
            className: 'btn btn-danger',
            onClick: doReset(actions)
          }, 'Reset')),
        Debug(game)
      ])
    }
  }



  /** Input, state, and view **/

  //  A bus for any user action (reset, play cell, etc)
  var input = new Bacon.Bus()

  /** Starting at the initial game, update the game based on any user input
    * that occurs.
    */
  var games = input.scan(Game(), function (game, input) {
    return input(game)
  })

  /** Convert all game states into React DOM, threadding through the input bus
    * for the components to link up events (reset button, cells, etc)
    */
  var views = games.map(render(input))

  /* Render every view to the real DOM */
  views.onValue(function (dom) {
    return React.renderComponent(dom, document.querySelector('.game'))
  })

})