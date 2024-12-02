class Player {
    constructor(id, team) {
        this.id = id;
        this.team = team;
        this.hand = [];
        this.isActive = false;
        this.isBot = false;
    }

    playCard(cardIndex) {
        if (cardIndex >= 0 && cardIndex < this.hand.length) {
            return this.hand.splice(cardIndex, 1)[0];
        }
        return null;
    }
}

// Player management functions
function createPlayer(id, team) {
    return new Player(id, team);
}

function assignTeams(players) {
    // Assign players to teams alternately
    players.forEach((player, index) => {
        player.team = index % 2 === 0 ? 'team1' : 'team2';
    });
}