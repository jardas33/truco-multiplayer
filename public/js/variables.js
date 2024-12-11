// Game State Enum
const gameStateEnum = {
    Menu: 'menu',
    Playing: 'playing',
    Instructions: 'instructions',
    CardValues: 'cardValues'
};

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
    },
    GAME: {
        MIN_PLAYERS: 2,
        MAX_PLAYERS: 4,
        MAX_BOTS: 3
    }
};

// Game State
window.gameState = {
    currentPhase: gameStateEnum.Menu, // menu, playing, instructions, cardValues
    isInTrucoPhase: false,
    selfPlayer: 1,
    showAllCards: true,
    roomCode: null,
    isHost: false,
    players: [],
    botCount: 0
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
        backToMainMenu: null,
        addBot: null,
        createRoom: null,
        joinRoom: null
    },
    divs: {
        menu: null,
        game: null,
        instructions: null,
        values: null,
        playerList: null,
        roomControls: null
    },
    inputs: {
        roomCode: null
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
    window.ui.divs.roomControls = document.getElementById('roomControls');

    // Initialize button references
    window.ui.buttons.truco = document.getElementById('trucoBtn');
    window.ui.buttons.start = document.getElementById('startGameBtn');
    window.ui.buttons.instructions = document.getElementById('instructionsBtn');
    window.ui.buttons.cardValues = document.getElementById('cardValuesBtn');
    window.ui.buttons.backToMainMenu = document.getElementById('backToMenuBtn');
    window.ui.buttons.addBot = document.getElementById('addBotBtn');
    window.ui.buttons.createRoom = document.getElementById('createRoomBtn');
    window.ui.buttons.joinRoom = document.getElementById('joinRoomBtn');

    // Initialize input references
    window.ui.inputs.roomCode = document.getElementById('roomInput');

    // Setup initial button states
    if (window.ui.buttons.addBot) window.ui.buttons.addBot.style.display = 'none';
    if (window.ui.buttons.start) {
        window.ui.buttons.start.style.display = 'none';
        window.ui.buttons.start.disabled = true;
    }

    console.log('UI elements initialized:', window.ui);
});

// Export configuration for modules that need it
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        gameStateEnum,
        gameState: window.gameState,
        gameAssets: window.gameAssets,
        gameElements: window.gameElements,
        ui: window.ui
    };
}