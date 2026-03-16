/**
 * Coordinates Game State, Turns, and rules between domains.
 */
class GameManager {
    constructor() {
        this.boardManager = new ChessboardManager('chessboard');
        this.inputManager = new InputManager(this.boardManager, this);
        this.effectManager = new EffectManager(this.boardManager);

        // UI Elements
        this.statusElement = document.getElementById('status');
        this.apDisplay = document.getElementById('ap-display');
        this.roundDisplay = document.getElementById('round-display');
        this.finalScoreDisplay = document.getElementById('final-score-display');

        // Scenes
        this.titleScene = document.getElementById('title-scene');
        this.gameScene = document.getElementById('game-scene');
        this.upgradeScene = document.getElementById('upgrade-scene');
        this.gameOverScene = document.getElementById('game-over-scene');

        // State
        this.round = 1;
        this.playerMaxHP = 3;
        this.maxActionPoints = 2;

        this.playerPieces = [];
        this.enemyPieces = [];

        this.turn = 'white';
        this.actionPoints = 2;
        this.gameOver = true;

        this.showScene(this.titleScene);
    }

    // --- Scene Logic ---
    showScene(sceneElement) {
        [this.titleScene, this.gameScene, this.upgradeScene, this.gameOverScene].forEach(s => s.classList.remove('active'));
        sceneElement.classList.add('active');
    }

    startGame() {
        this.round = 1;
        this.playerMaxHP = 3;
        this.maxActionPoints = 2;
        this.playerPieces = []; // Reset team for a fresh start

        this.startRound();
    }

    returnToTitle() {
        this.showScene(this.titleScene);
    }

    startRound() {
        this.gameOver = false;
        this.turn = 'white';
        this.actionPoints = this.maxActionPoints;
        this.roundDisplay.textContent = `Round ${this.round}`;

        this.generateBoard();
        this.updateStatusUI();
        this.boardManager.render();

        this.showScene(this.gameScene);
    }

    triggerGameOver() {
        this.gameOver = true;
        this.finalScoreDisplay.textContent = `You survived until Round ${this.round}`;
        this.showScene(this.gameOverScene);
    }

    triggerRoundClear() {
        this.gameOver = true;

        // Revive dead player pieces with 1 HP so they are not permanently lost, to prevent confusion
        this.playerPieces.forEach(p => {
            if (!p.alive) {
                p.alive = true;
                p.hp = 1;
            }
        });

        const allUpgrades = [
            { title: "Extra Action", desc: "+1 Max Action Point", apply: () => this.maxActionPoints++ },
            {
                title: "Heart Container", desc: "+1 Max HP & Full Heal", apply: () => {
                    this.playerMaxHP++;
                    this.playerPieces.forEach(p => p.hp = this.playerMaxHP);
                }
            },
            {
                title: "Medkit", desc: "Restore 2 HP (All)", apply: () => {
                    this.playerPieces.forEach(p => p.hp = Math.min(this.playerMaxHP, p.hp + 2));
                }
            },
            {
                title: "Sharpen Weapons", desc: "+1 Attack Power (All)", apply: () => {
                    this.playerPieces.forEach(p => p.attackPower += 1);
                }
            },
            {
                title: "Fortify Armor", desc: "+2 Max HP & Heal (All)", apply: () => {
                    this.playerMaxHP += 2;
                    this.playerPieces.forEach(p => {
                        p.maxHp += 2;
                        p.hp += 2;
                    });
                }
            }
        ];

        this.shuffleArray(allUpgrades);
        const upgradeOptions = allUpgrades.slice(0, 3);

        this.inputManager.bindUpgradeButtons(upgradeOptions);
        this.showScene(this.upgradeScene);
    }

    applyUpgrade(opt) {
        opt.apply();
        this.round++;
        this.startRound();
    }

    // --- Board Generation ---
    generateBoard() {
        this.boardManager.clearState();
        this.enemyPieces = [];

        // Spawn Player Team
        // If first round or complete fresh start, start with brand new team
        if (this.playerPieces.length === 0) {
            const queen = new ChessPiece(7, 3, 'white', 'queen');
            queen.setStats(this.playerMaxHP, 1);

            const rook = new ChessPiece(7, 4, 'white', 'rook');
            rook.setStats(this.playerMaxHP, 1);

            this.playerPieces = [queen, rook];
        } else {
            // Re-place surviving pieces at start locations
            let startCols = [3, 4, 2, 5, 1, 6, 0, 7];
            this.playerPieces = this.playerPieces.filter(p => p.alive);
            this.playerPieces.forEach((p, idx) => {
                p.row = 7 - Math.floor(idx / 8);
                p.col = startCols[idx % 8];
            });
        }

        // Add to board
        this.playerPieces.forEach(p => this.boardManager.addPiece(p));

        // Spawn Enemies
        const numQueens = Math.floor(this.round / 3);
        const numKnights = 5 + Math.floor((this.round - 1) / 2);

        // Enemy HP Scaling: Base 5, +1 per round after round 1
        const enemyHP = 5 + (this.round - 1);

        let availableTopSquares = [];
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) availableTopSquares.push({ row: r, col: c });
        }

        this.shuffleArray(availableTopSquares);

        for (let i = 0; i < numQueens && availableTopSquares.length > 0; i++) {
            let pos = availableTopSquares.pop();
            const q = new ChessPiece(pos.row, pos.col, 'black', 'queen');
            q.setStats(enemyHP, 1);
            this.enemyPieces.push(q);
            this.boardManager.addPiece(q);
        }

        for (let i = 0; i < numKnights && availableTopSquares.length > 0; i++) {
            let pos = availableTopSquares.pop();
            const k = new ChessPiece(pos.row, pos.col, 'black', 'knight');
            k.setStats(enemyHP, 1);
            this.enemyPieces.push(k);
            this.boardManager.addPiece(k);
        }

        // Spawn Obstacles
        const numObstacles = Math.min(2 + this.round, 10);
        let availableMiddleSquares = [];
        for (let r = 3; r < 6; r++) {
            for (let c = 0; c < 8; c++) availableMiddleSquares.push({ row: r, col: c });
        }
        this.shuffleArray(availableMiddleSquares);

        for (let i = 0; i < numObstacles && availableMiddleSquares.length > 0; i++) {
            let pos = availableMiddleSquares.pop();
            const obs = new ChessPiece(pos.row, pos.col, null, 'obstacle');
            this.boardManager.addPiece(obs);
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Core Logic Callbacks from InputManager ---
    showValidActionsFor(piece) {
        this.boardManager.clearHighlights();
        const validMoves = piece.getValidMoves(this.boardManager);

        validMoves.forEach(m => {
            if (m.type === 'move') {
                this.boardManager.highlightSquare(m.row, m.col, 'move-highlight');
            } else if (m.type === 'attack') {
                this.boardManager.highlightSquare(m.row, m.col, 'attack-highlight');
            }
        });
    }

    onPlayerIntentMove(piece, toRow, toCol) {
        // Validation: Verify this was a valid highlighted move
        const validMoves = piece.getValidMoves(this.boardManager);
        const move = validMoves.find(m => m.row === toRow && m.col === toCol && m.type === 'move');

        if (move) {
            this.boardManager.movePiece(piece.row, piece.col, toRow, toCol);
            this.consumePlayerAction();
        }
    }

    onPlayerIntentAttack(targetPiece) {
        // Validation: The inputManager passes the intended target.
        // We know which player piece is selected because inputManager tracks it? No, inputManager doesn't track selected piece for attacks easily.
        // The attack intent needs to know WHO is attacking. 
        // We will loop through all alive player pieces to see if ANY of them can hit the target.
        // We will execute the attack from the FIRST valid piece that can hit it using current rules.

        let attacker = null;
        for (let p of this.playerPieces) {
            if (!p.alive) continue;
            const moves = p.getValidMoves(this.boardManager);
            if (moves.find(m => m.row === targetPiece.row && m.col === targetPiece.col && m.type === 'attack')) {
                attacker = p;
                break;
            }
        }

        if (attacker) {
            // Apply Damage
            targetPiece.takeDamage(attacker.attackPower);
            this.effectManager.playDamageText(targetPiece.row, targetPiece.col, attacker.attackPower);

            if (!targetPiece.alive) {
                this.effectManager.playDeathEffect(targetPiece.row, targetPiece.col);
                this.boardManager.removePiece(targetPiece.row, targetPiece.col);
            } else {
                this.effectManager.playHitEffect(targetPiece.row, targetPiece.col);
            }
            this.consumePlayerAction();
        }
    }

    consumePlayerAction() {
        this.actionPoints--;
        this.boardManager.clearHighlights();
        this.boardManager.render();
        this.updateStatusUI();

        // Check clear
        this.checkWinLossCondition();

        if (!this.gameOver && this.actionPoints <= 0) {
            this.turn = 'black';
            this.updateStatusUI();
            setTimeout(() => this.executeAITurn(), 500); // Small delay to signal AI start
        }
    }

    // --- AI Logic ---
    executeAITurn() {
        if (this.gameOver) return;

        const aliveEnemies = this.enemyPieces.filter(p => p.alive);

        // Loop recursively with setTimeout for visual pacing (no async/await freezing DOM needed)
        let i = 0;
        const nextAIMove = () => {
            if (i >= aliveEnemies.length || this.gameOver) {
                this.endAITurn();
                return;
            }

            const piece = aliveEnemies[i];
            const validMoves = piece.getValidMoves(this.boardManager);

            if (validMoves.length > 0) {
                // 1. Prioritize attacking ANY player piece
                const attackMove = validMoves.find(m => m.type === 'attack' && this.playerPieces.includes(m.target));
                let selectedMove = null;

                if (attackMove) {
                    selectedMove = attackMove;
                } else {
                    // 2. Otherwise take a random distinct move, avoiding attacking teammates
                    const emptyMoves = validMoves.filter(m => m.type === 'move');
                    if (emptyMoves.length > 0) {
                        const randomIndex = Math.floor(Math.random() * emptyMoves.length);
                        selectedMove = emptyMoves[randomIndex];
                    }
                }

                if (selectedMove) {
                    if (selectedMove.type === 'attack' && this.playerPieces.includes(selectedMove.target)) {
                        const targetPlayer = selectedMove.target;
                        // AI hits Player
                        targetPlayer.takeDamage(piece.attackPower);
                        this.effectManager.playDamageText(targetPlayer.row, targetPlayer.col, piece.attackPower);

                        if (!targetPlayer.alive) {
                            this.effectManager.playDeathEffect(targetPlayer.row, targetPlayer.col);
                            this.boardManager.removePiece(targetPlayer.row, targetPlayer.col);
                        } else {
                            this.effectManager.playHitEffect(targetPlayer.row, targetPlayer.col);
                        }

                        // Kamikaze (AI piece dies)
                        const kamikazeDamage = piece.hp;
                        piece.takeDamage(kamikazeDamage);
                        this.effectManager.playDamageText(piece.row, piece.col, kamikazeDamage);
                        this.effectManager.playDeathEffect(piece.row, piece.col);
                        this.boardManager.removePiece(piece.row, piece.col);
                    } else {
                        // Normal AI move
                        this.boardManager.movePiece(piece.row, piece.col, selectedMove.row, selectedMove.col);
                    }

                    this.boardManager.render();
                    this.updateStatusUI();
                    this.checkWinLossCondition();
                }
            }

            i++;
            setTimeout(nextAIMove, 500); // Fixed 500ms between AI turns. Clean visual pause.
        };

        nextAIMove();
    }

    endAITurn() {
        if (this.gameOver) return;
        this.turn = 'white';
        this.actionPoints = this.maxActionPoints;
        this.updateStatusUI();
        this.checkWinLossCondition();
    }

    checkWinLossCondition() {
        const alivePlayers = this.playerPieces.filter(p => p.alive);
        if (alivePlayers.length === 0) {
            this.triggerGameOver();
            return;
        }

        const anyAlive = this.enemyPieces.some(p => p.alive);
        if (!anyAlive) {
            this.triggerRoundClear();
        }
    }

    // --- UI Update ---
    updateStatusUI() {
        if (this.gameOver) return;

        this.updatePartyHUDUI();

        this.apDisplay.textContent = `AP: ${'⚡'.repeat(this.actionPoints)}${'✨'.repeat(this.maxActionPoints - this.actionPoints)}`;

        if (this.turn === 'white') {
            this.statusElement.textContent = "Player's Turn";
            this.statusElement.style.color = "#f1c40f";
            this.refreshAttackHighlights();
        } else {
            this.statusElement.textContent = "AI's Turn...";
            this.statusElement.style.color = "#ecf0f1";
            this.boardManager.clearHighlights();
        }
    }

    refreshAttackHighlights() {
        this.boardManager.clearHighlights();
        if (this.turn === 'white' && !this.gameOver) {
            this.playerPieces.filter(p => p.alive).forEach(piece => {
                const validMoves = piece.getValidMoves(this.boardManager);
                validMoves.forEach(m => {
                    if (m.type === 'attack') {
                        this.boardManager.highlightSquare(m.row, m.col, 'attack-highlight');
                    }
                });
            });
        }
    }

    updatePartyHUDUI() {
        const hudSlots = [
            document.getElementById('hud-slot-0'),
            document.getElementById('hud-slot-1'),
            document.getElementById('hud-slot-2'),
            document.getElementById('hud-slot-3')
        ];

        // Ensure we only process up to 4 alive pieces for the HUD
        const alivePieces = this.playerPieces.filter(p => p.alive).slice(0, 4);

        for (let i = 0; i < 4; i++) {
            const slot = hudSlots[i];
            const piece = alivePieces[i];

            if (piece) {
                // Formatting specific names/icons
                let icon = '';
                let name = '';
                if (piece.type === 'queen') { icon = '♛'; name = 'Queen'; }
                else if (piece.type === 'rook') { icon = '♜'; name = 'Rook'; }
                else if (piece.type === 'knight') { icon = '♞'; name = 'Knight'; }

                slot.classList.remove('empty');
                slot.classList.add('active');

                // Calculate HP Percentage
                const hpPercent = (piece.hp / piece.maxHp) * 100;

                slot.innerHTML = `
                    <div class="hud-portrait">${icon}</div>
                    <div class="hud-info">
                        <div class="hud-name">${name}</div>
                        <div class="hud-hp-track">
                            <div class="hud-hp-fill" style="width: ${hpPercent}%"></div>
                        </div>
                        <div class="hud-hp-text">
                            ${piece.hp} / ${piece.maxHp} HP
                            <span class="hud-atk-text">| ⚔️ ${piece.attackPower}</span>
                        </div>
                        <div class="hud-skills">
                            <!-- Placeholder for skills -->
                            <div class="skill-slot"></div>
                            <div class="skill-slot"></div>
                        </div>
                    </div>
                `;
            } else {
                // Empty slot state
                slot.classList.remove('active');
                slot.classList.add('empty');
                slot.innerHTML = `
                    <div class="hud-info" style="justify-content: center; align-items: center; opacity: 0.5;">
                        <span style="font-size: 24px;">+</span>
                    </div>
                `;
            }
        }
    }
}

// Bootstrapping the application
window.addEventListener('DOMContentLoaded', () => {
    new GameManager();
});
