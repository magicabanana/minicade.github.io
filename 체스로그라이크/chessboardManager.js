/**
 * Represents the pure State and Rendering of the 8x8 Board.
 */
class ChessboardManager {
    constructor(containerId) {
        this.boardElement = document.getElementById(containerId);
        this.boardSize = 8;
        this.grid = [];     // 2D Array of ChessPiece objects (state)
        this.squares = [];  // 2D Array of DOM elements (view)

        this.initStructure();
        this.clearState();
    }

    initStructure() {
        this.boardElement.innerHTML = '';
        this.squares = [];
        for (let row = 0; row < this.boardSize; row++) {
            this.squares[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');

                square.dataset.row = row;
                square.dataset.col = col;

                this.boardElement.appendChild(square);
                this.squares[row][col] = square;
            }
        }
    }

    clearState() {
        this.grid = Array(8).fill(null).map(() => Array(8).fill(null));
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                this.squares[r][c].innerHTML = '';
                this.squares[r][c].classList.remove('move-highlight', 'attack-highlight', 'drag-over');
            }
        }
    }

    addPiece(piece) {
        if (piece.row >= 0 && piece.row < 8 && piece.col >= 0 && piece.col < 8) {
            this.grid[piece.row][piece.col] = piece;
        }
    }

    getPieceAt(row, col) {
        if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
        const p = this.grid[row][col];
        return p && p.alive ? p : null;
    }

    removePiece(row, col) {
        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            this.grid[row][col] = null;
        }
    }

    movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = this.getPieceAt(fromRow, fromCol);
        if (piece) {
            this.grid[fromRow][fromCol] = null;
            piece.row = toRow;
            piece.col = toCol;
            this.grid[toRow][toCol] = piece;
        }
    }

    clearHighlights() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                this.squares[r][c].classList.remove('move-highlight', 'attack-highlight', 'drag-over');
            }
        }
    }

    highlightSquare(row, col, highlightType) {
        // Types: 'move-highlight', 'attack-highlight', 'drag-over'
        this.squares[row][col].classList.add(highlightType);
    }

    /**
     * Synchronizes the DOM view with the internal array state.
     */
    render() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = this.squares[r][c];
                const piece = this.grid[r][c];

                // Keep highlights unless explicitly cleared, but clear pieces
                square.innerHTML = '';

                if (piece && piece.alive) {
                    const domPiece = document.createElement('div');
                    domPiece.classList.add('piece');

                    if (piece.type === 'obstacle') {
                        domPiece.classList.add('obstacle');
                        domPiece.innerHTML = '🧱';
                        domPiece.draggable = false;
                    } else {
                        domPiece.classList.add(piece.color);
                        domPiece.draggable = (piece.color === 'white'); // Only player is draggable

                        let icon = '';
                        if (piece.type === 'queen') icon = '♛';
                        else if (piece.type === 'knight') icon = '♞';
                        else if (piece.type === 'rook') icon = '♜';

                        // Structure: icon wrapper + mini health bar
                        domPiece.innerHTML = `
                            <div class="piece-icon">${icon}</div>
                            <div class="piece-stats">
                                <div class="stat-hp-container">
                                    <div class="stat-hp-bar" style="width: ${(piece.hp / piece.maxHp) * 100}%"></div>
                                </div>
                            </div>
                        `;
                    }

                    // Add references for InputManager
                    domPiece.dataset.row = r;
                    domPiece.dataset.col = c;

                    square.appendChild(domPiece);
                }
            }
        }
    }
}
