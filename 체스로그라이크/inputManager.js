/**
 * Handles intent interpretation from mouse clicks and draggings.
 * Separates UI bindings from the game logic itself.
 */
class InputManager {
    constructor(boardManager, gameManager) {
        this.boardManager = boardManager;
        this.gameManager = gameManager;

        // Drag state
        this.draggedPieceObj = null;

        this.bindEvents();
    }

    bindEvents() {
        // 1. Scene Buttons
        document.getElementById('btn-start').addEventListener('click', () => this.gameManager.startGame());
        document.getElementById('btn-restart').addEventListener('click', () => this.gameManager.returnToTitle());

        // 2. Board Interactions
        const boardEl = this.boardManager.boardElement;

        // Click to Attack or Select
        boardEl.addEventListener('click', (e) => {
            if (this.gameManager.turn !== 'white' || this.gameManager.gameOver) return;

            const square = e.target.closest('.square');
            if (!square) return;

            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);

            const clickedPiece = this.boardManager.getPieceAt(row, col);

            // If we click an enemy, it might be an attack
            if (clickedPiece && clickedPiece.color === 'black' && clickedPiece.type !== 'obstacle') {
                this.gameManager.onPlayerIntentAttack(clickedPiece);
            }
        });

        // 3. Drag and Drop for Movement
        boardEl.addEventListener('dragstart', (e) => {
            if (this.gameManager.turn !== 'white' || this.gameManager.gameOver) return e.preventDefault();

            if (e.target.classList.contains('piece') && e.target.draggable) {
                const r = parseInt(e.target.dataset.row);
                const c = parseInt(e.target.dataset.col);
                this.draggedPieceObj = this.boardManager.getPieceAt(r, c);

                e.target.classList.add('dragging');

                // Show valid moves
                this.gameManager.showValidActionsFor(this.draggedPieceObj);
            } else {
                e.preventDefault();
            }
        });

        boardEl.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('piece')) {
                e.target.classList.remove('dragging');
            }
            this.boardManager.clearHighlights();
            this.draggedPieceObj = null;

            if (this.gameManager.turn === 'black' && !this.gameManager.gameOver) {
                this.gameManager.refreshAttackHighlights();
            }
        });

        boardEl.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            const square = e.target.closest('.square');
            if (square && square.classList.contains('move-highlight')) {
                square.classList.add('drag-over');
            }
        });

        boardEl.addEventListener('dragleave', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                square.classList.remove('drag-over');
            }
        });

        boardEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const square = e.target.closest('.square');
            if (!square) return;

            square.classList.remove('drag-over');

            const toRow = parseInt(square.dataset.row);
            const toCol = parseInt(square.dataset.col);

            // Only allow dropping on valid move squares
            if (square.classList.contains('move-highlight') && this.draggedPieceObj) {
                this.gameManager.onPlayerIntentMove(this.draggedPieceObj, toRow, toCol);
            }
        });
    }

    // Attach dynamically created Upgrade buttons
    bindUpgradeButtons(optionsData) {
        const container = document.querySelector('.upgrade-container');
        container.innerHTML = '';

        optionsData.forEach(opt => {
            const card = document.createElement('div');
            card.classList.add('upgrade-card');
            card.innerHTML = `<h3>${opt.title}</h3><p>${opt.desc}</p>`;
            card.addEventListener('click', () => {
                this.gameManager.applyUpgrade(opt);
            });
            container.appendChild(card);
        });
    }
}
