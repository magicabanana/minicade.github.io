// 적을 지속적으로 스폰하는 역할

// 초기 설정
const spawnIntervalMs = 2000; // 2초마다 1마리 스폰 (밀리초)

function startSpawning() {
    setInterval(() => {
        // 화면 가장자리에서 랜덤하게 스폰되도록 좌표 계산
        let spawnX, spawnY;

        // 0: 상단, 1: 우측, 2: 하단, 3: 좌측
        const side = Math.floor(Math.random() * 4);

        const offset = 50; // 화면 밖으로 조금 더 벗어난 위치

        if (side === 0) {
            // 상단
            spawnX = Math.random() * window.innerWidth;
            spawnY = -offset;
        } else if (side === 1) {
            // 우측
            spawnX = window.innerWidth + offset;
            spawnY = Math.random() * window.innerHeight;
        } else if (side === 2) {
            // 하단
            spawnX = Math.random() * window.innerWidth;
            spawnY = window.innerHeight + offset;
        } else {
            // 좌측
            spawnX = -offset;
            spawnY = Math.random() * window.innerHeight;
        }

        // enemy.js에 정의된 Enemy 인스턴스 생성 (자동으로 전역 enemies 배열에 추가됨)
        const newEnemy = new Enemy(spawnX, spawnY);
        enemies.push(newEnemy);

    }, spawnIntervalMs);
}

// 스포너 시작
startSpawning();
