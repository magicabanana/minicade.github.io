// 적 객체들을 모아둘 배열
const enemies = [];

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hp = 100; // 적 체력
        this.maxHp = 100;
        this.speed = Math.random() * 0.5 + 0.5; // 속도 (0.5 ~ 1.0 랜덤)
        this.radius = 15; // CSS의 30px / 2 = 반지름 15

        // 피격 무적 시간을 위한 상태변수 (다단히트 방지용)
        this.canTakeDamage = true;
        this.damageCooldown = 200; // 0.2초마다 피격 판정

        // DOM 요소 생성
        this.element = document.createElement('div');
        this.element.className = 'enemy';
        document.body.appendChild(this.element);

        this.updatePosition();
    }

    update() {
        // 플레이어(mouseX, mouseY)를 향해 이동
        // script.js 에서 선언된 전역에 가까운 변수인 mouseX, mouseY를 그대로 참조합니다.
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }

        this.updatePosition();
        this.checkCollision();
    }

    updatePosition() {
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
    }

    checkCollision() {
        if (!this.canTakeDamage) return;

        // script.js에서 매 프레임 업데이트해주는 window.weaponsPos 배열 참조
        const weapons = window.weaponsPos;

        // 무기 배열이 없거나 비어 있으면 충돌체크 안함
        if (!weapons || weapons.length === 0) return;

        const weaponRadius = 25; // 무기의 대략적인 타격 반경

        // 각 무기(검)들에 대해 충돌 체크
        for (let i = 0; i < weapons.length; i++) {
            const wx = weapons[i].x;
            const wy = weapons[i].y;

            const dx = this.x - wx;
            const dy = this.y - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 칼(무기)과 적의 거리가 두 반지름 합보다 작으면 충돌
            if (dist < this.radius + weaponRadius) {
                this.takeDamage(25); // 1회 피격 시 데미지
                break; // 한 번 맞으면 다단히트 방지 쿨타임이 도므로, 루프 중단
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.canTakeDamage = false; // 충돌 쿨타임 시작

        // 피격 시 하얗게 깜빡이는 효과 (CSS filter 이용)
        this.element.style.filter = 'brightness(3) contrast(200%)';

        setTimeout(() => {
            if (this.element) {
                this.element.style.filter = '';
            }
        }, 100);

        setTimeout(() => {
            this.canTakeDamage = true;
        }, this.damageCooldown);

        if (this.hp <= 0) {
            this.destroy();
        }
    }

    destroy() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        // 배열에서 나(현재 인스턴스)를 찾아서 제거
        const index = enemies.indexOf(this);
        if (index > -1) {
            enemies.splice(index, 1);
        }
    }
}

// 메인 루프(script.js의 animate)에서 매번 호출될 업데이트 함수 노출
window.updateEnemies = function () {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
    }
};
