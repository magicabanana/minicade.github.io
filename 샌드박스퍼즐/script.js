const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Events } = Matter;

// 엔진 생성
const engine = Engine.create({ positionIterations: 30, velocityIterations: 30 });
const render = Render.create({
    element: document.getElementById('game'),
    engine: engine,
    options: {
        width: window.innerWidth, height: window.innerHeight,
        wireframes: false, background: 'transparent'
    }
});
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// 마우스 제어
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.1, render: { visible: false } }
});
Composite.add(engine.world, mouseConstraint);

let draggedBody = null;
Events.on(mouseConstraint, 'startdrag', (event) => { draggedBody = event.body; });
Events.on(mouseConstraint, 'enddrag', () => { draggedBody = null; });

Events.on(engine, 'beforeUpdate', () => {
    if (draggedBody && !draggedBody.isStatic) {
        const gravity = engine.gravity;
        Matter.Body.applyForce(draggedBody, draggedBody.position, {
            x: -gravity.x * gravity.scale * draggedBody.mass,
            y: -gravity.y * gravity.scale * draggedBody.mass
        });
    }

    const bodies = Composite.allBodies(engine.world);
    const maxSpeed = 15;
    bodies.forEach(body => {
        if (!body.isStatic && body.speed > maxSpeed) {
            const ratio = maxSpeed / body.speed;
            Matter.Body.setVelocity(body, { x: body.velocity.x * ratio, y: body.velocity.y * ratio });
        }
    });
});

const wallThickness = 500;
const visualThickness = 4;
const physicsOptions = { isStatic: true, render: { visible: false } };
const visualOptions = { isStatic: true, isSensor: true, render: { fillStyle: 'black' } };

const groundPhys = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 100 + wallThickness / 2, window.innerWidth, wallThickness, physicsOptions);
const leftWallPhys = Bodies.rectangle(-wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight, physicsOptions);
const rightWallPhys = Bodies.rectangle(window.innerWidth + wallThickness / 2, window.innerHeight / 2, wallThickness, window.innerHeight, physicsOptions);

const groundVis = Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 100, window.innerWidth, visualThickness, visualOptions);
const leftWallVis = Bodies.rectangle(visualThickness / 2, window.innerHeight / 2, visualThickness, window.innerHeight, visualOptions);
const rightWallVis = Bodies.rectangle(window.innerWidth - visualThickness / 2, window.innerHeight / 2, visualThickness, window.innerHeight, visualOptions);

const CATEGORY_DEFAULT = 0x0001;
const CATEGORY_ALTAR = 0x0002;
const CATEGORY_GOLD = 0x0004;
const CATEGORY_VENDING = 0x0008; // 자판기 카테고리 추가

// 제단 (오른쪽 큼직한 네모)
const altarWidth = 200;
const altarHeight = 150;
const altar = Bodies.rectangle(
    window.innerWidth - altarWidth / 2 - 20,
    window.innerHeight - 100 - altarHeight / 2,
    altarWidth, altarHeight,
    {
        isStatic: true,
        render: { fillStyle: '#ffebcd', strokeStyle: '#d2691e', lineWidth: 5 },
        label: 'Altar',
        collisionFilter: {
            category: CATEGORY_ALTAR,
            mask: CATEGORY_DEFAULT
        }
    }
);

// 자판기 (왼쪽 네모)
const vendingWidth = 150;
const vendingHeight = 200;
const vendingPostion = { x: 20 + vendingWidth / 2, y: window.innerHeight - 100 - vendingHeight / 2 };
const vendingMachine = Bodies.rectangle(
    vendingPostion.x, vendingPostion.y,
    vendingWidth, vendingHeight,
    {
        isStatic: true,
        render: { fillStyle: '#4682b4', strokeStyle: '#4169e1', lineWidth: 5 },
        label: 'Vending',
        collisionFilter: {
            category: CATEGORY_VENDING,
            mask: CATEGORY_DEFAULT | CATEGORY_GOLD // 황금색 원과도 충돌 허용 (넣을 수 있도록)
        }
    }
);

Composite.add(engine.world, [groundPhys, leftWallPhys, rightWallPhys, groundVis, leftWallVis, rightWallVis, altar, vendingMachine]);

const vendingBtn = document.getElementById("vendingBtn");
let goldCount = 0;

function updateVendingBtn() {
    vendingBtn.innerText = `자판기 (골드: ${goldCount})`;
    if (goldCount > 0) {
        vendingBtn.removeAttribute('disabled');
    } else {
        vendingBtn.setAttribute('disabled', 'true');
    }
}

// 오브젝트 생성 함수
function createPuzzleBody(x, y, definition) {
    const box = Bodies.rectangle(x, y, definition.size, definition.size, {
        render: { fillStyle: definition.color },
        label: definition.name,
        friction: 0.05,
        restitution: 0.3,
        frictionAir: 0.02
    });

    box.plugin = {
        name: definition.name,
        id: definition.id
    };

    return box;
}

// 황금 원 생성 함수
function createGoldenCircle(x, y) {
    return Bodies.circle(x, y, 15, {
        render: { fillStyle: '#ffd700', strokeStyle: '#b8860b', lineWidth: 2 },
        restitution: 0.8,
        friction: 0.05,
        label: 'Gold',
        collisionFilter: {
            category: CATEGORY_GOLD,
            // 자판기(CATEGORY_VENDING)와 충돌 가능
            mask: CATEGORY_DEFAULT | CATEGORY_GOLD | CATEGORY_VENDING
        }
    });
}

// 게임 시작 시 황금 원 20개 중앙 근처에서 하늘에서 떨어지게 생성
for (let i = 0; i < 20; i++) {
    const px = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
    const py = 50 + Math.random() * 100;
    Composite.add(engine.world, createGoldenCircle(px, py));
}

// 자판기 버튼 클릭 (골드 지불 후 자원 스폰)
vendingBtn.addEventListener("click", () => {
    if (goldCount > 0) {
        goldCount--;
        updateVendingBtn();

        const randomId = BASIC_DROPS[Math.floor(Math.random() * BASIC_DROPS.length)];
        const randomDef = ITEMS[randomId];

        // 자판기 상단에서 튀어나오게
        const spawnX = vendingMachine.position.x;
        const spawnY = vendingMachine.position.y - vendingHeight / 2 - 50;

        const box = createPuzzleBody(spawnX, spawnY, randomDef);
        Matter.Body.setVelocity(box, {
            x: 2 + Math.random() * 3, // 우측 방향으로 약간 튀어나옴
            y: -5
        });
        Composite.add(engine.world, box);
    }
});

// 충돌 이벤트 (크래프팅, 자판기, 제단)
Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;

    pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // 1. 자판기에 황금 원 넣었을 때 처리
        const isVendingAndGold = (bodyA.label === 'Vending' && bodyB.label === 'Gold') || (bodyB.label === 'Vending' && bodyA.label === 'Gold');
        if (isVendingAndGold) {
            const goldBody = bodyA.label === 'Gold' ? bodyA : bodyB;
            if (!goldBody.isMarkedForRemoval) {
                goldBody.isMarkedForRemoval = true;
                goldCount++;
                updateVendingBtn();
                setTimeout(() => {
                    Composite.remove(engine.world, goldBody);
                }, 0);
            }
        }

        // 2. 크래프팅 아이템을 제단에 바쳤을 때 (가치가 있는 보상으로 골드를 뱉음)
        const itemOnAltar = (bodyA.label === 'Altar' && bodyB.plugin) ? bodyB : (bodyB.label === 'Altar' && bodyA.plugin ? bodyA : null);
        if (itemOnAltar && !itemOnAltar.isMarkedForRemoval && itemOnAltar.label !== 'Gold') {
            itemOnAltar.isMarkedForRemoval = true;
            // 아이템 하나당 최소 1~2개의 골드를 환급 (임의 설정)
            const rewardCount = Math.floor(Math.random() * 2) + 1;

            // 제단의 왼쪽 위치 계산
            const spawnX = altar.position.x - altarWidth / 2 - 30;
            const spawnY = altar.position.y - altarHeight / 2;

            setTimeout(() => {
                Composite.remove(engine.world, itemOnAltar);
                for (let i = 0; i < rewardCount; i++) {
                    const gold = createGoldenCircle(spawnX + (Math.random() - 0.5) * 20, spawnY - 40);
                    // 약간 왼쪽 위로 튀어오르게 힘을 줌
                    Matter.Body.setVelocity(gold, {
                        x: -2 - Math.random() * 5,
                        y: -5 - Math.random() * 5
                    });
                    Composite.add(engine.world, gold);
                }
            }, 0);
        }

        // 3. 크래프팅 시스템 (조합식 일치 확인)
        if (!bodyA.isStatic && !bodyB.isStatic && bodyA.plugin && bodyB.plugin) {
            if (bodyA.isMarkedForRemoval || bodyB.isMarkedForRemoval) return;

            const idA = bodyA.plugin.id;
            const idB = bodyB.plugin.id;

            // 조합식 찾기
            const resultDef = getRecipeOutput(idA, idB);

            if (resultDef) {
                bodyA.isMarkedForRemoval = true;
                bodyB.isMarkedForRemoval = true;

                // 합성 지점 계산
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;

                setTimeout(() => {
                    Composite.remove(engine.world, [bodyA, bodyB]);
                    const newBox = createPuzzleBody(midX, midY, resultDef);
                    Composite.add(engine.world, newBox);
                }, 0);
            }
        }
    });
});

// 창 크기 조절 대응
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    render.canvas.width = width;
    render.canvas.height = height;

    // 물리 벽 위치/크기 업데이트
    Matter.Body.setPosition(groundPhys, { x: width / 2, y: height - 100 + wallThickness / 2 });
    Matter.Body.setPosition(leftWallPhys, { x: -wallThickness / 2, y: height / 2 });
    Matter.Body.setPosition(rightWallPhys, { x: width + wallThickness / 2, y: height / 2 });

    Matter.Body.setVertices(groundPhys, Bodies.rectangle(width / 2, height - 100 + wallThickness / 2, width, wallThickness).vertices);
    Matter.Body.setVertices(leftWallPhys, Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height).vertices);
    Matter.Body.setVertices(rightWallPhys, Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height).vertices);

    // 시각 선 위치/크기 업데이트
    Matter.Body.setPosition(groundVis, { x: width / 2, y: height - 100 });
    Matter.Body.setPosition(leftWallVis, { x: visualThickness / 2, y: height / 2 });
    Matter.Body.setPosition(rightWallVis, { x: width - visualThickness / 2, y: height / 2 });

    Matter.Body.setVertices(groundVis, Bodies.rectangle(width / 2, height - 100, width, visualThickness).vertices);
    Matter.Body.setVertices(leftWallVis, Bodies.rectangle(visualThickness / 2, height / 2, visualThickness, height).vertices);
    Matter.Body.setVertices(rightWallVis, Bodies.rectangle(width - visualThickness / 2, height / 2, visualThickness, height).vertices);

    // 제단 및 자판기 위치 업데이트
    Matter.Body.setPosition(altar, { x: width - altarWidth / 2 - 20, y: height - 100 - altarHeight / 2 });
    Matter.Body.setPosition(vendingMachine, { x: 20 + vendingWidth / 2, y: height - 100 - vendingHeight / 2 });
});
