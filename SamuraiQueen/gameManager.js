document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const landingPage = document.getElementById('landing-page');
    const gameScene = document.getElementById('game-scene');
    const gameBoard = document.getElementById('game-board');
    const tilesLayer = document.getElementById('tiles-layer');
    const piecesLayer = document.getElementById('pieces-layer');

    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const muteBtn = document.getElementById('mute-btn');
    const gameOverTestBtn = document.getElementById('game-over-test-btn');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const finalScoreDisplay = document.getElementById('final-score');
    const retryBtn = document.getElementById('retry-btn');

    const tileDeleteBtn = document.getElementById('tile-delete-btn');
    const tileAddBtn = document.getElementById('tile-add-btn');

    let currentScore = 0;
    let queenPos = { row: 0, col: 3 };
    let queenElement = null;
    let isQueenSelected = true;
    let moveCount = 0;

    // 게임 설정 변수
    const SPAWN_INTERVAL = 3;      // 적 생성 주기 (N번 이동마다)
    const SPAWN_COUNT = 2;         // 적 생성 갯수
    const ENEMY_TURN_INTERVAL = 1; // 적 이동 주기 (N번 이동마다)

    // 보드 위 기물 상태 추적 (row_col -> pieceElement)
    let pieceMap = {};

    // Scene Management
    function switchScene(from, to) {
        from.classList.remove('active');
        to.classList.add('active');
    }

    function showGameOver(score) {
        finalScoreDisplay.textContent = score;
        gameOverOverlay.classList.add('active');
    }

    function hideGameOver() {
        gameOverOverlay.classList.remove('active');
    }

    // Chessboard Generation
    function createBoard() {
        tilesLayer.innerHTML = '';
        piecesLayer.innerHTML = '';
        pieceMap = {}; // 기물 맵 초기화
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                addTile(row, col);
            }
        }
    }

    function addTile(row, col) {
        const existing = tilesLayer.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
        if (existing) return;

        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.dataset.row = row;
        tile.dataset.col = col;

        tile.style.gridRow = row + 1;
        tile.style.gridColumn = col + 1;
        tile.style.zIndex = row;

        const isWhite = (row + col) % 2 === 0;
        tile.classList.add(isWhite ? 'white' : 'black');

        // 타일 클릭 시 바로 이동 시도 (퀸이 항상 선택된 상태이므로)
        tile.addEventListener('click', () => {
            handleTileClick(row, col);
        });

        tilesLayer.appendChild(tile);
    }

    function placePiece(type, row, col) {
        const piece = document.createElement('img');
        piece.classList.add('piece');
        piece.src = `Assets/${type}.png`;
        piece.alt = type;
        piece.dataset.type = type;

        piece.style.gridRow = row + 1;
        piece.style.gridColumn = col + 1;
        piece.style.zIndex = row + 10;

        piecesLayer.appendChild(piece);

        if (type === 'queen') {
            queenElement = piece;
            queenPos = { row, col };
            queenElement.classList.add('selected');
        } else {
            // 적 기물은 맵에 저장
            pieceMap[`${row}_${col}`] = piece;
        }

        return piece;
    }

    function spawnEnemy() {
        const pieceTypes = ['rook', 'bishop', 'knight'];
        for (let i = 0; i < SPAWN_COUNT; i++) {
            // 빈 타일 찾기 (루프마다 최신 상태 확인)
            const emptyTiles = [];
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (queenPos.row === r && queenPos.col === c) continue;
                    if (pieceMap[`${r}_${c}`]) continue;

                    if (tilesLayer.querySelector(`.tile[data-row="${r}"][data-col="${c}"]`)) {
                        emptyTiles.push({ r, c });
                    }
                }
            }

            if (emptyTiles.length > 0) {
                const randomTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
                const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
                placePiece(randomType, randomTile.r, randomTile.c);
                console.log(`Enemy #${i + 1} (${randomType}) spawned at (${randomTile.r}, ${randomTile.c})`);
            } else {
                console.log("No more empty tiles for spawning!");
                break;
            }
        }
    }

    // 선택 상태 변경 로직은 이제 거의 불필요하지만, 하이라이트 관리를 위해 유지 또는 간소화
    function refreshQueenStatus() {
        if (!queenElement) return;
        queenElement.classList.add('selected');
        updateHighlights();
    }

    // 타일 클릭 핸들러: 이동 가능 여부만 체크하고 즉시 이동
    function handleTileClick(row, col) {
        if (isValidQueenMove(row, col)) {
            moveQueen(row, col);
            moveCount++; // 이동 횟수 증가

            // 퀸 이동 후 지정된 주기마다 적들의 턴 진행 및 생성
            setTimeout(() => {
                if (moveCount % ENEMY_TURN_INTERVAL === 0) {
                    console.log(`Turn ${moveCount}: Enemies acting...`);
                    handleEnemyTurn();
                }

                if (moveCount % SPAWN_INTERVAL === 0) {
                    console.log(`Turn ${moveCount}: New enemy spawning...`);
                    spawnEnemy();
                }

                updateHighlights();
            }, 300);
        }
    }

    // 적들의 턴 처리
    async function handleEnemyTurn() {
        const enemyKeys = Object.keys(pieceMap);

        for (const key of enemyKeys) {
            const piece = pieceMap[key];
            if (!piece) continue;

            const type = piece.dataset.type;
            const [r, c] = key.split('_').map(Number);
            const bestMove = getBestEnemyMove(r, c, type);

            if (bestMove) {
                const newKey = `${bestMove.r}_${bestMove.c}`;

                // 퀸을 잡았는지 확인
                if (bestMove.r === queenPos.row && bestMove.c === queenPos.col) {
                    alert(`${type.toUpperCase()}에게 잡혔습니다!`);
                }

                // 위치 업데이트
                delete pieceMap[key];
                pieceMap[newKey] = piece;

                piece.style.gridRow = bestMove.r + 1;
                piece.style.gridColumn = bestMove.c + 1;
                piece.style.zIndex = bestMove.r + 10;

                console.log(`${type.toUpperCase()} moved from (${r}, ${c}) to (${bestMove.r}, ${bestMove.c})`);
            }
        }
    }

    // 룩의 행마에 따른 최선(가장 퀸과 가까워지는)의 이동 찾기
    function getBestEnemyMove(startR, startC, type) {
        let bestTarget = null;
        let minDistance = Infinity;
        let directions = [];

        if (type === 'rook') {
            directions = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        } else if (type === 'bishop') {
            directions = [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }];
        } else if (type === 'knight') {
            directions = [
                { dr: -2, dc: -1 }, { dr: -2, dc: 1 }, { dr: 2, dc: -1 }, { dr: 2, dc: 1 },
                { dr: -1, dc: -2 }, { dr: -1, dc: 2 }, { dr: 1, dc: -2 }, { dr: 1, dc: 2 }
            ];
        }

        if (type === 'knight') {
            // 나이트는 방향이 아니라 특정 지점들
            for (const dir of directions) {
                const tr = startR + dir.dr;
                const tc = startC + dir.dc;
                if (isValidKnightMove(startR, startC, tr, tc)) {
                    const d = Math.abs(tr - queenPos.row) + Math.abs(tc - queenPos.col);
                    if (d < minDistance) {
                        minDistance = d;
                        bestTarget = { r: tr, c: tc };
                    }
                }
            }
        } else {
            // 룩과 비숍은 경로 탐색
            for (const dir of directions) {
                // 해당 방향으로 갈 수 있는 모든 칸 체크 (장애물 전까지)
                for (let dist = 1; dist < 8; dist++) {
                    const tr = startR + dir.dr * dist;
                    const tc = startC + dir.dc * dist;

                    if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) break;

                    if (isValidRayMove(startR, startC, tr, tc)) {
                        // 퀸과의 거리 계산 (단순 절대값 합)
                        const d = Math.abs(tr - queenPos.row) + Math.abs(tc - queenPos.col);
                        if (d < minDistance) {
                            minDistance = d;
                            bestTarget = { r: tr, c: tc };
                        }
                    } else {
                        // 더 이상 못 가면 해당 방향 중단
                        break;
                    }
                }
            }
        }
        return bestTarget;
    }

    // 룩, 비숍과 같은 직선/대각선 이동 검증
    function isValidRayMove(startR, startC, targetR, targetC) {
        const rowDiff = targetR - startR;
        const colDiff = targetC - startC;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);

        // 룩은 직선 이동만 가능, 비숍은 대각선 이동만 가능
        // 이 함수는 이미 getBestEnemyMove에서 방향이 정해져서 오므로, 여기서는 경로만 체크
        // if (rowDiff !== 0 && colDiff !== 0 && absRowDiff !== absColDiff) return false; // 이 검사는 getBestEnemyMove에서 이미 처리됨

        const stepR = rowDiff === 0 ? 0 : rowDiff / absRowDiff;
        const stepC = colDiff === 0 ? 0 : colDiff / absColDiff;

        let curR = startR + stepR;
        let curC = startC + stepC;

        while (curR !== targetR || curC !== targetC) {
            // 경로에 타일이 없거나 다른 적이 있으면 못 감
            if (!tilesLayer.querySelector(`.tile[data-row="${curR}"][data-col="${curC}"]`)) return false;
            if (pieceMap[`${curR}_${curC}`]) return false;
            curR += stepR;
            curC += stepC;
        }

        // 최종 타일 존재 체크
        if (!tilesLayer.querySelector(`.tile[data-row="${targetR}"][data-col="${targetC}"]`)) return false;

        // 퀸 위치는 이동 가능(잡기 위함), 다른 적 위치는 불가
        if (pieceMap[`${targetR}_${targetC}`]) return false;

        return true;
    }

    // 전역 클릭 감지 디버깅
    window.addEventListener('click', (e) => {
        // console.log('Actual element clicked:', e.target);
    }, true);

    function isValidQueenMove(targetRow, targetCol) {
        const rowDiff = targetRow - queenPos.row;
        const colDiff = targetCol - queenPos.col;

        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);

        // 1. 기본 행마 규칙 (직선 또는 대각선)
        const isStraight = (rowDiff === 0 || colDiff === 0);
        const isDiagonal = (absRowDiff === absColDiff);
        const isDifferent = (rowDiff !== 0 || colDiff !== 0);

        if (!(isStraight || isDiagonal) || !isDifferent) return false;

        // 2. 경로 관통 체크 (장애물 및 타일 존재 여부)
        const stepRow = rowDiff === 0 ? 0 : rowDiff / absRowDiff;
        const stepCol = colDiff === 0 ? 0 : colDiff / absColDiff;

        let currentRow = queenPos.row + stepRow;
        let currentCol = queenPos.col + stepCol;

        // 시작점에서 목표점 직전까지 체크
        while (currentRow !== targetRow || currentCol !== targetCol) {
            // 타일이 없는지 체크
            const tileExists = !!tilesLayer.querySelector(`.tile[data-row="${currentRow}"][data-col="${currentCol}"]`);
            if (!tileExists) return false;

            // 기물에 막혀 있는지 체크
            if (pieceMap[`${currentRow}_${currentCol}`]) return false;

            currentRow += stepRow;
            currentCol += stepCol;
        }

        // 3. 최종 도달지 타일 존재 여부 체크
        const targetTileExists = !!tilesLayer.querySelector(`.tile[data-row="${targetRow}"][data-col="${targetCol}"]`);
        if (!targetTileExists) return false;

        return true;
    }

    function moveQueen(row, col) {
        if (!queenElement) return;

        // 이동하려는 곳에 적이 있는지 확인 (잡기 로직)
        const targetKey = `${row}_${col}`;
        if (pieceMap[targetKey]) {
            console.log(`Captured enemy at (${row}, ${col})`);
            pieceMap[targetKey].remove(); // 화면에서 제거
            delete pieceMap[targetKey];   // 데이터 모델에서 제거
            currentScore += 100;         // 점수 추가
        }

        queenPos.row = row;
        queenPos.col = col;

        queenElement.style.gridRow = row + 1;
        queenElement.style.gridColumn = col + 1;
        queenElement.style.zIndex = row + 10;

        console.log(`Queen moved to (${row}, ${col})`);
    }

    function updateHighlights() {
        const tiles = tilesLayer.querySelectorAll('.tile');
        tiles.forEach(tile => {
            const r = parseInt(tile.dataset.row);
            const c = parseInt(tile.dataset.col);

            if (isValidQueenMove(r, c)) {
                tile.classList.add('highlight');
            } else {
                tile.classList.remove('highlight');
            }
        });
    }

    function clearHighlights() {
        const tiles = tilesLayer.querySelectorAll('.tile');
        tiles.forEach(tile => tile.classList.remove('highlight'));
    }

    // Event Listeners
    startBtn.addEventListener('click', () => {
        console.log('Game Started');
        currentScore = 0;
        moveCount = 0;
        createBoard();
        placePiece('queen', 0, 3);

        updateHighlights();
        switchScene(landingPage, gameScene);
        hideGameOver();
    });

    tileDeleteBtn.addEventListener('click', () => {
        const tiles = tilesLayer.querySelectorAll('.tile');
        if (tiles.length > 0) {
            const randomIndex = Math.floor(Math.random() * tiles.length);
            const tileToRemove = tiles[randomIndex];
            const r = parseInt(tileToRemove.dataset.row);
            const c = parseInt(tileToRemove.dataset.col);

            // 퀸이나 적이 있는 타일은 일단 삭제하지 않거나 처리가 필요할 수도 있음
            // 여기서는 단순 삭제
            tileToRemove.remove();
            console.log(`Tile at (${r}, ${c}) removed`);
        }
    });

    tileAddBtn.addEventListener('click', () => {
        const emptySlots = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (!tilesLayer.querySelector(`.tile[data-row="${r}"][data-col="${c}"]`)) {
                    emptySlots.push({ r, c });
                }
            }
        }

        if (emptySlots.length > 0) {
            const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
            addTile(randomSlot.r, randomSlot.c);
            console.log(`Tile added at (${randomSlot.r}, ${randomSlot.c})`);
        }
    });

    restartBtn.addEventListener('click', () => {
        currentScore = 0;
        moveCount = 0;
        hideGameOver();
        createBoard();
        placePiece('queen', 0, 3);
        updateHighlights();
    });

    retryBtn.addEventListener('click', () => {
        currentScore = 0;
        moveCount = 0;
        hideGameOver();
        createBoard();
        placePiece('queen', 0, 3);
        updateHighlights();
    });

    pauseBtn.addEventListener('click', () => {
        console.log('Game Paused');
    });

    muteBtn.addEventListener('click', () => {
        const isMuted = muteBtn.classList.toggle('muted');
        muteBtn.querySelector('.icon').textContent = isMuted ? '🔇' : '🔊';
    });

    gameOverTestBtn.addEventListener('click', () => {
        showGameOver(currentScore);
    });
});
