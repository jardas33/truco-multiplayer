// 📊 GAME STATISTICS SYSTEM
// Tracks player performance across all games

class GameStats {
    constructor() {
        this.stats = this.loadStats();
        this.currentGame = null;
        this.currentSession = {
            startTime: Date.now(),
            gamesPlayed: 0,
            wins: 0,
            totalScore: 0
        };
    }

    // Load stats from localStorage
    loadStats() {
        const saved = localStorage.getItem('gameStats');
        return saved ? JSON.parse(saved) : {
            totalGamesPlayed: 0,
            totalWins: 0,
            totalScore: 0,
            games: {
                truco: { played: 0, won: 0, bestScore: 0 },
                poker: { played: 0, won: 0, bestScore: 0 },
                blackjack: { played: 0, won: 0, bestScore: 0 },
                hearts: { played: 0, won: 0, bestScore: 0 },
                goFish: { played: 0, won: 0, bestScore: 0 },
                war: { played: 0, won: 0, bestScore: 0 },
                crazyEights: { played: 0, won: 0, bestScore: 0 }
            },
            achievements: [],
            lastPlayed: null
        };
    }

    // Save stats to localStorage
    saveStats() {
        localStorage.setItem('gameStats', JSON.stringify(this.stats));
    }

    // Start tracking a new game
    startGame(gameType) {
        this.currentGame = gameType;
        this.currentSession.startTime = Date.now();
        this.stats.lastPlayed = gameType;
        console.log(`📊 Started tracking game: ${gameType}`);
    }

    // End game and update stats
    endGame(won, score = 0) {
        if (!this.currentGame) return;

        this.currentSession.gamesPlayed++;
        if (won) {
            this.currentSession.wins++;
            this.currentSession.totalScore += score;
        }

        // Update overall stats
        this.stats.totalGamesPlayed++;
        if (won) {
            this.stats.totalWins++;
            this.stats.totalScore += score;
        }

        // Update game-specific stats
        const gameKey = this.getGameKey(this.currentGame);
        if (this.stats.games[gameKey]) {
            this.stats.games[gameKey].played++;
            if (won) {
                this.stats.games[gameKey].won++;
                if (score > this.stats.games[gameKey].bestScore) {
                    this.stats.games[gameKey].bestScore = score;
                }
            }
        }

        // Check for achievements
        this.checkAchievements();

        this.saveStats();
        console.log(`📊 Game ended: ${this.currentGame}, Won: ${won}, Score: ${score}`);
    }

    // Get game key for stats
    getGameKey(gameType) {
        const mapping = {
            'truco': 'truco',
            'poker': 'poker',
            'blackjack': 'blackjack',
            'hearts': 'hearts',
            'go-fish': 'goFish',
            'war': 'war',
            'crazy-eights': 'crazyEights'
        };
        return mapping[gameType] || gameType;
    }

    // Check for new achievements
    checkAchievements() {
        const achievements = [
            {
                id: 'first_win',
                name: 'First Victory',
                description: 'Win your first game',
                condition: () => this.stats.totalWins === 1
            },
            {
                id: 'win_streak_5',
                name: 'Hot Streak',
                description: 'Win 5 games in a row',
                condition: () => this.currentSession.wins >= 5
            },
            {
                id: 'games_10',
                name: 'Getting Started',
                description: 'Play 10 games',
                condition: () => this.stats.totalGamesPlayed >= 10
            },
            {
                id: 'games_50',
                name: 'Card Enthusiast',
                description: 'Play 50 games',
                condition: () => this.stats.totalGamesPlayed >= 50
            },
            {
                id: 'games_100',
                name: 'Card Master',
                description: 'Play 100 games',
                condition: () => this.stats.totalGamesPlayed >= 100
            },
            {
                id: 'truco_master',
                name: 'Truco Master',
                description: 'Win 10 Truco games',
                condition: () => this.stats.games.truco.won >= 10
            },
            {
                id: 'poker_pro',
                name: 'Poker Pro',
                description: 'Win 10 Poker games',
                condition: () => this.stats.games.poker.won >= 10
            },
            {
                id: 'blackjack_expert',
                name: 'Blackjack Expert',
                description: 'Win 10 Blackjack games',
                condition: () => this.stats.games.blackjack.won >= 10
            }
        ];

        achievements.forEach(achievement => {
            if (!this.stats.achievements.includes(achievement.id) && achievement.condition()) {
                this.stats.achievements.push(achievement.id);
                this.showAchievement(achievement);
            }
        });
    }

    // Show achievement notification
    showAchievement(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">🏆</div>
                <div class="achievement-text">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInRight 0.5s ease-out;
            max-width: 300px;
        `;

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .achievement-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .achievement-icon {
                font-size: 24px;
            }
            .achievement-name {
                font-weight: bold;
                font-size: 16px;
            }
            .achievement-description {
                font-size: 12px;
                opacity: 0.8;
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.5s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 5000);
    }

    // Get win rate
    getWinRate() {
        return this.stats.totalGamesPlayed > 0 ? 
            (this.stats.totalWins / this.stats.totalGamesPlayed * 100).toFixed(1) : 0;
    }

    // Get session duration
    getSessionDuration() {
        return Math.floor((Date.now() - this.currentSession.startTime) / 1000);
    }

    // Get formatted session stats
    getSessionStats() {
        const duration = this.getSessionDuration();
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;

        return {
            duration: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
            gamesPlayed: this.currentSession.gamesPlayed,
            wins: this.currentSession.wins,
            winRate: this.currentSession.gamesPlayed > 0 ? 
                (this.currentSession.wins / this.currentSession.gamesPlayed * 100).toFixed(1) : 0,
            totalScore: this.currentSession.totalScore
        };
    }

    // Get overall stats
    getOverallStats() {
        return {
            totalGames: this.stats.totalGamesPlayed,
            totalWins: this.stats.totalWins,
            winRate: this.getWinRate(),
            totalScore: this.stats.totalScore,
            achievements: this.stats.achievements.length,
            lastPlayed: this.stats.lastPlayed
        };
    }

    // Get game-specific stats
    getGameStats(gameType) {
        const gameKey = this.getGameKey(gameType);
        return this.stats.games[gameKey] || { played: 0, won: 0, bestScore: 0 };
    }

    // Reset all stats
    resetStats() {
        if (confirm('Are you sure you want to reset all your game statistics? This cannot be undone.')) {
            this.stats = {
                totalGamesPlayed: 0,
                totalWins: 0,
                totalScore: 0,
                games: {
                    truco: { played: 0, won: 0, bestScore: 0 },
                    poker: { played: 0, won: 0, bestScore: 0 },
                    blackjack: { played: 0, won: 0, bestScore: 0 },
                    hearts: { played: 0, won: 0, bestScore: 0 },
                    goFish: { played: 0, won: 0, bestScore: 0 },
                    war: { played: 0, won: 0, bestScore: 0 },
                    crazyEights: { played: 0, won: 0, bestScore: 0 }
                },
                achievements: [],
                lastPlayed: null
            };
            this.saveStats();
            console.log('📊 All statistics have been reset');
        }
    }
}

// Global stats instance
window.gameStats = new GameStats();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStats;
}
