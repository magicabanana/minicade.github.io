/**
 * Base class for all pieces on the board.
 */
class ChessPiece {
    constructor(row, col, color, type) {
        this.row = row;
        this.col = col;
        this.color = color;
        this.type = type; // 'queen', 'knight', 'obstacle'

        // Base Stats
        this.hp = 1;
        this.maxHp = 1;
        this.attackPower = 1;
        this.alive = true;
    }

    // Set stats manually if needed
    setStats(hp, attackPower) {
        this.maxHp = hp;
        this.hp = hp;
        this.attackPower = attackPower;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
    }

    /**
     * Calculates valid moves and attacks.
     * @param {ChessboardManager} board - To check blocking pieces
     * @returns {Array} List of { row, col, type: 'move'|'attack', target: ChessPiece|null }
     */
    getValidMoves(board) {
        if (!this.alive || this.type === 'obstacle') return [];

        let moves = [];

        if (this.type === 'queen') {
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1], [0, 1],
                [1, -1], [1, 0], [1, 1]
            ];

            for (const [dr, dc] of directions) {
                let r = this.row + dr;
                let c = this.col + dc;

                while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const occupant = board.getPieceAt(r, c);

                    if (occupant) {
                        if (occupant.type === 'obstacle') {
                            break; // Blocked by wall
                        } else if (occupant.color !== this.color) { // Enemy
                            moves.push({ row: r, col: c, type: 'attack', target: occupant });
                        }
                        break; // Queen blocks line of sight
                    } else {
                        moves.push({ row: r, col: c, type: 'move', target: null });
                    }
                    r += dr;
                    c += dc;
                }
            }
        }
        else if (this.type === 'knight') {
            const knightMoves = [
                [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                [1, -2], [1, 2], [2, -1], [2, 1]
            ];

            for (const [dr, dc] of knightMoves) {
                const r = this.row + dr;
                const c = this.col + dc;

                if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const occupant = board.getPieceAt(r, c);
                    if (occupant) {
                        if (occupant.type !== 'obstacle' && occupant.color !== this.color) {
                            moves.push({ row: r, col: c, type: 'attack', target: occupant });
                        }
                    } else {
                        moves.push({ row: r, col: c, type: 'move', target: null });
                    }
                }
            }
        }
        else if (this.type === 'rook') {
            const directions = [
                [-1, 0], [1, 0], [0, -1], [0, 1] // Up, Down, Left, Right
            ];

            for (const [dr, dc] of directions) {
                let r = this.row + dr;
                let c = this.col + dc;

                while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                    const occupant = board.getPieceAt(r, c);

                    if (occupant) {
                        if (occupant.type === 'obstacle') {
                            break; // Blocked by wall
                        } else if (occupant.color !== this.color) { // Enemy
                            moves.push({ row: r, col: c, type: 'attack', target: occupant });
                        }
                        break; // Rook blocks line of sight
                    } else {
                        moves.push({ row: r, col: c, type: 'move', target: null });
                    }
                    r += dr;
                    c += dc;
                }
            }
        }

        return moves;
    }
}
