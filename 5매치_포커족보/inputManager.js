// 사용자 입력(마우스/터치 드래그 연결)을 전담하여 관리
function InputManager() {
    let isDragging = false;
    let gridElement = null; // 이벤트의 기준이 될 게임 보드
    let selectionBoxElement = null; // UI에 보여줄 리스트 컨테이너
    let selectedItemsList = []; // 드래그된 아이템들을 담을 임시 리스트
    let svgOverlay = null; // 선을 그릴 SVG 요소

    function init() {
        gridElement = document.getElementById('grid');
        selectionBoxElement = document.getElementById('selection-items-box');
        if (!gridElement) return;

        // SVG 오버레이 준비
        svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgOverlay.id = "drag-line-svg";
        gridElement.appendChild(svgOverlay);

        // 마우스 이벤트
        gridElement.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // 터치 이벤트
        gridElement.addEventListener('touchstart', (e) => {
            onMouseDown(e.touches[0]);
        });
        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                if (e.cancelable) e.preventDefault();
                onMouseMove(e.touches[0]);
            }
        }, { passive: false });
        document.addEventListener('touchend', onMouseUp);
    }

    // 마우스/터치 좌표 위치의 item-wrapper 반환
    function getItemFromEvent(e) {
        let clientX = e.clientX;
        let clientY = e.clientY;
        if (clientX === undefined || clientY === undefined) return null;

        const elements = document.elementsFromPoint(clientX, clientY);
        for (let el of elements) {
            let wrapper = el.closest('.item-wrapper');
            if (wrapper) return wrapper;
        }
        return null;
    }

    // 선 그리기 함수
    function drawConnectionLines() {
        if (!svgOverlay) return;

        // 기존 선 모두 지우기
        svgOverlay.innerHTML = '';

        if (selectedItemsList.length < 2) return;

        for (let i = 0; i < selectedItemsList.length - 1; i++) {
            const itemA = selectedItemsList[i];
            const itemB = selectedItemsList[i + 1];

            // 부모(grid) 기준 중심점 계산
            const startX = itemA.offsetLeft + itemA.offsetWidth / 2;
            const startY = itemA.offsetTop + itemA.offsetHeight / 2;
            const endX = itemB.offsetLeft + itemB.offsetWidth / 2;
            const endY = itemB.offsetTop + itemB.offsetHeight / 2;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", startX);
            line.setAttribute("y1", startY);
            line.setAttribute("x2", endX);
            line.setAttribute("y2", endY);
            line.classList.add("drag-line");

            svgOverlay.appendChild(line);
        }
    }

    function addItemToList(itemEl) {
        itemEl.style.opacity = '0.7';
        itemEl.style.transform = 'scale(0.9)';
        selectedItemsList.push(itemEl);
        renderSelectionList();
        drawConnectionLines();
    }

    function handleItemDrag(itemEl) {
        const index = selectedItemsList.indexOf(itemEl);

        if (index !== -1) {
            // 직전 아이템으로 되돌아간 경우, 마지막 선택 취소 (마치 선 그리기 뒤로 가기처럼)
            if (index === selectedItemsList.length - 2) {
                const removedItem = selectedItemsList.pop();
                removedItem.style.opacity = '1';
                removedItem.style.transform = 'scale(1)';
                renderSelectionList();
                drawConnectionLines();
            }
            return;
        }

        // 최대 5개 제한
        if (selectedItemsList.length >= 5) return;

        if (selectedItemsList.length > 0) {
            const lastItem = selectedItemsList[selectedItemsList.length - 1];
            const lastRow = parseInt(lastItem.dataset.row);
            const lastCol = parseInt(lastItem.dataset.col);
            const currRow = parseInt(itemEl.dataset.row);
            const currCol = parseInt(itemEl.dataset.col);

            const rowDiff = Math.abs(currRow - lastRow);
            const colDiff = Math.abs(currCol - lastCol);

            // 대각선 포함 인접 (행 차이 1 이하, 열 차이 1 이하이고 동일 칸이 아닐 때)
            if (rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0)) {
                addItemToList(itemEl);
            }
        } else {
            // 첫 번째
            addItemToList(itemEl);
        }
    }

    function onMouseDown(e) {
        if (!gridElement) return;

        if (!window.isGameRunning || window.isPaused) return;

        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }

        isDragging = true;
        selectedItemsList = [];
        if (svgOverlay) svgOverlay.innerHTML = ''; // 시작 시 초기화

        let itemEl = getItemFromEvent(e);
        if (itemEl) {
            handleItemDrag(itemEl);
        }
    }

    function onMouseMove(e) {
        if (!isDragging) return;

        let itemEl = getItemFromEvent(e);
        if (itemEl) {
            handleItemDrag(itemEl);
        }
    }

    function onMouseUp(e) {
        if (!isDragging) return;
        isDragging = false;

        if (svgOverlay) svgOverlay.innerHTML = ''; // 놓으면 선 즉시 삭제

        console.log("드래그 완료! 최종 선택된 아이템 개수:", selectedItemsList.length);

        check();

        // check() 에서 삭제된 아이템은 parentNode가 null이 되므로 남아있는 것만 스타일 복구
        selectedItemsList.forEach(itemEl => {
            if (itemEl.parentNode) {
                itemEl.style.opacity = '1';
                itemEl.style.transform = 'scale(1)';
            }
        });

        // 리스트 초기화
        selectedItemsList = [];
        renderSelectionList();
    }

    function check() {
        // 기존 10점 룰 등 모두 제거
        // 5개가 연결되었을 때 조건 없이 즉시 삭제
        if (selectedItemsList.length === 5) {
            console.log("5개 연결 완료! 아이템 삭제");
            if (typeof gridManager !== 'undefined') {
                gridManager.addScore(100);
                gridManager.removeItems(selectedItemsList);
            }
        }
    }

    function renderSelectionList() {
        if (!selectionBoxElement) return;

        selectionBoxElement.innerHTML = '';

        let totalScore = 0;

        selectedItemsList.forEach(itemEl => {
            const row = parseInt(itemEl.dataset.row);
            const col = parseInt(itemEl.dataset.col);
            const obj = objArr[row][col];
            if (obj && typeof obj.score === 'number') {
                totalScore += obj.score;
            }

            const typeImgSrc = itemEl.querySelector('.item-type-img').src;
            const scoreImgSrc = itemEl.querySelector('.item-score-img').src;

            const thumbDiv = document.createElement('div');
            thumbDiv.classList.add('selection-thumb');

            const typeImg = document.createElement('img');
            typeImg.src = typeImgSrc;
            typeImg.classList.add('thumb-type');

            const scoreImg = document.createElement('img');
            scoreImg.src = scoreImgSrc;
            scoreImg.classList.add('thumb-score');

            thumbDiv.appendChild(typeImg);
            thumbDiv.appendChild(scoreImg);

            selectionBoxElement.appendChild(thumbDiv);
        });

        const scoreSpan = document.getElementById('selection-score-total');
        if (scoreSpan) {
            scoreSpan.innerText = `(합계: ${totalScore})`;
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    function forceCancelDrag() {
        if (!isDragging) return;
        isDragging = false;

        selectedItemsList.forEach(itemEl => {
            if (itemEl.parentNode) {
                itemEl.style.opacity = '1';
                itemEl.style.transform = 'scale(1)';
            }
        });

        selectedItemsList = [];
        renderSelectionList();
    }

    return {
        getSelectedItems: () => selectedItemsList,
        forceCancelDrag
    }
}

// 싱글톤으로 인스턴스화
const inputManager = new InputManager();
