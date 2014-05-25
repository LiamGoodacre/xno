define([
  'react',
  'bacon',
  'mori',
  'lens'
], function (React, Bacon, M, L) {

  /** Types **

  Scalar = A | B | C
  Loc = Scalar * Scalar
  Player = X | O
  Board = Map Loc Player
  Play = Active | Draw | Won
  Score = Map Player Nat
  Game = Player * Play * Board * Score
  Action = Game -> Game

  */

  //  A scalar is a three-valued type for col/row indexing
  var A = 'A'
  var B = 'B'
  var C = 'C'

  //  A location is a pair of scalars
  var Loc = function (col, row) {
    return M.hash_map('col', col, 'row', row) }

  var col = L.lens('col')
  var row = L.lens('row')

  var gridPlaces = [
    [Loc(A, A), Loc(B, A), Loc(C, A)],
    [Loc(A, B), Loc(B, B), Loc(C, B)],
    [Loc(A, C), Loc(B, C), Loc(C, C)]]

  var allPlaces = M.flatten(gridPlaces)

  //  A player is either X or O
  var X = 'X'
  var O = 'O'

  //  Given a player, return the other.
  //: Player -> Player
  var otherPlayer = function (player) {
    return (X == player) ? O : X }

  //  Play is either Active, a Draw, or Won
  var Active = 'Active'
  var Draw = 'Draw'
  var Won = 'Won'

  //  A game board is a mapping from Locations to Players
  //: Map Loc Player
  var Board = M.hash_map

  //  Score is a mapping from Players to Integers
  //: Map Player Int
  var Score = function () {
    return M.hash_map(X, 0, O, 0) }

  var Game = function () {
    //  The default game
    return M.hash_map(
      'player', X,        //  Player X to go first
      'play', Active,     //  Ready for play
      'board', Board(),   //  The empty board
      'score', Score()    //  Initial scores
    ) }

  //  Lenses for games and boards
  var player = L.lens('player')
  var play = L.lens('play')
  var board = L.lens('board')

  var at = function (k) {
    return L.comp(board, L.lens(k)) }

  var score = L.lens('score')
  var playerScore = function (p) {
    return L.comp(score, L.lens(p)) }

  //  Switch the player in a game.
  //: Game -> Game
  var switchPlayer = player.mod(otherPlayer)



  /** Actions **/

  //  Reset everything except the score
  //: Action
  var reset = function (game) {
    return score.set(score.get(game))(Game()) }

  //: Player -> Action
  var incScore = function (p) {
    return playerScore(p).mod(function (v) { return v + 1 }) }

  //: Action -> Action
  var whenActive = function (f) {
    return function (game) {
      return (play.get(game) === Active) ? f(game) : game } }


  var winningPaths = [
    //  Diagonals
    [Loc(A, A), Loc(B, B), Loc(C, C)],
    [Loc(C, A), Loc(B, B), Loc(A, C)],

    //  Verticals
    [Loc(A, A), Loc(A, B), Loc(A, C)],
    [Loc(B, A), Loc(B, B), Loc(B, C)],
    [Loc(C, A), Loc(C, B), Loc(C, C)],

    //  Horizontals
    [Loc(A, A), Loc(B, A), Loc(C, A)],
    [Loc(A, B), Loc(B, B), Loc(C, B)],
    [Loc(A, C), Loc(B, C), Loc(C, C)]]

  //  Test that a path through the board contains all the same players
  //: Game * [Loc] -> Bool
  var winningPath = function (game, path) {
    var base = M.first(path)
    var rest = M.rest(path)
    var p = at(base).get(game)
    return p ? M.every(function (loc) {
      return (p === at(loc).get(game))
    }, rest) : false }

  //  Test forall winning paths that at least one contains all the same players
  //: Game -> Bool
  var winningState = function (game) {
    return M.some(M.partial(winningPath, game), winningPaths) }

  //  Test that no futher moves can be made
  //: Game -> Bool
  var noMovesLeft = function (game) {
    return M.every(function (loc) { return at(loc).get(game) }, allPlaces) }

  //  Determine the play state of a game (Won, Draw, etc)
  //: Game -> Play
  var checkState = function (game) {
    return winningState(game) ? Won :
           noMovesLeft(game) ? Draw :
           play.get(game) }

  //  Given a location, attempt to place the current player in that location
  //  Only operates during the Active play state
  //  Calculates the new game play state (Draw, Won, etc)
  //  If Won, increments the player's score
  //  If Active, switch player
  //: Loc -> Action
  var place = function (loc) {
    return whenActive(function (game) {
      var cur = at(loc).get(game)
      if (cur) return game
      else {
        var p = player.get(game)
        var g0 = at(loc).set(p)(game)
        var state = checkState(g0)
        return (state === Active) ?
          switchPlayer(g0) :
          incScore(p)(play.set(state)(g0)) }
    }) }

  //  Forfeits the game for the active player
  //  The other player wins and gains a point
  //:  Action
  var forfeit = whenActive(function (game) {
    var g0 = switchPlayer(game)
    var p = player.get(g0)
    return M.comp(play.set(Won), incScore(p))(g0) })



  /** Rendering **/
  var _ = React.DOM

  //  What kind of styling should each player be associated with
  var playerStyle = M.hash_map(
    X, 'info',
    O, 'warning')

  //  Retrieve a player style or default
  var getStyle = function (p) {
    return M.get(playerStyle, p) || 'default'}

  var Scores = function (game) {
    return _.div(null,
      _.h3(null, 'Scores'),
      [X, O].map(function (p) {
        return _.p(null,
          'Player ', p.toString(), ': ', playerScore(p).get(game))
      })) }

  var Grid = function (run, game) {
    return _.pre({ className: 'well text-center' },
      gridPlaces.map(function (places) {

        return _.div(null, places.map(function (p) {
          var cell = at(p).get(game)

          return _.button({
            onClick: run(place(p)),
            className: 'btn btn-lg btn-' + getStyle(cell),
            disabled: Active !== play.get(game)
          }, _.span(null, (cell || '-').toString()))

        }))
      })) }

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
    return M.get(statusAlert, play.get(game))(game) }

  var Controls = function (run, game) {
    return _.div(null,
      _.button({className: 'btn btn-danger', onClick: run(reset) },
        'Reset'),
      ' ',
      _.button(
        { className: 'btn btn-info'
        , onClick: run(forfeit)
        , disabled: Active !== play.get(game) },
        'Forfeit')) }

  var Debug = function (game) {
    return _.div(null,
      _.h2(null, 'State'),
      _.pre({ className: 'well' }, game.toString()) ) }

  // Given an action bus, generate a game rendering function.
  // This renders the game info, the game grid, controls, and debug data.
  //
  //: Bus Action -> Game -> DOM
  var render = function (run) {
    return function (game) {
      return _.div(null,
        _.h1(null, 'Xs and Os'),

        _.div({ className: 'row' },
          _.div({ className: 'col-xs-4' },
            Scores(game)),

          _.div({ className: 'col-xs-8' },
            Grid(run, game))
        ),

        Status(game),
        Controls(run, game),

        Debug(game) ) } }



  /** Input, state, and view **/

  //  A bus for any user action (reset, play cell, etc)
  var input = new Bacon.Bus()

  // An action is a function that can update the game state.
  var runAction = function (f) {
    return function () { return input.push(f) } }

  //  Starting at the initial game, update the game based on any user input
  //  that occurs.
  var games = input.scan(Game(),
    function (game, input) { return input(game) })



  //  Convert all game states into React DOM, threadding through the input bus
  //  for the components to link up events (reset button, cells, etc)
  var views = games.map(render(runAction))

  //  Render every view to the real DOM
  views.onValue(function (dom) {
    return React.renderComponent(dom, document.querySelector('.game')) })

})