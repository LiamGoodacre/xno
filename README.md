xno
===

Functional Noughts and Crosses


Libraries used
--------------

* [Bacon.js](http://baconjs.github.io/)
* [Mori](http://swannodette.github.io/mori/)
* [React](http://facebook.github.io/react/)
* [RequireJS](http://www.requirejs.org/)


Concepts
--------

* Functional Reactive Programming - Bacon
* Immutability - Mori
* Basic Lenses - Enhancing Mori
* View is a function of state - React


Design
======

Attributes
----------

*Two players* -
X and O.

*Game board* -
3 by 3 grid of buttons.

*Reset button* -
Reset the board and start a new game.

*Forfeit button* -
Ends the game, the non-active player wins.

*Scores* -
Each player has a score, initially set to 0.
Winning a game increases your score by 1.



Types
-----

A coordinate system is used to reference the grid locations.
A scalar value is either `A`, `B`, or `C`.
A pair of scalar values make up a location.
Locations identify grid locations, e.g:

* `(A, A)` is left-top
* `(B, A)` is middle-top

~~~hs
Scalar = A | B | C
Loc = Scalar * Scalar
~~~

A player is either `X` or `O`.

~~~hs
Player = X | O
~~~

A board is a mapping from locations to players.

~~~hs
Board = Map Loc Player
~~~

The game can be in one of three modes: `Active`, `Draw`, or `Won`.

~~~hs
Play = Active | Draw | Won
~~~

Score is defined as an association between players and natural numbers.

~~~hs
Score = Map Player Nat
~~~

A game is the combination of:
* a current `Player`
* a state of `Play`
* a `Board` state
* and a `Score` table

~~~hs
Game = Player * Play * Board * Score
~~~

An operation that changes a game is called an `Action`.

~~~hs
Action = Game -> Game
~~~

Actions include:
* Resetting the game
* A player taking their go
* A player forfeiting the current game



Arcitechture
------------

Possible instances for `Player`, `Scalar`, and `Play` are modelled as
strings:

~~~javascript
var X = "X"
var O = "O"
var A = "A"
var B = "B"
//  etc.
~~~

A location is a Mori hash_map with two keys:

~~~js
var Loc = function (col, row) {
    return M.hash_map('col', col, 'row', row) }
~~~

A `Board` is a Mori hash_map from locations to players.

~~~js
var Board = M.hash_map
~~~

`Score` is a Mori hash_map from Players to Naturals.
The default `Score` has both players associated with 0.

~~~js
var Score = function () {
  return M.hash_map(X, 0, O, 0) }
~~~

A `Game` has a current `Player`, `Play`, `Board`, and `Score`.
* Default player is `X`
* Default play is `Active`
* Default board is empty
* Default scores are 0

~~~js
var Game = function () {
  //  The default game
  return M.hash_map(
    'player', X,        //  Player X to go first
    'play', Active,     //  Ready for play
    'board', Board(),   //  The empty board
    'score', Score()    //  Initial scores
  ) }
~~~
