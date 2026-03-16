const playerPoint = document.getElementById('player-point');

// --- 설정 변수 (Variables) ---
const orbitCount = 1;       // 점의 갯수
const orbitSpeed = 0.01;    // 공전 속도 (초당 각도 변화량)
const orbitRadius = 150;     // 공전 지름 (반지름 기준)

// 상태 변수
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let prevMouseX = mouseX;
let prevMouseY = mouseY;
let orbitAngle = 0; // 공전 각도 (단순 누적)

// 이미지 자전을 위한 변수
let weaponRotation = 0;
const weaponRotationSpeed = 0.05; // 자전 속도 (초당 회전량)

// 부드러운 속도 시각화를 위한 변수
let smoothedSpeed = 0;
let currentDirection = 1; // 1: 시계 방향, -1: 반시계 방향

// 공전하는 점과 무기를 저장할 배열
const orbitingPoints = [];
const weapons = []; // 무기 DOM과 자전 상태 저장

// 잔상 효과를 위한 설정
const trailCount = 10; // 각 무기당 잔상의 개수
const weaponTrails = []; // 2차원 배열: 각 무기의 잔상 요소와 이력 데이터 보관

// 초기화: 공전 점, 무기, 잔상 생성
for (let i = 0; i < orbitCount; i++) {
    // 1. 공전하는 기준점 생성 (보이지 않게 처리하거나 그대로 유지 가능)
    const pt = document.createElement('div');
    pt.className = 'orbit-point';
    pt.style.display = 'none'; // 무기에 가려지므로 아예 숨김 처리
    document.body.appendChild(pt);
    orbitingPoints.push(pt);

    // 2. 무기(검) 이미지 생성
    const img = document.createElement('img');
    img.src = 'c525696ce67ba098.png';
    img.className = 'orbit-weapon';
    document.body.appendChild(img);
    // 각 무기별 상태 및 위치 정보 관리
    // state: 'orbit'(공전), 'attack'(공격), 'return'(복귀)
    weapons.push({
        element: img,
        rotation: 0,
        x: 0,
        y: 0,
        state: 'orbit',
        targetX: 0,
        targetY: 0,
        speed: 15 // 공격/복귀 시 이동 속도
    });

    // 3. 해당 무기의 잔상 시스템 초기화
    const trailsForThisWeapon = {
        elements: [],
        history: [] // {x, y, rotation}
    };

    for (let j = 0; j < trailCount; j++) {
        const trailImg = document.createElement('img');
        trailImg.src = 'c525696ce67ba098.png';
        trailImg.className = 'weapon-trail';

        const scale = 1 - (j / trailCount) * 0.5;
        const opacity = 0.5 - (j / trailCount) * 0.5;
        trailImg.style.transform = `translate(-50%, -50%) scale(${scale})`;
        trailImg.style.opacity = opacity;

        document.body.appendChild(trailImg);
        trailsForThisWeapon.elements.push({ element: trailImg, scale: scale, opacity: opacity });
    }
    weaponTrails.push(trailsForThisWeapon);
}

// 마우스 좌표 업데이트
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// 공격 기능 (좌클릭 시 가장 가까운 적을 향해 날아감)
window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // 좌클릭(버튼 0)이 아니면 무시

    // 전역 배열 enemies(enemy.js)가 존재하는지 확인
    if (typeof enemies === 'undefined' || enemies.length === 0) return;

    // 공격 대기 중(orbit 상태)인 무기들을 찾습니다.
    const availableWeapons = weapons.filter(w => w.state === 'orbit');
    if (availableWeapons.length === 0) return;

    // 플레이어에서 가장 가까운 적 찾기
    let targetEnemy = null;
    let minDistance = Infinity;

    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = enemy.x - mouseX;
        const dy = enemy.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance) {
            minDistance = dist;
            targetEnemy = enemy;
        }
    }

    if (targetEnemy) {
        // 공격 가능한 무기 하나를 선택해서 해당 적을 향해 발사 (여기선 첫 번째 대기 무기)
        const attackingWeapon = availableWeapons[0];
        attackingWeapon.state = 'attack';

        // 적의 현재 위치나 조금 더 나아간 위치를 목표로 설정
        // 적을 그대로 관통해서 지나가게 좌표를 연장 (현재 거리의 1.5배 멀리 찍음)
        const dx = targetEnemy.x - attackingWeapon.x;
        const dy = targetEnemy.y - attackingWeapon.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        attackingWeapon.targetX = attackingWeapon.x + (dx / dist) * (dist + 200);
        attackingWeapon.targetY = attackingWeapon.y + (dy / dist) * (dist + 200);
    }
});

// 애니메이션 루프
function animate() {
    // 메인 점 위치 업데이트
    playerPoint.style.left = mouseX + 'px';
    playerPoint.style.top = mouseY + 'px';

    // --- 마우스 이동 벡터 (화살표) 계산 ---
    const vx = mouseX - prevMouseX;
    const vy = mouseY - prevMouseY;
    const speed = Math.sqrt(vx * vx + vy * vy) * 2;

    // 이동 방향 각도 (라디안)
    const vAngle = Math.atan2(vy, vx);

    // 부드러운 값 갱신 (보간) - 더 자연스러운 움직임을 위해
    smoothedSpeed = smoothedSpeed * 0.9 + speed * 0.1;



    // --- 공전 각도 및 속도 업데이트 ---
    // 기본 공전 속도에 마우스 이동 속도를 더하고, 방향값을 곱합
    const currentOrbitSpeed = (orbitSpeed + (smoothedSpeed * 0.005)) * currentDirection;
    orbitAngle += currentOrbitSpeed;

    // 자전 속도 계산 (전 무기 공통)
    const currentWeaponRotationSpeed = weaponRotationSpeed + (speed * 0.015);

    // 다른 스크립트(enemy.js)에 전달할 현재 프레임의 모든 칼 좌표 배열
    window.weaponsPos = [];

    // --- 무기 및 잔상 업데이트 ---
    for (let i = 0; i < orbitCount; i++) {
        const angleOffset = (Math.PI * 2 / orbitCount) * i;
        const currentAngle = orbitAngle + angleOffset;

        // 해당 무기가 공전해야할 궤도 상의 목표 위치
        const orbitTargetX = mouseX + Math.cos(currentAngle) * orbitRadius;
        const orbitTargetY = mouseY + Math.sin(currentAngle) * orbitRadius;

        // 1. 기준점 업데이트 (숨겨져 있지만 공전 궤도를 추적)
        const pt = orbitingPoints[i];
        pt.style.left = orbitTargetX + 'px';
        pt.style.top = orbitTargetY + 'px';

        // 2. 상태에 따른 무기 이동 로직
        const weapon = weapons[i];
        weapon.rotation += currentWeaponRotationSpeed;

        if (weapon.state === 'orbit') {
            // 평소엔 공전 궤도를 그대로 따라감
            weapon.x = orbitTargetX;
            weapon.y = orbitTargetY;
        } else if (weapon.state === 'attack') {
            // 공격 중: 목표 지점을 향해 날아감
            const dx = weapon.targetX - weapon.x;
            const dy = weapon.targetY - weapon.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < weapon.speed) {
                // 목표 지점 파악하여 돌아오기 상태로 변경
                weapon.x = weapon.targetX;
                weapon.y = weapon.targetY;
                weapon.state = 'return';
            } else {
                weapon.x += (dx / dist) * weapon.speed;
                weapon.y += (dy / dist) * weapon.speed;
            }
        } else if (weapon.state === 'return') {
            // 복귀 중: 현재 자신의 공전 궤도 위치(orbitTarget)를 향해 날아옴
            const dx = orbitTargetX - weapon.x;
            const dy = orbitTargetY - weapon.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < weapon.speed * 1.5) { // 충분히 가까워지면 다시 궤도에 안착
                weapon.state = 'orbit';
                weapon.x = orbitTargetX;
                weapon.y = orbitTargetY;
            } else {
                // 복귀할 땐 조금 더 빨리 돌아오게 속도 조절 가능
                weapon.x += (dx / dist) * (weapon.speed * 1.2);
                weapon.y += (dy / dist) * (weapon.speed * 1.2);
            }
        }

        weapon.element.style.left = weapon.x + 'px';
        weapon.element.style.top = weapon.y + 'px';
        weapon.element.style.transform = `translate(-50%, -50%) rotate(${weapon.rotation}rad)`;

        // 전역 충돌 체크용 배열에 추가
        window.weaponsPos.push({ x: weapon.x, y: weapon.y });

        // 3. 해당 무기의 잔상 이력 업데이트
        const trailSystem = weaponTrails[i];
        trailSystem.history.unshift({ x: weapon.x, y: weapon.y, rotation: weapon.rotation });

        if (trailSystem.history.length > trailCount * 2) {
            trailSystem.history.pop();
        }

        // 4. 해당 무기의 잔상 DOM 렌더링
        for (let j = 0; j < trailCount; j++) {
            const historyIndex = j * 2;
            const trailData = trailSystem.history[historyIndex];
            const trailObj = trailSystem.elements[j];

            if (trailData) {
                trailObj.element.style.left = trailData.x + 'px';
                trailObj.element.style.top = trailData.y + 'px';
                trailObj.element.style.transform = `translate(-50%, -50%) rotate(${trailData.rotation}rad) scale(${trailObj.scale})`;
                trailObj.element.style.display = 'block';
            } else {
                trailObj.element.style.display = 'none';
            }
        }
    }

    // --- 적 업데이트 (enemy.js 연동) ---
    if (typeof window.updateEnemies === 'function') {
        window.updateEnemies();
    }

    // 다음 프레임을 위해 현재 위치를 이전 위치로 저장
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    // 다음 프레임 요청
    requestAnimationFrame(animate);
}

// 애니메이션 시작
animate();
