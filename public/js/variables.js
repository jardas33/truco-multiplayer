// Game Configuration
const CONFIG = {
    TIMINGS: {
        BOT_PLAY: 2000,
        END_ROUND: 3000,
        POPUP_AUTO_CLOSE: 5000
    },
    CARD_DIMENSIONS: {
        WIDTH: 85,
        HEIGHT: 123
    }
};

// Game State
window.gameState = {
    currentPhase: 'menu', // menu, playing, instructions, cardValues
    isInTrucoPhase: false,
    selfPlayer: 1,
    showAllCards: true
};

// Game Assets
window.gameAssets = {
    backgroundImage: null,
    backCardImage: null,
    popupframeImage: null,
    cardImages: {}
};

// Game Elements
window.gameElements = {
    deck: [],
    playerPositions: [],
    playedCards: [],
    scores: {
        team1: {
            rounds: 0,
            games: 0,
            sets: 0
        },
        team2: {
            rounds: 0,
            games: 0,
            sets: 0
        }
    }
};

// UI Elements
window.ui = {
    buttons: {
        truco: null,
        acceptTruco: null,
        rejectTruco: null,
        raiseTruco: null,
        start: null,
        instructions: null,
        cardValues: null,
        backToMainMenu: null
    },
    divs: {
        menu: null,
        game: null,
        instructions: null,
        values: null,
        playerList: null
    },
    popup: {
        element: null,
        message: null,
        timeoutId: null,
        onlyClose: null
    }
};

// Game Instance
window.game = null;

// Initialize UI references
document.addEventListener('DOMContentLoaded', () => {
    // Initialize div references
    window.ui.divs.menu = document.getElementById('Menu');
    window.ui.divs.game = document.getElementById('Game');
    window.ui.divs.instructions = document.getElementById('Instructions');
    window.ui.divs.values = document.getElementById('Values');
    window.ui.divs.playerList = document.getElementById('playerList');

    // Initialize button references
    window.ui.buttons.truco = document.getElementById('trucoButton');
    window.ui.buttons.start = document.getElementById('startGameBtn');
    window.ui.buttons.instructions = document.getElementById('instructionsButton');
    window.ui.buttons.cardValues = document.getElementById('cardValuesButton');
    window.ui.buttons.backToMainMenu = document.getElementById('backToMainMenuButton');
});

// Export configuration for modules that need it
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        gameState: window.gameState,
        gameAssets: window.gameAssets,
        gameElements: window.gameElements,
        ui: window.ui
    };
}