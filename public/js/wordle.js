// WORDLE GAME LOGIC - Polished & Flawless Version

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
        this.confettiElements = [];
        this.confettiTimeouts = []; // Track confetti cleanup timeouts
        this.stats = this.loadStats();
        this.modalFocusTrap = null; // For focus trapping in modals
        this.previousActiveElement = null; // Store element before modal opens
        this.isSubmitting = false; // Prevent double submissions
        
        // Cache DOM elements for performance
        this.cachedElements = {};
        
        // Word lists - cached and filtered once
        this.targetWords = this.getTargetWords();
        this.validWords = this.getValidWords();
        // Use Set for O(1) lookup performance
        this.validWordsSet = new Set(this.validWords);
        
        this.init();
    }
    
    // Cache DOM elements for better performance
    getElement(id) {
        if (!this.cachedElements[id]) {
            this.cachedElements[id] = document.getElementById(id);
        }
        return this.cachedElements[id];
    }
    
    // Clear cache when needed
    clearCache() {
        this.cachedElements = {};
    }

    init() {
        this.startNewGame();
        this.createBoard();
        this.createKeyboard();
        this.updateStats();
        this.setupEventListeners();
        this.announceToScreenReader('Wordle game loaded. Start guessing!');
    }

    getTargetWords() {
        return ['ADULT', 'AGENT', 'ANGER', 'APPLE', 'AWARD', 'BASIS', 'BEACH', 'BIRTH', 'BLOCK', 'BLOOD', 'BOARD', 'BRAIN', 'BREAD', 'BREAK', 'BROWN', 'BUYER', 'CAUSE', 'CHAIN', 'CHAIR', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CLAIM', 'CLASS', 'CLOCK', 'CLOUD', 'COACH', 'COAST', 'COURT', 'COVER', 'CRAFT', 'CRASH', 'CRAZY', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CYCLE', 'DANCE', 'DEATH', 'DEPTH', 'DOUBT', 'DRAFT', 'DRAMA', 'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'EARTH', 'ENEMY', 'ENTRY', 'ERROR', 'EVENT', 'FAITH', 'FAULT', 'FIELD', 'FIGHT', 'FINAL', 'FLOOR', 'FOCUS', 'FORCE', 'FRAME', 'FRANK', 'FRONT', 'FRUIT', 'GLASS', 'GRANT', 'GRASS', 'GREEN', 'GROUP', 'GUIDE', 'HEART', 'HORSE', 'HOTEL', 'HOUSE', 'IMAGE', 'INDEX', 'INPUT', 'ISSUE', 'JAPAN', 'JUDGE', 'KNIFE', 'LARGE', 'LAYER', 'LEVEL', 'LIGHT', 'LIMIT', 'LUNCH', 'MAJOR', 'MARCH', 'MATCH', 'METAL', 'MIGHT', 'MILES', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUTH', 'MUSIC', 'NIGHT', 'NOISE', 'NORTH', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'ORDER', 'OTHER', 'OWNER', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLANE', 'PLANT', 'POINT', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIZE', 'PROOF', 'QUEEN', 'RADIO', 'RANGE', 'RAPID', 'RATIO', 'REPLY', 'RIGHT', 'RIVER', 'ROUND', 'ROUTE', 'ROYAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORT', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH', 'TEAMS', 'TEETH', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIMER', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRIES', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WRITE', 'WRONG', 'WROTE', 'YOUNG', 'YOURS'];
    }

    getValidWords() {
        // Common 5-letter words for guessing - expanded list
        const commonWords = ['ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'AFTER', 'AGAIN', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGLE', 'ANGRY', 'APART', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BLACK', 'BLAME', 'BLANK', 'BLAST', 'BLEND', 'BLOOM', 'BOARD', 'BOAST', 'BOBBY', 'BOOST', 'BOOTH', 'BOUND', 'BRAND', 'BRASS', 'BRAVE', 'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BRUSH', 'BUDDY', 'BUILD', 'BUNCH', 'BURST', 'CABLE', 'CALIF', 'CAMEL', 'CANAL', 'CANDY', 'CANON', 'CARGO', 'CAROL', 'CARRY', 'CATCH', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHIPS', 'CHOSE', 'CHUCK', 'CHUNK', 'CIVIL', 'CLASH', 'CLEAN', 'CLEAR', 'CLICK', 'CLIFF', 'CLIMB', 'CLOSE', 'CLUMP', 'COBRA', 'COCOA', 'CODES', 'COINS', 'COLOR', 'COMBO', 'COMED', 'COMES', 'COMIC', 'CONDO', 'CONIC', 'COOLS', 'COPSE', 'CORAL', 'CORDS', 'CORER', 'CORES', 'CORKS', 'CORNS', 'CORNY', 'CORPS', 'COSTS', 'COUCH', 'COUGH', 'COULD', 'COUNT', 'COUPE', 'COUPS', 'COVEN', 'COVET', 'COVEY', 'COWED', 'COWER', 'COWLS', 'COYER', 'COYLY', 'COZEN', 'CRAGS', 'CRAMP', 'CRAMS', 'CRANE', 'CRANK', 'CRAPE', 'CRAPS', 'CRASS', 'CRATE', 'CRAVE', 'CRAWL', 'CRAWS', 'CRAZE', 'CREAK', 'CREDO', 'CREED', 'CREEK', 'CREEL', 'CREEP', 'CREME', 'CREPE', 'CREPT', 'CRESS', 'CREST', 'CREWS', 'CRIBS', 'CRICK', 'CRIED', 'CRIER', 'CRIES', 'CRIMP', 'CRISP', 'CRITS', 'CROAK', 'CROCK', 'CROCS', 'CROFT', 'CRONE', 'CRONY', 'CROOK', 'CROON', 'CROPS', 'CROUP', 'CROWS', 'CRUDE', 'CRUEL', 'CRUET', 'CRUMB', 'CRUMP', 'CRUSH', 'CRUST', 'CRYPT', 'CUBBY', 'CUBED', 'CUBER', 'CUBES', 'CUBIC', 'CUBIT', 'CUDDY', 'CUFFS', 'CUING', 'CULLS', 'CULTS', 'CUMIN', 'CUPID', 'CUPPA', 'CURBS', 'CURDS', 'CURED', 'CURER', 'CURES', 'CURIE', 'CURIO', 'CURLS', 'CURLY', 'CURRY', 'CURSE', 'CURST', 'CURVE', 'CURVY', 'CUSHY', 'CUSPS', 'CUTER', 'CUTIE', 'CUTIS', 'CUTUP', 'CYBER', 'CYCLO', 'CYSTS', 'DADDY', 'DANCE', 'DANDY', 'DARED', 'DARER', 'DARES', 'DARKS', 'DARNS', 'DARTS', 'DATED', 'DATER', 'DATES', 'DATUM', 'DAUBS', 'DAUNT', 'DAVIT', 'DAWNS', 'DAZED', 'DAZES', 'DEALS', 'DEALT', 'DEANS', 'DEARS', 'DEARY', 'DEBAR', 'DEBIT', 'DEBTS', 'DEBUG', 'DEBUT', 'DECAF', 'DECAL', 'DECAY', 'DECKS', 'DECOR', 'DECOY', 'DECRY', 'DEEDS', 'DEEMS', 'DEEPS', 'DEFER', 'DEFOG', 'DEGAS', 'DEICE', 'DEIFY', 'DEIGN', 'DEISM', 'DEIST', 'DEITY', 'DEKED', 'DEKES', 'DELAY', 'DELED', 'DELFS', 'DELFT', 'DELIS', 'DELTA', 'DELVE', 'DEMIT', 'DEMOB', 'DEMON', 'DEMOS', 'DEMUR', 'DENAR', 'DENES', 'DENIM', 'DENSE', 'DENTS', 'DEPOT', 'DERBY', 'DERMA', 'DERMS', 'DERRY', 'DESKS', 'DETER', 'DETOX', 'DEUCE', 'DEVIL', 'DEWAR', 'DEWED', 'DEWER', 'DEXIE', 'DEXYS', 'DHALS', 'DHIKR', 'DHOBI', 'DHOLS', 'DHOWS', 'DIALS', 'DIARY', 'DIAZO', 'DICED', 'DICER', 'DICES', 'DICEY', 'DICOT', 'DICTA', 'DIDDY', 'DIDOS', 'DIEBS', 'DIEMS', 'DIENE', 'DIETS', 'DIFFS', 'DIGIT', 'DIKED', 'DIKES', 'DILLS', 'DILLY', 'DIMER', 'DIMES', 'DIMLY', 'DINAR', 'DINED', 'DINER', 'DINES', 'DINGO', 'DINGS', 'DINGY', 'DINKS', 'DINKY', 'DINOS', 'DINTS', 'DIODE', 'DIOLS', 'DIPPY', 'DIRER', 'DIRGE', 'DIRKS', 'DIRLS', 'DIRTS', 'DIRTY', 'DISCO', 'DISCS', 'DISHY', 'DISKS', 'DISME', 'DITAS', 'DITCH', 'DITTO', 'DITTS', 'DITTY', 'DITZY', 'DIVAN', 'DIVAS', 'DIVED', 'DIVER', 'DIVES', 'DIVOT', 'DIVVY', 'DIWAN', 'DIXIE', 'DIXIT', 'DIZZY', 'DJINN', 'DJINS', 'DOATS', 'DOBBY', 'DOBIE', 'DOBLA', 'DOBRA', 'DOBRO', 'DOCKS', 'DODGE', 'DODOS', 'DOERS', 'DOEST', 'DOETH', 'DOFFS', 'DOGES', 'DOGEY', 'DOGGO', 'DOGGY', 'DOGIE', 'DOGMA', 'DOILY', 'DOING', 'DOITS', 'DOJOS', 'DOLCE', 'DOLCI', 'DOLED', 'DOLES', 'DOLLS', 'DOLLY', 'DOLMA', 'DOLOR', 'DOLTS', 'DOMAL', 'DOMED', 'DOMES', 'DOMIC', 'DONAS', 'DONEE', 'DONER', 'DONGS', 'DONNA', 'DONNE', 'DONOR', 'DONUT', 'DOOBS', 'DOODY', 'DOOFE', 'DOOFY', 'DOOLY', 'DOOMS', 'DOOMY', 'DOONA', 'DOORS', 'DOOZY', 'DOPAS', 'DOPED', 'DOPER', 'DOPES', 'DOPEY', 'DORAD', 'DORBS', 'DOREE', 'DORES', 'DORIC', 'DORKS', 'DORKY', 'DORMS', 'DORMY', 'DORPS', 'DORRS', 'DORSA', 'DORSE', 'DORTS', 'DORTY', 'DOSAS', 'DOSED', 'DOSER', 'DOSES', 'DOSHA', 'DOTAL', 'DOTED', 'DOTER', 'DOTES', 'DOTTY', 'DOUCE', 'DOUGH', 'DOULA', 'DOUMA', 'DOUMS', 'DOUPS', 'DOURA', 'DOUSE', 'DOUTS', 'DOVED', 'DOVEN', 'DOVER', 'DOVES', 'DOWDY', 'DOWED', 'DOWEL', 'DOWER', 'DOWIE', 'DOWLS', 'DOWNS', 'DOWNY', 'DOWRY', 'DOWSE', 'DOXED', 'DOXES', 'DOXIE', 'DOYEN', 'DOYER', 'DOYLY', 'DOZED', 'DOZEN', 'DOZER', 'DOZES', 'DRABS', 'DRAGS', 'DRAIL', 'DRAIN', 'DRAKE', 'DRAMS', 'DRANK', 'DRAPE', 'DRATS', 'DRAVE', 'DRAWL', 'DRAWN', 'DRAWS', 'DRAYS', 'DREAD', 'DREAR', 'DRECK', 'DREED', 'DREES', 'DREST', 'DREYS', 'DRIBS', 'DRICE', 'DRIED', 'DRIER', 'DRIES', 'DRIFT', 'DRILL', 'DRILY', 'DRIPS', 'DRIPT', 'DROID', 'DROIT', 'DROLE', 'DROLL', 'DROME', 'DRONE', 'DRONY', 'DROOL', 'DROOP', 'DROPS', 'DROPT', 'DROSS', 'DROVE', 'DROWS', 'DRUBS', 'DRUGS', 'DRUID', 'DRUMS', 'DRUNK', 'DRUPE', 'DRUSE', 'DRUSY', 'DRUXY', 'DRYAD', 'DRYER', 'DRYLY', 'DUADS', 'DUALS', 'DUCAL', 'DUCAT', 'DUCES', 'DUCHY', 'DUCKS', 'DUCKY', 'DUCTS', 'DUDDY', 'DUDED', 'DUDES', 'DUELS', 'DUETS', 'DUFFS', 'DUFUS', 'DUING', 'DUITS', 'DUKED', 'DUKES', 'DULCE', 'DULIA', 'DULLS', 'DULLY', 'DULSE', 'DUMAS', 'DUMBO', 'DUMBS', 'DUMMY', 'DUMPS', 'DUMPY', 'DUNCE', 'DUNCH', 'DUNES', 'DUNGS', 'DUNGY', 'DUNKS', 'DUNTS', 'DUOMI', 'DUOMO', 'DUPED', 'DUPER', 'DUPES', 'DUPLE', 'DUPLY', 'DURAL', 'DURAS', 'DURED', 'DURES', 'DURNS', 'DUROC', 'DUROS', 'DURRA', 'DURRS', 'DURRY', 'DURST', 'DURUM', 'DUSKS', 'DUSKY', 'DUSTS', 'DUSTY', 'DUTCH', 'DUVET', 'DUXES', 'DWAAL', 'DWALE', 'DWALM', 'DWAMS', 'DWANG', 'DWARF', 'DWEBS', 'DWEEB', 'DWELL', 'DWELT', 'DWILE', 'DWINE', 'DYADS', 'DYERS', 'DYING', 'DYKED', 'DYKES', 'DYNEL', 'DYNES', 'LARGE'];
        
        // Filter: only 5-letter words, remove inappropriate words
        const inappropriate = ['CUNTS', 'DILDO', 'DICKS', 'DICKY', 'DARKY', 'DIDST', 'DOUCH'];
        const allWords = this.targetWords.concat(commonWords);
        
        // Create a Set for faster lookup and ensure uniqueness
        const wordSet = new Set();
        allWords.forEach(word => {
            if (word.length === 5 && 
                !inappropriate.includes(word) &&
                /^[A-Z]{5}$/.test(word)) {
                wordSet.add(word);
            }
        });
        
        return Array.from(wordSet).sort();
    }

    startNewGame() {
        this.currentGuess = '';
        this.guesses = [];
        this.gameOver = false;
        this.won = false;
        this.isAnimating = false;
        this.isSubmitting = false;
        this.cleanupConfetti();
        
        // Clear any pending animation timeouts
        if (this.currentAnimationTimeouts) {
            this.currentAnimationTimeouts.forEach(timeout => clearTimeout(timeout));
            this.currentAnimationTimeouts = [];
        }
        
        // Clear shake timeouts
        if (this.shakeTimeouts) {
            this.shakeTimeouts.forEach(timeout => clearTimeout(timeout));
            this.shakeTimeouts = [];
        }
        
        // Clear message timeouts
        if (this.messageTimeouts) {
            this.messageTimeouts.forEach(timeout => clearTimeout(timeout));
            this.messageTimeouts = [];
        }
        
        // Remove any existing temp messages
        const existing = document.querySelector('.temp-message');
        if (existing) {
            existing.remove();
        }
        
        if (this.targetWords.length === 0) {
            this.announceToScreenReader('Error: No words available');
            return;
        }
        
        this.targetWord = this.targetWords[Math.floor(Math.random() * this.targetWords.length)];
        // Removed console.log for production
    }

    createBoard() {
        const board = this.getElement('gameBoard');
        if (!board) return;
        board.innerHTML = '';
        this.clearCache(); // Clear cache when recreating board
        for (let i = 0; i < this.maxGuesses; i++) {
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.id = `row-${i}`;
            row.setAttribute('role', 'group');
            row.setAttribute('aria-label', `Guess row ${i + 1}`);
            for (let j = 0; j < this.wordLength; j++) {
                const tile = document.createElement('div');
                tile.className = 'letter-tile';
                tile.id = `tile-${i}-${j}`;
                tile.setAttribute('role', 'gridcell');
                tile.setAttribute('aria-label', `Row ${i + 1}, Position ${j + 1}, empty`);
                tile.setAttribute('tabindex', '-1'); // Make tiles focusable but not in tab order
                row.appendChild(tile);
            }
            board.appendChild(row);
        }
        this.updateActiveRow();
    }

    createKeyboard() {
        const keyboard = this.getElement('keyboard');
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
            rowDiv.setAttribute('role', 'group');
            row.forEach(key => {
                const keyBtn = document.createElement('button');
                keyBtn.className = 'key';
                keyBtn.textContent = key;
                keyBtn.setAttribute('type', 'button');
                keyBtn.setAttribute('aria-label', key === 'ENTER' ? 'Submit guess' : key === 'BACK' ? 'Delete letter' : `Letter ${key}`);
                if (key === 'ENTER' || key === 'BACK') {
                    keyBtn.classList.add('wide');
                }
                keyBtn.onclick = () => this.handleKeyPress(key);
                
                // Improved touch handling with haptic feedback
                let touchTimeout;
                const touchStartHandler = (e) => {
                    e.preventDefault();
                    clearTimeout(touchTimeout);
                    keyBtn.style.transform = 'scale(0.95)';
                    keyBtn.style.opacity = '0.8';
                    
                    // Haptic feedback for supported devices
                    if (navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                };
                
                const touchEndHandler = (e) => {
                    e.preventDefault();
                    clearTimeout(touchTimeout);
                    touchTimeout = setTimeout(() => {
                        keyBtn.style.transform = '';
                        keyBtn.style.opacity = '';
                    }, 100);
                };
                
                const touchCancelHandler = () => {
                    clearTimeout(touchTimeout);
                    keyBtn.style.transform = '';
                    keyBtn.style.opacity = '';
                };
                
                keyBtn.addEventListener('touchstart', touchStartHandler, { passive: false });
                keyBtn.addEventListener('touchend', touchEndHandler, { passive: false });
                keyBtn.addEventListener('touchcancel', touchCancelHandler);
                
                // Store handlers for potential cleanup
                keyBtn._touchHandlers = {
                    start: touchStartHandler,
                    end: touchEndHandler,
                    cancel: touchCancelHandler
                };
                
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
            // Handle ESC key for closing modals
            if (e.key === 'Escape' || e.key === 'Esc') {
                const instructionsModal = this.getElement('instructionsModal');
                const messageModal = this.getElement('message');
                
                if (instructionsModal && instructionsModal.classList.contains('show')) {
                    closeInstructions();
                    return;
                }
                if (messageModal && messageModal.classList.contains('show')) {
                    closeMessage();
                    return;
                }
            }
            
            // Don't process if typing in an input field or if a modal is open
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }
            
            // Don't process game keys if modals are open
            const instructionsModal = this.getElement('instructionsModal');
            const messageModal = this.getElement('message');
            if ((instructionsModal && instructionsModal.classList.contains('show')) ||
                (messageModal && messageModal.classList.contains('show'))) {
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
        
        // Close modals on outside click
        this.modalClickHandler = (e) => {
            const instructionsModal = this.getElement('instructionsModal');
            const messageModal = this.getElement('message');
            
            if (instructionsModal && instructionsModal.classList.contains('show') && e.target === instructionsModal) {
                closeInstructions();
            }
            if (messageModal && messageModal.classList.contains('show') && e.target === messageModal) {
                closeMessage();
            }
        };
        document.addEventListener('click', this.modalClickHandler);
    }
    
    cleanup() {
        // Cleanup event listeners
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        if (this.modalClickHandler) {
            document.removeEventListener('click', this.modalClickHandler);
            this.modalClickHandler = null;
        }
        this.removeFocusTrap();
        this.cleanupConfetti();
        if (this.currentAnimationTimeouts) {
            this.currentAnimationTimeouts.forEach(timeout => clearTimeout(timeout));
            this.currentAnimationTimeouts = [];
        }
        // Reset submission state
        this.isSubmitting = false;
        this.isAnimating = false;
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
            this.announceToScreenReader(`Added letter ${letter}`);
        }
    }

    removeLetter() {
        if (this.currentGuess.length > 0 && !this.isAnimating) {
            this.currentGuess = this.currentGuess.slice(0, -1);
            this.updateBoard();
            this.announceToScreenReader('Letter removed');
        }
    }

    updateBoard() {
        const rowIndex = this.guesses.length;
        const row = this.getElement(`row-${rowIndex}`);
        if (!row) return;
        
        // Remove shake class if present
        row.classList.remove('shake');
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            for (let i = 0; i < this.wordLength; i++) {
                const tile = row.children[i];
                if (!tile) continue;
                
                if (i < this.currentGuess.length) {
                    tile.textContent = this.currentGuess[i];
                    tile.classList.add('filled');
                    tile.setAttribute('aria-label', `Row ${rowIndex + 1}, Position ${i + 1}, letter ${this.currentGuess[i]}`);
                } else {
                    tile.textContent = '';
                    tile.classList.remove('filled');
                    tile.setAttribute('aria-label', `Row ${rowIndex + 1}, Position ${i + 1}, empty`);
                }
            }
            this.updateActiveRow();
            this.updateKeyboardState();
        });
    }

    updateActiveRow() {
        const currentRowIndex = this.guesses.length;
        const allRows = document.querySelectorAll('.guess-row');
        allRows.forEach((row, index) => {
            if (index === currentRowIndex && !this.gameOver) {
                row.classList.add('active-row');
                row.setAttribute('aria-current', 'true');
            } else {
                row.classList.remove('active-row');
                row.removeAttribute('aria-current');
            }
        });
    }

    updateKeyboardState() {
        // Cache keyboard keys for better performance
        if (!this.cachedKeys) {
            this.cachedKeys = document.querySelectorAll('.key');
        }
        
        this.cachedKeys.forEach(key => {
            if (this.isAnimating || this.gameOver) {
                key.disabled = true;
                key.style.opacity = '0.5';
                key.style.cursor = 'not-allowed';
                key.style.transition = 'opacity 0.2s ease';
            } else {
                key.disabled = false;
                key.style.opacity = '';
                key.style.cursor = 'pointer';
                key.style.transition = 'opacity 0.2s ease';
            }
        });
    }

    submitGuess() {
        // Prevent double submissions
        if (this.isSubmitting || this.currentGuess.length !== this.wordLength || this.isAnimating) return;
        
        const guess = this.currentGuess.toUpperCase();
        
        // Check if word is valid - use Set for O(1) lookup
        if (!this.validWordsSet.has(guess)) {
            this.showInvalidWord();
            this.announceToScreenReader('Invalid word. Please try another.');
            return;
        }
        
        // Check if word was already guessed
        if (this.guesses.includes(guess)) {
            this.showInvalidWord('Already guessed!');
            this.announceToScreenReader('You already guessed this word.');
            return;
        }
        
        this.isSubmitting = true;
        this.isAnimating = true;
        this.updateKeyboardState();
        this.guesses.push(guess);
        this.evaluateGuess(guess);
        this.currentGuess = '';
        this.updateBoard();
    }

    showInvalidWord(message = 'Not a valid word!') {
        const rowIndex = this.guesses.length;
        const row = this.getElement(`row-${rowIndex}`);
        if (row) {
            // Enhanced shake animation with better timing
            row.classList.add('shake');
            const shakeTimeout = setTimeout(() => {
                row.classList.remove('shake');
            }, 600);
            
            // Store timeout for cleanup
            if (!this.shakeTimeouts) {
                this.shakeTimeouts = [];
            }
            this.shakeTimeouts.push(shakeTimeout);
        }
        
        // Remove existing temp message
        const existing = document.querySelector('.temp-message');
        if (existing) {
            existing.remove();
        }
        
        // Show temporary message with better positioning
        const tempMsg = document.createElement('div');
        tempMsg.className = 'temp-message';
        tempMsg.textContent = message;
        tempMsg.setAttribute('role', 'alert');
        tempMsg.setAttribute('aria-live', 'assertive');
        
        // Calculate position to avoid overlap with game board
        const gameBoard = this.getElement('gameBoard');
        let topPosition = '20%';
        if (gameBoard) {
            const rect = gameBoard.getBoundingClientRect();
            topPosition = `${Math.max(100, rect.top - 60)}px`;
        }
        
        tempMsg.style.cssText = `
            position: fixed;
            top: ${topPosition};
            left: 50%;
            transform: translateX(-50%);
            background: rgba(244, 67, 54, 0.95);
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 3000;
            animation: fadeInOut 2s ease;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            max-width: 90%;
            text-align: center;
            pointer-events: none;
        `;
        document.body.appendChild(tempMsg);
        const msgTimeout = setTimeout(() => {
            if (tempMsg.parentNode) {
                tempMsg.parentNode.removeChild(tempMsg);
            }
        }, 2000);
        
        // Store timeout for cleanup
        if (!this.messageTimeouts) {
            this.messageTimeouts = [];
        }
        this.messageTimeouts.push(msgTimeout);
    }

    evaluateGuess(guess) {
        const rowIndex = this.guesses.length - 1;
        const row = this.getElement(`row-${rowIndex}`);
        if (!row) {
            this.isAnimating = false;
            this.isSubmitting = false;
            this.updateKeyboardState();
            return;
        }
        
        const result = this.getGuessResult(guess);
        let animationComplete = 0;
        const totalAnimations = this.wordLength;
        const animationTimeouts = []; // Track timeouts for cleanup
        
        // Clear previous state classes
        for (let i = 0; i < this.wordLength; i++) {
            const tile = row.children[i];
            tile.classList.remove('correct', 'present', 'absent');
        }
        
        for (let i = 0; i < this.wordLength; i++) {
            const tile = row.children[i];
            tile.textContent = guess[i];
            
            const timeout = setTimeout(() => {
                tile.classList.add(result[i]);
                this.updateKeyboard(guess[i], result[i]);
                
                // Update aria-label for accessibility
                const status = result[i] === 'correct' ? 'correct' : result[i] === 'present' ? 'present but wrong position' : 'not in word';
                tile.setAttribute('aria-label', `Row ${rowIndex + 1}, Position ${i + 1}, letter ${guess[i]}, ${status}`);
                
                animationComplete++;
                if (animationComplete === totalAnimations) {
                    this.isAnimating = false;
                    this.isSubmitting = false;
                    this.updateKeyboardState();
                    this.checkGameEnd(guess);
                }
            }, i * 150 + 300);
            
            animationTimeouts.push(timeout);
        }
        
        // Store timeouts for potential cleanup (though unlikely needed)
        this.currentAnimationTimeouts = animationTimeouts;
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
            const triesText = `${this.guesses.length} ${this.guesses.length === 1 ? 'try' : 'tries'}`;
            this.announceToScreenReader(`Congratulations! You won in ${triesText}!`);
            setTimeout(() => this.showMessage('🎉 You Won!', this.targetWord, `Great job! You got it in ${triesText}!`), 800);
        } else if (this.guesses.length >= this.maxGuesses) {
            this.gameOver = true;
            this.stats.gamesPlayed++;
            this.stats.currentStreak = 0;
            this.saveStats();
            this.announceToScreenReader(`Game over. The word was ${this.targetWord}`);
            setTimeout(() => this.showMessage('Game Over', this.targetWord, 'Better luck next time!'), 800);
        }
        this.updateStats();
    }

    celebrateWin() {
        const rowIndex = this.guesses.length - 1;
        const row = this.getElement(`row-${rowIndex}`);
        if (!row) return;
        
        // Enhanced bounce animation for winning row
        row.style.animation = 'bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        setTimeout(() => {
            row.style.animation = '';
        }, 600);
        
        // Add pulse effect to winning tiles
        const tiles = row.querySelectorAll('.letter-tile');
        tiles.forEach((tile, index) => {
            setTimeout(() => {
                tile.style.animation = 'pulse 0.3s ease';
                setTimeout(() => {
                    tile.style.animation = '';
                }, 300);
            }, index * 50);
        });
        
        // Confetti effect
        this.createConfetti();
    }

    createConfetti() {
        this.cleanupConfetti();
        const colors = ['#6aaa64', '#c9b458', '#FFD700', '#4CAF50'];
        // Reduced count for better performance on lower-end devices
        const confettiCount = Math.min(40, window.innerWidth > 768 ? 50 : 30);
        
        // Create all confetti at once for better performance
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 8 + Math.random() * 6;
            const duration = 2 + Math.random() * 2;
            const delay = Math.random() * 0.5;
            const left = Math.random() * 100;
            
            confetti.style.cssText = `
                position: fixed;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                left: ${left}%;
                top: -10px;
                z-index: 3000;
                border-radius: 50%;
                pointer-events: none;
                animation: confettiFall ${duration}s linear ${delay}s forwards;
                will-change: transform, opacity;
            `;
            document.body.appendChild(confetti);
            this.confettiElements.push(confetti);
            
            // Auto cleanup with proper timeout tracking
            const cleanupTimeout = setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                    const index = this.confettiElements.indexOf(confetti);
                    if (index > -1) {
                        this.confettiElements.splice(index, 1);
                    }
                }
            }, (duration + delay) * 1000);
            
            // Store timeout for cleanup if needed
            if (!this.confettiTimeouts) {
                this.confettiTimeouts = [];
            }
            this.confettiTimeouts.push(cleanupTimeout);
        }
    }

    cleanupConfetti() {
        // Cleanup confetti elements
        this.confettiElements.forEach(confetti => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        });
        this.confettiElements = [];
        
        // Cleanup confetti timeouts
        if (this.confettiTimeouts) {
            this.confettiTimeouts.forEach(timeout => clearTimeout(timeout));
            this.confettiTimeouts = [];
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
        // Use cached keys if available, otherwise query
        const keys = this.cachedKeys || document.querySelectorAll('.key');
        if (!this.cachedKeys) {
            this.cachedKeys = keys;
        }
        
        keys.forEach(key => {
            if (key.textContent === letter && key.textContent.length === 1) {
                // Add smooth transition for status changes
                key.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                
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
        const message = this.getElement('message');
        const content = this.getElement('messageContent');
        const wordEl = this.getElement('messageWord');
        const subtitleEl = this.getElement('messageSubtitle');
        
        if (!message || !content || !wordEl) return;
        
        // Store current focus for restoration
        this.previousActiveElement = document.activeElement;
        
        content.textContent = title;
        wordEl.textContent = word;
        if (subtitleEl) {
            subtitleEl.textContent = subtitle;
        }
        message.classList.add('show');
        message.setAttribute('role', 'dialog');
        message.setAttribute('aria-labelledby', 'messageContent');
        message.setAttribute('aria-modal', 'true');
        
        // Setup focus trap
        this.setupFocusTrap(message);
        
        // Focus the play again button for accessibility
        const playButton = message.querySelector('.message-button');
        if (playButton) {
            setTimeout(() => playButton.focus(), 100);
        }
    }

    closeMessage() {
        const message = this.getElement('message');
        if (message) {
            message.classList.remove('show');
            message.removeAttribute('role');
            message.removeAttribute('aria-labelledby');
            message.removeAttribute('aria-modal');
        }
        
        // Remove focus trap
        this.removeFocusTrap();
        
        // Restore focus
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
            try {
                this.previousActiveElement.focus();
            } catch (e) {
                // Fallback if element is no longer in DOM
                document.body.focus();
            }
        }
        this.previousActiveElement = null;
        
        this.startNewGame();
        this.createBoard();
        this.resetKeyboard();
        this.updateStats();
        this.announceToScreenReader('New game started');
    }

    resetKeyboard() {
        // Clear cached keys to force refresh
        this.cachedKeys = null;
        
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove('correct', 'present', 'absent');
            key.disabled = false;
            key.style.opacity = '';
            key.style.cursor = 'pointer';
            key.style.transform = '';
            key.style.transition = '';
            // Cleanup touch handlers if they exist
            if (key._touchHandlers) {
                key.removeEventListener('touchstart', key._touchHandlers.start);
                key.removeEventListener('touchend', key._touchHandlers.end);
                key.removeEventListener('touchcancel', key._touchHandlers.cancel);
                delete key._touchHandlers;
            }
        });
    }

    setupFocusTrap(modal) {
        // Remove existing trap if any
        this.removeFocusTrap();
        
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (!firstElement) return;
        
        this.modalFocusTrap = (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        
        modal.addEventListener('keydown', this.modalFocusTrap);
    }
    
    removeFocusTrap() {
        if (this.modalFocusTrap) {
            const modals = document.querySelectorAll('.message.show, .instructions-modal.show');
            modals.forEach(modal => {
                modal.removeEventListener('keydown', this.modalFocusTrap);
            });
            this.modalFocusTrap = null;
        }
    }
    
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            if (announcement.parentNode) {
                announcement.parentNode.removeChild(announcement);
            }
        }, 1000);
    }

    loadStats() {
        // Check if localStorage is available
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
        } catch (e) {
            // localStorage not available, return default stats
            return {
                gamesPlayed: 0,
                wins: 0,
                currentStreak: 0,
                maxStreak: 0
            };
        }
        
        try {
            const saved = localStorage.getItem('wordleStats');
            if (saved) {
                const stats = JSON.parse(saved);
                // Ensure all required fields exist and are valid
                return {
                    gamesPlayed: Math.max(0, parseInt(stats.gamesPlayed) || 0),
                    wins: Math.max(0, parseInt(stats.wins) || 0),
                    currentStreak: Math.max(0, parseInt(stats.currentStreak) || 0),
                    maxStreak: Math.max(0, parseInt(stats.maxStreak) || 0)
                };
            }
        } catch (e) {
            // Silently handle parse errors - return default stats
        }
        return {
            gamesPlayed: 0,
            wins: 0,
            currentStreak: 0,
            maxStreak: 0
        };
    }

    saveStats() {
        // Check if localStorage is available
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
        } catch (e) {
            // localStorage not available, silently fail
            return;
        }
        
        try {
            localStorage.setItem('wordleStats', JSON.stringify(this.stats));
        } catch (e) {
            // Handle quota exceeded or other storage errors gracefully
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                // Try to clear old data and retry once
                try {
                    // Clear and keep only essential stats
                    const essentialStats = {
                        gamesPlayed: this.stats.gamesPlayed,
                        wins: this.stats.wins,
                        currentStreak: this.stats.currentStreak,
                        maxStreak: this.stats.maxStreak
                    };
                    localStorage.setItem('wordleStats', JSON.stringify(essentialStats));
                } catch (retryError) {
                    // If still fails, silently fail - stats are not critical
                }
            }
        }
    }

    updateStats() {
        // Ensure stats are valid (non-negative, wins <= gamesPlayed)
        this.stats.gamesPlayed = Math.max(0, this.stats.gamesPlayed || 0);
        this.stats.wins = Math.max(0, Math.min(this.stats.wins || 0, this.stats.gamesPlayed));
        this.stats.currentStreak = Math.max(0, this.stats.currentStreak || 0);
        this.stats.maxStreak = Math.max(0, this.stats.maxStreak || 0);
        
        const gamesPlayedEl = this.getElement('gamesPlayed');
        const winRateEl = this.getElement('winRate');
        const currentStreakEl = this.getElement('currentStreak');
        const maxStreakEl = this.getElement('maxStreak');
        
        // Animate stat changes with smooth transitions
        if (gamesPlayedEl) {
            gamesPlayedEl.style.transition = 'transform 0.3s ease';
            gamesPlayedEl.style.transform = 'scale(1.1)';
            gamesPlayedEl.textContent = this.stats.gamesPlayed;
            setTimeout(() => {
                if (gamesPlayedEl) gamesPlayedEl.style.transform = 'scale(1)';
            }, 300);
        }
        
        if (winRateEl) {
            const winRate = this.stats.gamesPlayed > 0 ? 
                Math.round((this.stats.wins / this.stats.gamesPlayed) * 100) : 0;
            winRateEl.style.transition = 'transform 0.3s ease';
            winRateEl.style.transform = 'scale(1.1)';
            winRateEl.textContent = winRate + '%';
            setTimeout(() => {
                if (winRateEl) winRateEl.style.transform = 'scale(1)';
            }, 300);
        }
        
        if (currentStreakEl) {
            currentStreakEl.style.transition = 'transform 0.3s ease';
            currentStreakEl.style.transform = 'scale(1.1)';
            currentStreakEl.textContent = this.stats.currentStreak;
            setTimeout(() => {
                if (currentStreakEl) currentStreakEl.style.transform = 'scale(1)';
            }, 300);
        }
        
        if (maxStreakEl) {
            maxStreakEl.style.transition = 'transform 0.3s ease';
            maxStreakEl.style.transform = 'scale(1.1)';
            maxStreakEl.textContent = this.stats.maxStreak;
            setTimeout(() => {
                if (maxStreakEl) maxStreakEl.style.transform = 'scale(1)';
            }, 300);
        }
    }
}

function showInstructions() {
    const modal = window.wordleGame ? window.wordleGame.getElement('instructionsModal') : document.getElementById('instructionsModal');
    if (modal) {
        // Store current focus
        if (window.wordleGame) {
            window.wordleGame.previousActiveElement = document.activeElement;
        }
        
        modal.classList.add('show');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'instructionsTitle');
        modal.setAttribute('aria-modal', 'true');
        
        // Setup focus trap
        if (window.wordleGame) {
            window.wordleGame.setupFocusTrap(modal);
        }
        
        const closeBtn = modal.querySelector('.close-button');
        if (closeBtn) {
            setTimeout(() => closeBtn.focus(), 100);
        }
    }
}

function closeInstructions() {
    const modal = window.wordleGame ? window.wordleGame.getElement('instructionsModal') : document.getElementById('instructionsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.removeAttribute('role');
        modal.removeAttribute('aria-labelledby');
        modal.removeAttribute('aria-modal');
        
        // Remove focus trap and restore focus
        if (window.wordleGame) {
            window.wordleGame.removeFocusTrap();
            if (window.wordleGame.previousActiveElement && typeof window.wordleGame.previousActiveElement.focus === 'function') {
                try {
                    window.wordleGame.previousActiveElement.focus();
                } catch (e) {
                    document.body.focus();
                }
            }
            window.wordleGame.previousActiveElement = null;
        }
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
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }
    @keyframes confettiFall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }
    @keyframes fadeInOut {
        0%, 100% { 
            opacity: 0; 
            transform: translateX(-50%) translateY(-10px); 
        }
        50% { 
            opacity: 1; 
            transform: translateX(-50%) translateY(0); 
        }
    }
    .active-row {
        opacity: 1;
    }
    .active-row .letter-tile:not(.filled) {
        border-color: rgba(255, 215, 0, 0.6);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
    }
    .key:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
    }
    .sr-only {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
    }
`;
document.head.appendChild(style);
