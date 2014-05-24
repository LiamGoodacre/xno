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
  Score = Map Player Int
  Game = Player * Play * Board * Score
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
  var players = [X, O]

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

  /* Score is a mapping from Players to Integers */
  var Score = function () {
    return M.hash_map(
      X, 0,
      O, 0
    )
  }

  /* A game is a hash of a player, a play state, and a board */
  var Game = function () {
    //  The default game
    return M.hash_map(
      'player', X,        //  Player X to go first
      'play', Active,     //  Ready for play
      'board', Board(),   //  The empty board
      'score', Score()
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
    return L.comp(board, L.lens(k)) }
  var score = L.lens('score')
  var playerScore = function (p) {
    return L.comp(score, L.lens(p)) }

  /* Switch the player in a game. */
  //: Game -> Game
  var switchPlayer = player.mod(otherPlayer)



  /** Actions **/

  //  Reset everything except the score
  var doReset = Action(function (game) {
    var s = score.get(game)
    return score.set(s)(Game())
  })

  var incScore = function (p) {
    return playerScore(p).mod(function (v) { return v + 1 })
  }

  var whenActive = function (f) {
    return function (game) {
      return play.get(game) === Active ? f(game) : game
    }
  }

  var doPlace = function (loc) {
    return Action(whenActive(function (game) {

      var p = player.get(game)
      var g0 = at(loc).set(p)(game)
      return switchPlayer(g0)
    }))
  }

  var doForfeit = Action(whenActive(function (game) {
    var g0 = switchPlayer(game)
    var p = player.get(g0)
    return M.comp(play.set(Won), incScore(p))(g0)
  }))



  /** Rendering **/

  /* What kind of styling should each player be associated with */
  var playerStyle = M.hash_map(
    X, 'info',
    O, 'warning'
  )

  /* Retrieve a player style or default */
  var getStyle = function (p) {
    return M.get(playerStyle, p) || 'default'
  }

  var Scores = function (game) {
    return _.div(null,
      _.h3(null, 'Scores'),
      players.map(function (p) {
        return _.p(null,
          'Player ',
          p.toString(),
          ': ',
          playerScore(p).get(game))
      }))
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

  var statusAlert = M.hash_map(
    Active, function (game) {
      var p = player.get(game)
      var style = getStyle(p)
      return _.div({ className: 'text-center alert alert-' + style },
        player.get(game).toString() + ' to go!')
    },
    Draw, function (game) {
      return _.div({ className: 'alert alert-danger text-center' },
        'It\'s a draw!')
    },
    Won, function (game) {
      return _.div({ className: 'alert alert-success text-center' },
        player.get(game).toString() + ' won!!!')
    }
  )

  var Status = function (game) {
    return M.get(statusAlert, play.get(game))(game)
  }

  var Controls = function (actions) {
    return _.div(null,
      _.button({className: 'btn btn-danger', onClick: doReset(actions) },
        'Reset'),
      ' ',
      _.button({className: 'btn btn-info', onClick: doForfeit(actions) },
        'Forfeit'))
  }

  var Debug = function (game) {
    return _.div(null,
      _.h2(null, 'State'),
      _.pre({ className: 'well' }, game.toString())
    )
  }

  /** Given an action bus, generate a game rendering function.
    * This renders the game info, the game grid, controls, and debug data.
    */
  //: Bus Action -> Game -> DOM
  var render = function (actions) {
    return function (game) {
      return _.div(null,
        _.h1(null, 'Xs and Os'),

        _.div({ className: 'row' },
          _.div({ className: 'col-xs-4' },
            Scores(game)),

          _.div({ className: 'col-xs-8' },
            Grid(actions, game))
        ),

        Status(game),
        Controls(actions),

        Debug(game)
      )
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