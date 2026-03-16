/**
 * Handles playing temporary visual effects on the DOM.
 */
class EffectManager {
    constructor(boardManager) {
        this.boardManager = boardManager;
        this.boardElement = boardManager.boardElement;

        // Ensure relative positioning for absolute children
        if (getComputedStyle(this.boardElement).position === 'static') {
            this.boardElement.style.position = 'relative';
        }
    }

    /**
     * Gets exact center pixel coordinates of a grid square.
     */
    getSquareCenter(row, col) {
        // Assuming 60px squares as defined in CSS
        const squareSize = 60;
        const x = (col * squareSize) + (squareSize / 2);
        const y = (row * squareSize) + (squareSize / 2);
        return { x, y };
    }

    /**
     * Plays a brief flash/particle effect indicating damage was taken but piece survived.
     */
    playHitEffect(row, col) {
        const pos = this.getSquareCenter(row, col);

        const fx = document.createElement('div');
        fx.classList.add('fx-hit');
        fx.style.left = `${pos.x}px`;
        fx.style.top = `${pos.y}px`;

        // Give it a generic bang emoji or rely purely on CSS
        fx.innerHTML = '💥';

        this.boardElement.appendChild(fx);

        // Remove after animation completes (css is 0.4s)
        setTimeout(() => {
            if (fx.parentNode) fx.parentNode.removeChild(fx);
        }, 400);
    }

    /**
     * Plays a larger expanding explosion effect indicating piece destruction.
     */
    playDeathEffect(row, col) {
        const pos = this.getSquareCenter(row, col);

        const fx = document.createElement('div');
        fx.classList.add('fx-death');
        fx.style.left = `${pos.x}px`;
        fx.style.top = `${pos.y}px`;

        this.boardElement.appendChild(fx);

        // Remove after animation completes (css is 0.6s)
        setTimeout(() => {
            if (fx.parentNode) fx.parentNode.removeChild(fx);
        }, 600);
    }

    /**
     * Plays floating damage text over a square.
     */
    playDamageText(row, col, amount) {
        const pos = this.getSquareCenter(row, col);

        const fx = document.createElement('div');
        fx.classList.add('fx-damage-text');
        fx.style.left = `${pos.x}px`;
        fx.style.top = `${pos.y}px`;
        fx.textContent = `-${amount}`;

        this.boardElement.appendChild(fx);

        // Remove after animation completes
        setTimeout(() => {
            if (fx.parentNode) fx.parentNode.removeChild(fx);
        }, 800);
    }

}
