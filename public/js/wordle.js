// WORDLE GAME LOGIC - Enhanced Version

class WordleGame {
    constructor() {
        this.wordLength = 5;
        this.maxGuesses = 6;
        this.currentGuess = '';
        this.guesses = [];
        this.targetWord = '';
        this.gameOver = false;
        this.won = false;
        this.isAnimating = false;
        this.stats = this.loadStats();
        
        // Word lists - cached
        this.targetWords = this.getTargetWords();
        this.validWords = this.getValidWords();
        
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
        return ['ADULT', 'AGENT', 'ANGER', 'APPLE', 'AWARD', 'BASIS', 'BEACH', 'BIRTH', 'BLOCK', 'BLOOD', 'BOARD', 'BRAIN', 'BREAD', 'BREAK', 'BROWN', 'BUYER', 'CAUSE', 'CHAIN', 'CHAIR', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CLAIM', 'CLASS', 'CLOCK', 'CLOUD', 'COACH', 'COAST', 'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CYCLE', 'DANCE', 'DEATH', 'DEPTH', 'DOUBT', 'DRAFT', 'DRAMA', 'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'EARTH', 'ENEMY', 'ENTRY', 'ERROR', 'EVENT', 'FAITH', 'FAULT', 'FIELD', 'FIGHT', 'FINAL', 'FLOOR', 'FOCUS', 'FORCE', 'FRAME', 'FRANK', 'FRONT', 'FRUIT', 'GLASS', 'GRANT', 'GRASS', 'GREEN', 'GROUP', 'GUIDE', 'HEART', 'HORSE', 'HOTEL', 'HOUSE', 'IMAGE', 'INDEX', 'INPUT', 'ISSUE', 'JAPAN', 'JUDGE', 'KNIFE', 'LAYER', 'LEVEL', 'LIGHT', 'LIMIT', 'LUNCH', 'MAJOR', 'MARCH', 'MATCH', 'METAL', 'MIGHT', 'MILES', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUTH', 'MUSIC', 'NIGHT', 'NOISE', 'NORTH', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'ORDER', 'OTHER', 'OWNER', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLANE', 'PLANT', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIZE', 'PROOF', 'QUEEN', 'RADIO', 'RANGE', 'RAPID', 'RATIO', 'REPLY', 'RIGHT', 'RIVER', 'ROUND', 'ROUTE', 'ROYAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEAMS', 'TEETH', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIMER', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YOUNG', 'YOURS'];
    }

    getValidWords() {
        // Common 5-letter words for guessing
        const commonWords = ['ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'AFTER', 'AGAIN', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGLE', 'ANGRY', 'APART', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BLACK', 'BLAME', 'BLANK', 'BLAST', 'BLEND', 'BLOOM', 'BOARD', 'BOAST', 'BOBBY', 'BOOST', 'BOOTH', 'BOUND', 'BRAND', 'BRASS', 'BRAVE', 'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BRUSH', 'BUDDY', 'BUILD', 'BUNCH', 'BURST', 'CABLE', 'CALIF', 'CALM', 'CAMEL', 'CANAL', 'CANDY', 'CANON', 'CARGO', 'CAROL', 'CARRY', 'CATCH', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHIPS', 'CHOSE', 'CHUCK', 'CHUNK', 'CIVIL', 'CLASH', 'CLEAN', 'CLEAR', 'CLICK', 'CLIFF', 'CLIMB', 'CLOSE', 'CLUB', 'CLUMP', 'COBRA', 'COCOA', 'CODES', 'COINS', 'COLOR', 'COMBO', 'COMED', 'COMES', 'COMIC', 'CONDO', 'CONIC', 'COOLS', 'COPSE', 'CORAL', 'CORDS', 'CORER', 'CORES', 'CORKS', 'CORNS', 'CORNY', 'CORPS', 'COSTS', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COUPE', 'COUPS', 'COVEN', 'COVET', 'COVEY', 'COWED', 'COWER', 'COWLS', 'COYER', 'COYLY', 'COZEN', 'CRAGS', 'CRAMP', 'CRAMS', 'CRANE', 'CRANK', 'CRAPE', 'CRAPS', 'CRASS', 'CRATE', 'CRAVE', 'CRAWL', 'CRAWS', 'CRAZE', 'CREAK', 'CREDO', 'CREED', 'CREEK', 'CREEL', 'CREEP', 'CREME', 'CREPE', 'CREPT', 'CRESS', 'CREST', 'CREWS', 'CRIBS', 'CRICK', 'CRIED', 'CRIER', 'CRIES', 'CRIMP', 'CRISP', 'CRITS', 'CROAK', 'CROCK', 'CROCS', 'CROFT', 'CRONE', 'CRONY', 'CROOK', 'CROON', 'CROPS', 'CROUP', 'CROWS', 'CRUDE', 'CRUEL', 'CRUET', 'CRUMB', 'CRUMP', 'CRUSH', 'CRUST', 'CRYPT', 'CUBBY', 'CUBED', 'CUBER', 'CUBES', 'CUBIC', 'CUBIT', 'CUDDY', 'CUFFS', 'CUING', 'CULLS', 'CULTS', 'CUMIN', 'CUPID', 'CUPPA', 'CURBS', 'CURDS', 'CURED', 'CURER', 'CURES', 'CURIE', 'CURIO', 'CURLS', 'CURLY', 'CURRY', 'CURSE', 'CURST', 'CURVE', 'CURVY', 'CUSHY', 'CUSPS', 'CUTER', 'CUTIE', 'CUTIS', 'CUTUP', 'CYBER', 'CYCLO', 'CYSTS', 'DADDY', 'DANCE', 'DANDY', 'DARED', 'DARER', 'DARES', 'DARKS', 'DARNS', 'DARTS', 'DATED', 'DATER', 'DATES', 'DATUM', 'DAUBS', 'DAUNT', 'DAVIT', 'DAWNS', 'DAZED', 'DAZES', 'DEALS', 'DEALT', 'DEANS', 'DEARS', 'DEARY', 'DEBAR', 'DEBIT', 'DEBTS', 'DEBUG', 'DEBUT', 'DECAF', 'DECAL', 'DECAY', 'DECKS', 'DECOR', 'DECOY', 'DECRY', 'DEEDS', 'DEEMS', 'DEEPS', 'DEFER', 'DEFOG', 'DEGAS', 'DEICE', 'DEIFY', 'DEIGN', 'DEISM', 'DEIST', 'DEITY', 'DEKED', 'DEKES', 'DELAY', 'DELED', 'DELFS', 'DELFT', 'DELIS', 'DELTA', 'DELVE', 'DEMIT', 'DEMOB', 'DEMON', 'DEMOS', 'DEMUR', 'DENAR', 'DENES', 'DENIM', 'DENSE', 'DENTS', 'DEPOT', 'DERBY', 'DERMA', 'DERMS', 'DERRY', 'DESKS', 'DETER', 'DETOX', 'DEUCE', 'DEVIL', 'DEWAR', 'DEWED', 'DEWER', 'DEXIE', 'DEXYS', 'DHALS', 'DHIKR', 'DHOBI', 'DHOLS', 'DHOWS', 'DIALS', 'DIARY', 'DIAZO', 'DICED', 'DICER', 'DICES', 'DICEY', 'DICKS', 'DICKY', 'DICOT', 'DICTA', 'DIDDY', 'DIDOS', 'DIDST', 'DIEBS', 'DIEMS', 'DIENE', 'DIETS', 'DIFFS', 'DIGIT', 'DIKED', 'DIKES', 'DILLS', 'DILLY', 'DIMER', 'DIMES', 'DIMLY', 'DINAR', 'DINED', 'DINER', 'DINES', 'DINGO', 'DINGS', 'DINGY', 'DINKS', 'DINKY', 'DINOS', 'DINTS', 'DIODE', 'DIOLS', 'DIPPY', 'DIRER', 'DIRGE', 'DIRKS', 'DIRLS', 'DIRTS', 'DIRTY', 'DISCO', 'DISCS', 'DISHY', 'DISKS', 'DISME', 'DITAS', 'DITCH', 'DITTO', 'DITTS', 'DITTY', 'DITZY', 'DIVAN', 'DIVAS', 'DIVED', 'DIVER', 'DIVES', 'DIVOT', 'DIVVY', 'DIWAN', 'DIXIE', 'DIXIT', 'DIZZY', 'DJINN', 'DJINS', 'DOATS', 'DOBBY', 'DOBIE', 'DOBLA', 'DOBRA', 'DOBRO', 'DOCKS', 'DODGE', 'DODOS', 'DOERS', 'DOEST', 'DOETH', 'DOFFS', 'DOGES', 'DOGEY', 'DOGGO', 'DOGGY', 'DOGIE', 'DOGMA', 'DOILY', 'DOING', 'DOITS', 'DOJOS', 'DOLCE', 'DOLCI', 'DOLED', 'DOLES', 'DOLLS', 'DOLLY', 'DOLMA', 'DOLOR', 'DOLTS', 'DOMAL', 'DOMED', 'DOMES', 'DOMIC', 'DONAS', 'DONEE', 'DONER', 'DONGS', 'DONNA', 'DONNE', 'DONOR', 'DONUT', 'DOOBS', 'DOODY', 'DOOFE', 'DOOFY', 'DOOLY', 'DOOMS', 'DOOMY', 'DOONA', 'DOORS', 'DOOZY', 'DOPAS', 'DOPED', 'DOPER', 'DOPES', 'DOPEY', 'DORAD', 'DORBS', 'DOREE', 'DORES', 'DORIC', 'DORKS', 'DORKY', 'DORMS', 'DORMY', 'DORPS', 'DORRS', 'DORSA', 'DORSE', 'DORTS', 'DORTY', 'DOSAS', 'DOSED', 'DOSER', 'DOSES', 'DOSHA', 'DOTAL', 'DOTED', 'DOTER', 'DOTES', 'DOTTY', 'DOUCE', 'DOUGH', 'DOULA', 'DOUMA', 'DOUMS', 'DOUPS', 'DOURA', 'DOUSE', 'DOUTS', 'DOVED', 'DOVEN', 'DOVER', 'DOVES', 'DOWDY', 'DOWED', 'DOWEL', 'DOWER', 'DOWIE', 'DOWLS', 'DOWNS', 'DOWNY', 'DOWRY', 'DOWSE', 'DOXED', 'DOXES', 'DOXIE', 'DOYEN', 'DOYER', 'DOYLY', 'DOZED', 'DOZEN', 'DOZER', 'DOZES', 'DRABS', 'DRAGS', 'DRAIL', 'DRAIN', 'DRAKE', 'DRAMS', 'DRANK', 'DRAPE', 'DRATS', 'DRAVE', 'DRAWL', 'DRAWN', 'DRAWS', 'DRAYS', 'DREAD', 'DREAR', 'DRECK', 'DREED', 'DREES', 'DREST', 'DREYS', 'DRIBS', 'DRICE', 'DRIED', 'DRIER', 'DRIES', 'DRIFT', 'DRILL', 'DRILY', 'DRIPS', 'DRIPT', 'DROID', 'DROIT', 'DROLE', 'DROLL', 'DROME', 'DRONE', 'DRONY', 'DROOL', 'DROOP', 'DROPS', 'DROPT', 'DROSS', 'DROVE', 'DROWS', 'DRUBS', 'DRUGS', 'DRUID', 'DRUMS', 'DRUNK', 'DRUPE', 'DRUSE', 'DRUSY', 'DRUXY', 'DRYAD', 'DRYER', 'DRYLY', 'DUADS', 'DUALS', 'DUCAL', 'DUCAT', 'DUCES', 'DUCHY', 'DUCKS', 'DUCKY', 'DUCTS', 'DUDDY', 'DUDED', 'DUDES', 'DUELS', 'DUETS', 'DUFFS', 'DUFUS', 'DUING', 'DUITS', 'DUKED', 'DUKES', 'DULCE', 'DULIA', 'DULLS', 'DULLY', 'DULSE', 'DUMAS', 'DUMBO', 'DUMBS', 'DUMMY', 'DUMPS', 'DUMPY', 'DUNCE', 'DUNCH', 'DUNES', 'DUNGS', 'DUNGY', 'DUNKS', 'DUNTS', 'DUOMI', 'DUOMO', 'DUPED', 'DUPER', 'DUPES', 'DUPLE', 'DUPLY', 'DURAL', 'DURAS', 'DURED', 'DURES', 'DURNS', 'DUROC', 'DUROS', 'DURRA', 'DURRS', 'DURRY', 'DURST', 'DURUM', 'DUSKS', 'DUSKY', 'DUSTS', 'DUSTY', 'DUTCH', 'DUVET', 'DUXES', 'DWAAL', 'DWALE', 'DWALM', 'DWAMS', 'DWANG', 'DWARF', 'DWEBS', 'DWEEB', 'DWELL', 'DWELT', 'DWILE', 'DWINE', 'DYADS', 'DYERS', 'DYING', 'DYKED', 'DYKES', 'DYNEL', 'DYNES'];
        
        // Filter: only 5-letter words, remove inappropriate words
        const inappropriate = ['CUNTS', 'DILDO', 'DICKS', 'DICKY', 'DARKY', 'DIDST', 'DOUCH'];
        const allWords = this.targetWords.concat(commonWords);
        return allWords.filter(word => 
            word.length === 5 && 
            !inappropriate.includes(word) &&
            /^[A-Z]{5}$/.test(word)
        );
    }

    startNewGame() {
        this.currentGuess = '';
        this.guesses = [];
        this.gameOver = false;
        this.won = false;
        this.isAnimating = false;
        if (this.targetWords.length === 0) {
            console.error('No target words available!');
            return;
        }
        this.targetWord = this.targetWords[Math.floor(Math.random() * this.targetWords.length)];
        console.log('Target word:', this.targetWord);
    }

    createBoard() {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        board.innerHTML = '';
        for (let i = 0; i < this.maxGuesses; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.id = `row-${i}`;
            for (let j = 0; j < this.wordLength; j++) {
                const tile = document.createElement('div');
                tile.className = 'letter-tile';
                tile.id = `tile-${i}-${j}`;
                tile.setAttribute('aria-label', `Row ${i + 1}, Position ${j + 1}`);
                row.appendChild(tile);
            }
            board.appendChild(row);
        }
        this.updateActiveRow();
    }

    createKeyboard() {
        const keyboard = document.getElementById('keyboard');
        if (!keyboard) return;
        keyboard.innerHTML = '';
        const rows = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
        ];
        rows.forEach((row, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            row.forEach(key => {
                const keyBtn = document.createElement('button');
                keyBtn.className = 'key';
                keyBtn.textContent = key;
                keyBtn.setAttribute('aria-label', key === 'ENTER' ? 'Submit guess' : key === 'BACK' ? 'Delete letter' : `Letter ${key}`);
                if (key === 'ENTER' || key === 'BACK') {
                    keyBtn.classList.add('wide');
                }
                keyBtn.onclick = () => this.handleKeyPress(key);
                keyBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    keyBtn.style.transform = 'scale(0.95)';
                });
                keyBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    keyBtn.style.transform = '';
                });
                rowDiv.appendChild(keyBtn);
            });
            keyboard.appendChild(rowDiv);
        });
    }

    setupEventListeners() {
        // Remove existing listener if any
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        
        this.keydownHandler = (e) => {
            // Don't process if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (this.gameOver || this.isAnimating) return;
            
            const key = e.key.toUpperCase();
            if (key === 'ENTER') {
                e.preventDefault();
                this.handleKeyPress('ENTER');
            } else if (key === 'BACKSPACE' || key === 'DELETE') {
                e.preventDefault();
                this.handleKeyPress('BACK');
            } else if (/^[A-Z]$/.test(key)) {
                this.handleKeyPress(key);
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler);
        
        // Close instructions modal on outside click
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('instructionsModal');
            if (modal && modal.classList.contains('show') && e.target === modal) {
                closeInstructions();
            }
        });
    }

    handleKeyPress(key) {
        if (this.gameOver || this.isAnimating) return;
        
        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACK') {
            this.removeLetter();
        } else if (/^[A-Z]$/.test(key) && this.currentGuess.length < this.wordLength) {
            this.addLetter(key);
        }
    }

    addLetter(letter) {
        if (this.currentGuess.length < this.wordLength && !this.isAnimating) {
            this.currentGuess += letter;
            this.updateBoard();
        }
    }

    removeLetter() {
        if (this.currentGuess.length > 0 && !this.isAnimating) {
            this.currentGuess = this.currentGuess.slice(0, -1);
            this.updateBoard();
        }
    }

    updateBoard() {
        const rowIndex = this.guesses.length;
        const row = document.getElementById(`row-${rowIndex}`);
        if (!row) return;
        
        // Remove shake class if present
        row.classList.remove('shake');
        
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
        this.updateActiveRow();
    }

    updateActiveRow() {
        const currentRowIndex = this.guesses.length;
        const allRows = document.querySelectorAll('.guess-row');
        allRows.forEach((row, index) => {
            if (index === currentRowIndex && !this.gameOver) {
                row.classList.add('active-row');
            } else {
                row.classList.remove('active-row');
            }
        });
    }

    submitGuess() {
        if (this.currentGuess.length !== this.wordLength || this.isAnimating) return;
        
        const guess = this.currentGuess.toUpperCase();
        
        // Check if word is valid
        if (!this.validWords.includes(guess)) {
            this.showInvalidWord();
            return;
        }
        
        // Check if word was already guessed
        if (this.guesses.includes(guess)) {
            this.showInvalidWord('Already guessed!');
            return;
        }
        
        this.isAnimating = true;
        this.guesses.push(guess);
        this.evaluateGuess(guess);
        this.currentGuess = '';
        this.updateBoard();
    }

    showInvalidWord(message = 'Not a valid word!') {
        const rowIndex = this.guesses.length;
        const row = document.getElementById(`row-${rowIndex}`);
        if (row) {
            row.classList.add('shake');
            setTimeout(() => {
                row.classList.remove('shake');
            }, 500);
        }
        
        // Show temporary message
        const tempMsg = document.createElement('div');
        tempMsg.className = 'temp-message';
        tempMsg.textContent = message;
        tempMsg.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 3000;
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(tempMsg);
        setTimeout(() => {
            if (tempMsg.parentNode) {
                tempMsg.parentNode.removeChild(tempMsg);
            }
        }, 2000);
    }

    evaluateGuess(guess) {
        const rowIndex = this.guesses.length - 1;
        const row = document.getElementById(`row-${rowIndex}`);
        if (!row) {
            this.isAnimating = false;
            return;
        }
        
        const result = this.getGuessResult(guess);
        let animationComplete = 0;
        const totalAnimations = this.wordLength;
        
        for (let i = 0; i < this.wordLength; i++) {
            const tile = row.children[i];
            tile.textContent = guess[i];
            
            setTimeout(() => {
                tile.classList.add(result[i]);
                this.updateKeyboard(guess[i], result[i]);
                
                animationComplete++;
                if (animationComplete === totalAnimations) {
                    this.isAnimating = false;
                    this.checkGameEnd(guess);
                }
            }, i * 150 + 300);
        }
    }

    checkGameEnd(guess) {
        if (guess === this.targetWord) {
            this.won = true;
            this.gameOver = true;
            this.stats.gamesPlayed++;
            this.stats.wins++;
            this.stats.currentStreak++;
            this.stats.maxStreak = Math.max(this.stats.maxStreak, this.stats.currentStreak);
            this.saveStats();
            this.celebrateWin();
            setTimeout(() => this.showMessage('🎉 You Won!', this.targetWord, `Great job! You got it in ${this.guesses.length} ${this.guesses.length === 1 ? 'try' : 'tries'}!`), 800);
        } else if (this.guesses.length >= this.maxGuesses) {
            this.gameOver = true;
            this.stats.gamesPlayed++;
            this.stats.currentStreak = 0;
            this.saveStats();
            setTimeout(() => this.showMessage('Game Over', this.targetWord, 'Better luck next time!'), 800);
        }
        this.updateStats();
    }

    celebrateWin() {
        const rowIndex = this.guesses.length - 1;
        const row = document.getElementById(`row-${rowIndex}`);
        if (!row) return;
        
        // Bounce animation for winning row
        row.style.animation = 'bounce 0.6s ease';
        setTimeout(() => {
            row.style.animation = '';
        }, 600);
        
        // Confetti effect
        this.createConfetti();
    }

    createConfetti() {
        const colors = ['#6aaa64', '#c9b458', '#FFD700', '#4CAF50'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    left: ${Math.random() * 100}%;
                    top: -10px;
                    z-index: 3000;
                    animation: confettiFall ${2 + Math.random() * 2}s linear forwards;
                `;
                document.body.appendChild(confetti);
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.parentNode.removeChild(confetti);
                    }
                }, 4000);
            }, i * 20);
        }
    }

    getGuessResult(guess) {
        const result = new Array(this.wordLength).fill('absent');
        const targetLetters = this.targetWord.split('');
        const guessLetters = guess.split('');
        const used = new Array(this.wordLength).fill(false);

        // First pass: mark correct positions
        for (let i = 0; i < this.wordLength; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                result[i] = 'correct';
                used[i] = true;
            }
        }

        // Second pass: mark present (wrong position)
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
            if (key.textContent === letter && key.textContent.length === 1) {
                // Correct status takes priority
                if (status === 'correct') {
                    key.classList.remove('present', 'absent');
                    key.classList.add('correct');
                } else if (status === 'present' && !key.classList.contains('correct')) {
                    key.classList.remove('absent');
                    key.classList.add('present');
                } else if (status === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
                    key.classList.add('absent');
                }
            }
        });
    }

    showMessage(title, word, subtitle = '') {
        const message = document.getElementById('message');
        const content = document.getElementById('messageContent');
        const wordEl = document.getElementById('messageWord');
        const subtitleEl = document.getElementById('messageSubtitle');
        
        if (!message || !content || !wordEl) return;
        
        content.textContent = title;
        wordEl.textContent = word;
        if (subtitleEl) {
            subtitleEl.textContent = subtitle;
        }
        message.classList.add('show');
    }

    closeMessage() {
        const message = document.getElementById('message');
        if (message) {
            message.classList.remove('show');
        }
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
        try {
            const saved = localStorage.getItem('wordleStats');
            if (saved) {
                const stats = JSON.parse(saved);
                // Ensure all required fields exist
                return {
                    gamesPlayed: stats.gamesPlayed || 0,
                    wins: stats.wins || 0,
                    currentStreak: stats.currentStreak || 0,
                    maxStreak: stats.maxStreak || 0
                };
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        }
        return {
            gamesPlayed: 0,
            wins: 0,
            currentStreak: 0,
            maxStreak: 0
        };
    }

    saveStats() {
        try {
            localStorage.setItem('wordleStats', JSON.stringify(this.stats));
        } catch (e) {
            console.error('Error saving stats:', e);
        }
    }

    updateStats() {
        const gamesPlayedEl = document.getElementById('gamesPlayed');
        const winRateEl = document.getElementById('winRate');
        const currentStreakEl = document.getElementById('currentStreak');
        const maxStreakEl = document.getElementById('maxStreak');
        
        if (gamesPlayedEl) gamesPlayedEl.textContent = this.stats.gamesPlayed;
        if (winRateEl) {
            const winRate = this.stats.gamesPlayed > 0 ? 
                Math.round((this.stats.wins / this.stats.gamesPlayed) * 100) : 0;
            winRateEl.textContent = winRate + '%';
        }
        if (currentStreakEl) currentStreakEl.textContent = this.stats.currentStreak;
        if (maxStreakEl) maxStreakEl.textContent = this.stats.maxStreak;
    }
}

function showInstructions() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeInstructions() {
    const modal = document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function closeMessage() {
    if (window.wordleGame) {
        window.wordleGame.closeMessage();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.wordleGame = new WordleGame();
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
    }
    @keyframes confettiFall {
        to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
    @keyframes fadeInOut {
        0%, 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        50% { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .active-row {
        opacity: 1;
    }
    .active-row .letter-tile:not(.filled) {
        border-color: rgba(255, 215, 0, 0.6);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    }
`;
document.head.appendChild(style);
