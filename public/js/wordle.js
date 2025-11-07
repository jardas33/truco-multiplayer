// WORDLE GAME LOGIC

class WordleGame {
    constructor() {
        this.wordLength = 5;
        this.maxGuesses = 6;
        this.currentGuess = '';
        this.guesses = [];
        this.targetWord = '';
        this.gameOver = false;
        this.won = false;
        this.stats = this.loadStats();
        
        // Word lists
        this.validWords = this.getValidWords();
        this.targetWords = this.getTargetWords();
        
        this.init();
    }

    init() {
        this.startNewGame();
        this.createBoard();
        this.createKeyboard();
        this.updateStats();
        this.setupEventListeners();
    }

    getTargetWords() {
        return ['ADULT', 'AGENT', 'ANGER', 'APPLE', 'AWARD', 'BASIS', 'BEACH', 'BIRTH', 'BLOCK', 'BLOOD', 'BOARD', 'BRAIN', 'BREAD', 'BREAK', 'BROWN', 'BUYER', 'CAUSE', 'CHAIN', 'CHAIR', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CLAIM', 'CLASS', 'CLOCK', 'CLOUD', 'COACH', 'COAST', 'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CYCLE', 'DANCE', 'DEATH', 'DEPTH', 'DOUBT', 'DRAFT', 'DRAMA', 'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'EARTH', 'ENEMY', 'ENTRY', 'ERROR', 'EVENT', 'FAITH', 'FAULT', 'FIELD', 'FIGHT', 'FINAL', 'FLOOR', 'FOCUS', 'FORCE', 'FRAME', 'FRANK', 'FRONT', 'FRUIT', 'GLASS', 'GRANT', 'GRASS', 'GREEN', 'GROUP', 'GUIDE', 'HEART', 'HENRY', 'HORSE', 'HOTEL', 'HOUSE', 'IMAGE', 'INDEX', 'INPUT', 'ISSUE', 'JAPAN', 'JONES', 'JUDGE', 'KNIFE', 'LAURA', 'LAYER', 'LEVEL', 'LEWIS', 'LIGHT', 'LIMIT', 'LUNCH', 'MAJOR', 'MARCH', 'MATCH', 'METAL', 'MIGHT', 'MILES', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUTH', 'MUSIC', 'NIGHT', 'NOISE', 'NORTH', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'ORDER', 'OTHER', 'OWNER', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PETER', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLANE', 'PLANT', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIZE', 'PROOF', 'QUEEN', 'RADIO', 'RANGE', 'RAPID', 'RATIO', 'REPLY', 'RIGHT', 'RIVER', 'ROUND', 'ROUTE', 'ROYAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIDED', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEAMS', 'TEETH', 'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIMER', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YOUNG', 'YOURS'];
    }

    getValidWords() {
        return this.targetWords.concat(['ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BASIS', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLANK', 'BLAST', 'BLEND', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOW', 'BLUE', 'BOARD', 'BOAST', 'BOBBY', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BRUSH', 'BUDDY', 'BUILD', 'BUNCH', 'BURST', 'BUYER', 'CABLE', 'CALIF', 'CALM', 'CAMEL', 'CANAL', 'CANDY', 'CANON', 'CARGO', 'CAROL', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHIPS', 'CHOSE', 'CHUCK', 'CHUNK', 'CIVIL', 'CLAIM', 'CLASH', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLIFF', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOUD', 'CLUB', 'CLUMP', 'COACH', 'COAST', 'COBRA', 'COCOA', 'CODES', 'COINS', 'COLOR', 'COMBO', 'COMED', 'COMES', 'COMIC', 'CONDO', 'CONIC', 'COOLS', 'COPSE', 'CORAL', 'CORDS', 'CORER', 'CORES', 'CORKS', 'CORNS', 'CORNY', 'CORPS', 'COSTS', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COUPE', 'COUPS', 'COURT', 'COVEN', 'COVER', 'COVET', 'COVEY', 'COWED', 'COWER', 'COWLS', 'COYER', 'COYLY', 'COZEN', 'CRAFT', 'CRAGS', 'CRAMP', 'CRAMS', 'CRANE', 'CRANK', 'CRAPE', 'CRAPS', 'CRASH', 'CRASS', 'CRATE', 'CRAVE', 'CRAWL', 'CRAWS', 'CRAZE', 'CRAZY', 'CREAK', 'CREAM', 'CREDO', 'CREED', 'CREEK', 'CREEL', 'CREEP', 'CREME', 'CREPE', 'CREPT', 'CRESS', 'CREST', 'CREWS', 'CRIBS', 'CRICK', 'CRIED', 'CRIER', 'CRIES', 'CRIME', 'CRIMP', 'CRISP', 'CRITS', 'CROAK', 'CROCK', 'CROCS', 'CROFT', 'CRONE', 'CRONY', 'CROOK', 'CROON', 'CROPS', 'CROSS', 'CROUP', 'CROWD', 'CROWN', 'CROWS', 'CRUDE', 'CRUEL', 'CRUET', 'CRUMB', 'CRUMP', 'CRUSH', 'CRUST', 'CRYPT', 'CUBBY', 'CUBED', 'CUBER', 'CUBES', 'CUBIC', 'CUBIT', 'CUDDY', 'CUFFS', 'CUING', 'CULLS', 'CULTS', 'CUMIN', 'CUNTS', 'CUPID', 'CUPPA', 'CURBS', 'CURDS', 'CURED', 'CURER', 'CURES', 'CURIE', 'CURIO', 'CURLS', 'CURLY', 'CURRY', 'CURSE', 'CURST', 'CURVE', 'CURVY', 'CUSHY', 'CUSPS', 'CUTER', 'CUTIE', 'CUTIS', 'CUTUP', 'CYBER', 'CYCLE', 'CYCLO', 'CYSTS', 'DADDY', 'DANCE', 'DANDY', 'DARED', 'DARER', 'DARES', 'DARKS', 'DARKY', 'DARNS', 'DARTS', 'DASHI', 'DATED', 'DATER', 'DATES', 'DATUM', 'DAUBS', 'DAUBY', 'DAUNT', 'DAVIT', 'DAWNS', 'DAZED', 'DAZES', 'DEALS', 'DEALT', 'DEANS', 'DEARS', 'DEARY', 'DEATH', 'DEBAR', 'DEBIT', 'DEBTS', 'DEBUG', 'DEBUT', 'DECAF', 'DECAL', 'DECAY', 'DECKS', 'DECOR', 'DECOY', 'DECRY', 'DEEDS', 'DEEMS', 'DEEPS', 'DEERS', 'DEFER', 'DEFOG', 'DEFTY', 'DEFUN', 'DEGAS', 'DEICE', 'DEIFY', 'DEIGN', 'DEILS', 'DEISM', 'DEIST', 'DEITY', 'DEKED', 'DEKES', 'DELAY', 'DELED', 'DELFS', 'DELFT', 'DELIS', 'DELTA', 'DELVE', 'DEMIT', 'DEMOB', 'DEMON', 'DEMOS', 'DEMUR', 'DENAR', 'DENES', 'DENIM', 'DENSE', 'DENTS', 'DEPOT', 'DEPTH', 'DERBY', 'DERMA', 'DERMS', 'DERRY', 'DESKS', 'DETER', 'DETOX', 'DEUCE', 'DEVIL', 'DEWAR', 'DEWED', 'DEWER', 'DEXIE', 'DEXYS', 'DHALS', 'DHIKR', 'DHOBI', 'DHOLS', 'DHOWS', 'DIALS', 'DIARY', 'DIAZO', 'DICED', 'DICER', 'DICES', 'DICEY', 'DICKS', 'DICKY', 'DICOT', 'DICTA', 'DIDDY', 'DIDOS', 'DIDST', 'DIEBS', 'DIEMS', 'DIENE', 'DIETS', 'DIFFS', 'DIGIT', 'DIKED', 'DIKES', 'DILDO', 'DILLS', 'DILLY', 'DIMER', 'DIMES', 'DIMLY', 'DINAR', 'DINED', 'DINER', 'DINES', 'DINGO', 'DINGS', 'DINGY', 'DINKS', 'DINKY', 'DINOS', 'DINTS', 'DIODE', 'DIOLS', 'DIPPY', 'DIRER', 'DIRGE', 'DIRKS', 'DIRLS', 'DIRTS', 'DIRTY', 'DISCO', 'DISCS', 'DISHY', 'DISKS', 'DISME', 'DITAS', 'DITCH', 'DITTO', 'DITTS', 'DITTY', 'DITZY', 'DIVAN', 'DIVAS', 'DIVED', 'DIVER', 'DIVES', 'DIVOT', 'DIVVY', 'DIWAN', 'DIXIE', 'DIXIT', 'DIZZY', 'DJINN', 'DJINS', 'DOATS', 'DOBBY', 'DOBIE', 'DOBLA', 'DOBRA', 'DOBRO', 'DOCKS', 'DODGE', 'DODOS', 'DOERS', 'DOEST', 'DOETH', 'DOFFS', 'DOGES', 'DOGEY', 'DOGGO', 'DOGGY', 'DOGIE', 'DOGMA', 'DOILY', 'DOING', 'DOITS', 'DOJOS', 'DOLCE', 'DOLCI', 'DOLED', 'DOLES', 'DOLLS', 'DOLLY', 'DOLMA', 'DOLOR', 'DOLTS', 'DOMAL', 'DOMED', 'DOMES', 'DOMIC', 'DONAS', 'DONEE', 'DONER', 'DONGS', 'DONNA', 'DONNE', 'DONOR', 'DONUT', 'DOOBS', 'DOODY', 'DOOFE', 'DOOFY', 'DOOLY', 'DOOMS', 'DOOMY', 'DOONA', 'DOORS', 'DOOZY', 'DOPAS', 'DOPED', 'DOPER', 'DOPES', 'DOPEY', 'DORAD', 'DORBS', 'DOREE', 'DORES', 'DORIC', 'DORKS', 'DORKY', 'DORMS', 'DORMY', 'DORPS', 'DORRS', 'DORSA', 'DORSE', 'DORTS', 'DORTY', 'DOSAS', 'DOSED', 'DOSER', 'DOSES', 'DOSHA', 'DOTAL', 'DOTED', 'DOTER', 'DOTES', 'DOTTY', 'DOUBT', 'DOUCE', 'DOUCH', 'DOUGH', 'DOULA', 'DOUMA', 'DOUMS', 'DOUPS', 'DOURA', 'DOUSE', 'DOUTS', 'DOVED', 'DOVEN', 'DOVER', 'DOVES', 'DOWDY', 'DOWED', 'DOWEL', 'DOWER', 'DOWIE', 'DOWLS', 'DOWNS', 'DOWNY', 'DOWRY', 'DOWSE', 'DOXED', 'DOXES', 'DOXIE', 'DOYEN', 'DOYER', 'DOYLY', 'DOZED', 'DOZEN', 'DOZER', 'DOZES', 'DRABS', 'DRAFT', 'DRAGS', 'DRAIL', 'DRAIN', 'DRAKE', 'DRAMA', 'DRAMS', 'DRANK', 'DRAPE', 'DRATS', 'DRAVE', 'DRAWL', 'DRAWN', 'DRAWS', 'DRAYS', 'DREAD', 'DREAM', 'DREAR', 'DRECK', 'DREED', 'DREES', 'DRESS', 'DREST', 'DREYS', 'DRIBS', 'DRICE', 'DRIED', 'DRIER', 'DRIES', 'DRIFT', 'DRILL', 'DRILY', 'DRINK', 'DRIPS', 'DRIPT', 'DRIVE', 'DROID', 'DROIT', 'DROLE', 'DROLL', 'DROME', 'DRONE', 'DRONY', 'DROOL', 'DROOP', 'DROPS', 'DROPT', 'DROSS', 'DROVE', 'DROWN', 'DROWS', 'DRUBS', 'DRUGS', 'DRUID', 'DRUMS', 'DRUNK', 'DRUPE', 'DRUSE', 'DRUSY', 'DRUXY', 'DRYAD', 'DRYER', 'DRYLY', 'DUADS', 'DUALS', 'DUCAL', 'DUCAT', 'DUCES', 'DUCHY', 'DUCKS', 'DUCKY', 'DUCTS', 'DUDDY', 'DUDED', 'DUDES', 'DUELS', 'DUETS', 'DUFFS', 'DUFUS', 'DUING', 'DUITS', 'DUKED', 'DUKES', 'DULCE', 'DULIA', 'DULLS', 'DULLY', 'DULSE', 'DUMAS', 'DUMBO', 'DUMBS', 'DUMMY', 'DUMPS', 'DUMPY', 'DUNCE', 'DUNCH', 'DUNES', 'DUNGS', 'DUNGY', 'DUNKS', 'DUNTS', 'DUOMI', 'DUOMO', 'DUPED', 'DUPER', 'DUPES', 'DUPLE', 'DUPLY', 'DURAL', 'DURAS', 'DURED', 'DURES', 'DURNS', 'DUROC', 'DUROS', 'DURRA', 'DURRS', 'DURRY', 'DURST', 'DURUM', 'DUSKS', 'DUSKY', 'DUSTS', 'DUSTY', 'DUTCH', 'DUVET', 'DUXES', 'DWAAL', 'DWALE', 'DWALM', 'DWAMS', 'DWANG', 'DWARF', 'DWEBS', 'DWEEB', 'DWELL', 'DWELT', 'DWILE', 'DWINE', 'DYADS', 'DYERS', 'DYING', 'DYKED', 'DYKES', 'DYNEL', 'DYNES', 'DZHOS']);
    }

    startNewGame() {
        this.currentGuess = '';
        this.guesses = [];
        this.gameOver = false;
        this.won = false;
        this.targetWord = this.targetWords[Math.floor(Math.random() * this.targetWords.length)];
        console.log('Target word:', this.targetWord);
    }

    createBoard() {
        const board = document.getElementById('gameBoard');
        board.innerHTML = '';
        for (let i = 0; i < this.maxGuesses; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.id = `row-${i}`;
            for (let j = 0; j < this.wordLength; j++) {
                const tile = document.createElement('div');
                tile.className = 'letter-tile';
                tile.id = `tile-${i}-${j}`;
                row.appendChild(tile);
            }
            board.appendChild(row);
        }
    }

    createKeyboard() {
        const keyboard = document.getElementById('keyboard');
        keyboard.innerHTML = '';
        const rows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
        ];
        rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            row.forEach(key => {
                const keyBtn = document.createElement('button');
                keyBtn.className = 'key';
                keyBtn.textContent = key;
                if (key === 'ENTER' || key === 'BACK') {
                    keyBtn.classList.add('wide');
                }
                keyBtn.onclick = () => this.handleKeyPress(key);
                rowDiv.appendChild(keyBtn);
            });
            keyboard.appendChild(rowDiv);
        });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            const key = e.key.toUpperCase();
            if (key === 'ENTER') {
                this.handleKeyPress('ENTER');
            } else if (key === 'BACKSPACE') {
                this.handleKeyPress('BACK');
            } else if (/^[A-Z]$/.test(key)) {
                this.handleKeyPress(key);
            }
        });
    }

    handleKeyPress(key) {
        if (this.gameOver) return;
        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACK') {
            this.removeLetter();
        } else if (/^[A-Z]$/.test(key) && this.currentGuess.length < this.wordLength) {
            this.addLetter(key);
        }
    }

    addLetter(letter) {
        if (this.currentGuess.length < this.wordLength) {
            this.currentGuess += letter;
            this.updateBoard();
        }
    }

    removeLetter() {
        if (this.currentGuess.length > 0) {
            this.currentGuess = this.currentGuess.slice(0, -1);
            this.updateBoard();
        }
    }

    updateBoard() {
        const rowIndex = this.guesses.length;
        const row = document.getElementById(`row-${rowIndex}`);
        if (!row) return;
        for (let i = 0; i < this.wordLength; i++) {
            const tile = row.children[i];
            if (i < this.currentGuess.length) {
                tile.textContent = this.currentGuess[i];
                tile.classList.add('filled');
            } else {
                tile.textContent = '';
                tile.classList.remove('filled');
            }
        }
    }

    submitGuess() {
        if (this.currentGuess.length !== this.wordLength) return;
        const guess = this.currentGuess.toUpperCase();
        if (!this.validWords.includes(guess)) {
            this.showInvalidWord();
            return;
        }
        this.guesses.push(guess);
        this.evaluateGuess(guess);
        this.currentGuess = '';
        this.updateBoard();
    }

    showInvalidWord() {
        const rowIndex = this.guesses.length;
        const row = document.getElementById(`row-${rowIndex}`);
        if (row) {
            row.classList.add('shake');
            setTimeout(() => row.classList.remove('shake'), 500);
        }
    }

    evaluateGuess(guess) {
        const rowIndex = this.guesses.length - 1;
        const row = document.getElementById(`row-${rowIndex}`);
        const result = this.getGuessResult(guess);
        
        for (let i = 0; i < this.wordLength; i++) {
            const tile = row.children[i];
            tile.textContent = guess[i];
            setTimeout(() => {
                tile.classList.add(result[i]);
                this.updateKeyboard(guess[i], result[i]);
            }, i * 100);
        }

        if (guess === this.targetWord) {
            this.won = true;
            this.gameOver = true;
            this.stats.gamesPlayed++;
            this.stats.wins++;
            this.stats.currentStreak++;
            this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.currentStreak);
            this.saveStats();
            setTimeout(() => this.showMessage('You Won!', this.targetWord), 1500);
        } else if (this.guesses.length >= this.maxGuesses) {
            this.gameOver = true;
            this.stats.gamesPlayed++;
            this.stats.currentStreak = 0;
            this.saveStats();
            setTimeout(() => this.showMessage('Game Over', this.targetWord), 1500);
        }
        this.updateStats();
    }

    getGuessResult(guess) {
        const result = new Array(this.wordLength).fill('absent');
        const targetLetters = this.targetWord.split('');
        const guessLetters = guess.split('');
        const used = new Array(this.wordLength).fill(false);

        for (let i = 0; i < this.wordLength; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                result[i] = 'correct';
                used[i] = true;
            }
        }

        for (let i = 0; i < this.wordLength; i++) {
            if (result[i] !== 'correct') {
                for (let j = 0; j < this.wordLength; j++) {
                    if (!used[j] && guessLetters[i] === targetLetters[j]) {
                        result[i] = 'present';
                        used[j] = true;
                        break;
                    }
                }
            }
        }

        return result;
    }

    updateKeyboard(letter, status) {
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            if (key.textContent === letter) {
                if (!key.classList.contains('correct')) {
                    key.classList.remove('present', 'absent');
                    key.classList.add(status);
                }
            }
        });
    }

    showMessage(title, word) {
        const message = document.getElementById('message');
        const content = document.getElementById('messageContent');
        const wordEl = document.getElementById('messageWord');
        content.textContent = title;
        wordEl.textContent = word;
        message.classList.add('show');
    }

    closeMessage() {
        const message = document.getElementById('message');
        message.classList.remove('show');
        this.startNewGame();
        this.createBoard();
        this.resetKeyboard();
        this.updateStats();
    }

    resetKeyboard() {
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove('correct', 'present', 'absent');
        });
    }

    loadStats() {
        const saved = localStorage.getItem('wordleStats');
        return saved ? JSON.parse(saved) : {
            gamesPlayed: 0,
            wins: 0,
            currentStreak: 0,
            maxStreak: 0
        };
    }

    saveStats() {
        localStorage.setItem('wordleStats', JSON.stringify(this.stats));
    }

    updateStats() {
        document.getElementById('gamesPlayed').textContent = this.stats.gamesPlayed;
        const winRate = this.stats.gamesPlayed > 0 ? 
            Math.round((this.stats.wins / this.stats.gamesPlayed) * 100) : 0;
        document.getElementById('winRate').textContent = winRate + '%';
        document.getElementById('currentStreak').textContent = this.stats.currentStreak;
    }
}

function showInstructions() {
    document.getElementById('instructionsModal').classList.add('show');
}

function closeInstructions() {
    document.getElementById('instructionsModal').classList.remove('show');
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.wordleGame = new WordleGame();
});

