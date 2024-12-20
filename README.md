# trucogame
Code for truco game

Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.

In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.

The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.

The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that called 'truco' wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.

Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.

Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions.
