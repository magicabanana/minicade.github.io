// ==========================================
// 1. Three.js 설정 (렌더러, 씬, 카메라, 조명)
// ==========================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2E8B57); // 카지노 테이블 녹색

// 카메라 (스택랜드와 유사하게 위에서 살짝 비스듬히 내려다보는 뷰)
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000); // 좁은 시야각으로 왜곡 최소화
camera.position.set(0, 60, 60); // 수정: -50이 아니라 +60으로 올려서 바닥의 앞면을 위에서 내려다보도록 함
camera.lookAt(0, 0, 0); // 0,0,0 (바닥 중앙)을 정확히 바라보도록 설정

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 부드러운 그림자
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 15, 10); // 수정: 조명도 위쪽으로 이동
directionalLight.castShadow = true;
// 그림자 품질 향상
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
scene.add(directionalLight);

// ==========================================
// 2. Cannon.js 설정 (물리 엔진 월드)
// ==========================================
const world = new CANNON.World();
// ** 핵심: Three.js 카메라와 동일하게 Y축을 상하로 통일합니다 **
world.gravity.set(0, -80, 0); // 아래쪽(Y축)으로 강한 중력
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10; // 높을수록 계산 정확도 상승

// 물리 재질 (Material) 설정
const groundMaterial = new CANNON.Material("groundMaterial");
const chipMaterial = new CANNON.Material("chipMaterial");

// 칩과 바닥 간의 마찰력/반발력 설정
const chipGroundContact = new CANNON.ContactMaterial(groundMaterial, chipMaterial, {
    friction: 0.1,      // 조금 미끄러움
    restitution: 0.1     // 덜 튕김 (카지노 패드 위)
});
world.addContactMaterial(chipGroundContact);

// 칩과 칩 간의 마찰력/반발력 설정
const chipChipContact = new CANNON.ContactMaterial(chipMaterial, chipMaterial, {
    friction: 0.3,      // 칩끼리는 덜 미끄러짐 (쌓을 수 있게)
    restitution: 0.2     // 부딪힐 때 약간 튕김
});
world.addContactMaterial(chipChipContact);

// ==========================================
// 3. 바닥 설정 (Three.js & Cannon.js)
// ==========================================
// Physics (Invisible Plane)
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial }); // mass 0 = 고정된 물체
groundBody.addShape(groundShape);
// Cannon.js Plane은 기본 방향이 Z축을 바라봅니다. Y축 위쪽을 바라보도록 변경합니다.
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

// Visual (시각적인 게임 보드 바닥)
// 화면 밖까지 충분히 뻗어나가도록 넓게 만듭니다.
const groundGeo = new THREE.PlaneGeometry(2000, 2000);

// -> 스택랜드 느낌을 낼 수 있도록 옅은 나무 책상(갈색)이나 보드 모양으로 변경
const groundMat = new THREE.MeshStandardMaterial({
    color: 0xD2B48C, // 옅은 갈색(Tan/Wood)
    roughness: 0.8,
    metalness: 0.1,
    side: THREE.FrontSide // 앞면만 렌더링
});
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
// Three.js Plane도 기본 방향이 Z축이므로 바닥처럼 Y축 위를 보게 눕힙니다.
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// ==========================================
// 4. 칩 객체 생성 로직 배열 및 세팅
// ==========================================
const chips = []; // 물리 Body와 Visual Mesh를 쌍으로 저장하는 배열
const chipRadius = 2;
const chipHeight = 0.3;

// Three.js Cylinder는 기본적으로 Y축으로 서 있습니다.
const chipGeometry = new THREE.CylinderGeometry(chipRadius, chipRadius, chipHeight, 32);

const textureLoader = new THREE.TextureLoader();
const chipTexture = textureLoader.load('casino_chip_transparent.png');

const sideMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.7 });
const topBottomMaterial = new THREE.MeshStandardMaterial({
    map: chipTexture,
    roughness: 0.3,
    metalness: 0.1
});
const chipMaterials = [sideMaterial, topBottomMaterial, topBottomMaterial];

function createChip(x, y, z) {
    // 1) Three.js Mesh 생성
    const mesh = new THREE.Mesh(chipGeometry, chipMaterials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 2) Cannon.js Body 생성
    // Cannon.js Cylinder는 기본적으로 Z축 방향입니다.
    // 이를 Y축(Three.js와 동일)으로 맞추기 위해 축을 돌려서 Body에 추가합니다.
    const shape = new CANNON.Cylinder(chipRadius, chipRadius, chipHeight, 16);
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2); // Z축 기둥을 Y축 기둥으로

    const body = new CANNON.Body({
        mass: 1, // 무게 부여 (드래그 시 물리 연산됨)
        material: chipMaterial,
        position: new CANNON.Vec3(x, y, z),
        fixedRotation: true // 스택랜드처럼 수평을 유지하고 뒤집히지 않게 고정
    });

    // 회전된 형태를 바디에 등록
    body.addShape(shape, new CANNON.Vec3(0, 0, 0), q);

    world.addBody(body);

    chips.push({ mesh, body });
}

// 칩 5개 공중(Y축 상승)에서 떨어뜨려보기
for (let i = 0; i < 5; i++) {
    createChip(0, 5 + i * 1.5, 0); // Y축 좌표를 증가시켜서 위에서 떨어지게 함
}


// ==========================================
// 5. 물리력 기반 드래그 앤 드롭 구현
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let draggedBody = null;
let mouseConstraint = null; // 물체를 잡아당기는 가상의 고무줄(제약)

// 마우스가 움직이는 (보이지 않는) 3D 평면
const pointerPlaneGeo = new THREE.PlaneGeometry(500, 500); // 넉넉하게 큼
const pointerPlane = new THREE.Mesh(
    pointerPlaneGeo,
    new THREE.MeshBasicMaterial({ visible: false })
);
// 마우스 감지 평면이 카메라는 항상 직교해서 바라보게 설정하여 좌표 계산 오류 방지
pointerPlane.lookAt(camera.position);

// 드래그 중인 칩의 높이(Y축)를 기준으로 마우스 커서 위치를 계산하기 위해 띄워놓음
scene.add(pointerPlane);

// 마우스(터치) 입력을 따라다니는 투명하고 질량 없는 물리 점 (마우스 컨트롤러)
// 마우스 앵커는 움직여야 하므로 KINEMATIC으로 설정합니다.
const jointBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
jointBody.addShape(new CANNON.Sphere(0.1));
jointBody.collisionFilterGroup = 0;
jointBody.collisionFilterMask = 0;
world.addBody(jointBody);

container.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointercancel', onPointerUp);

function onPointerDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(chips.map(c => c.mesh));

    if (intersects.length > 0) {
        container.style.cursor = 'grabbing';

        const hitMesh = intersects[0].object;
        const chipData = chips.find(c => c.mesh === hitMesh);
        if (!chipData) return;

        draggedBody = chipData.body;
        draggedBody.wakeUp(); // 물리 엔진 슬립(Sleep) 상태 강제 해제

        // 마우스 감지용 평면을 드래그 시작 지점의 칩 위치로 이동
        pointerPlane.position.copy(draggedBody.position);
        pointerPlane.position.y += 1.5; // Y축(위)으로 살짝 띄움
        pointerPlane.lookAt(camera.position);

        jointBody.position.copy(intersects[0].point);

        const localPivot = draggedBody.pointToLocal(
            new CANNON.Vec3(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)
        );

        mouseConstraint = new CANNON.PointToPointConstraint(
            draggedBody, localPivot,
            jointBody, new CANNON.Vec3(0, 0, 0)
        );
        world.addConstraint(mouseConstraint);

        draggedBody.angularDamping = 0.9;
        draggedBody.linearDamping = 0.9;
    }
}

function onPointerMove(event) {
    if (!draggedBody) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(pointerPlane);
    if (intersects.length > 0) {
        jointBody.position.copy(intersects[0].point);
        draggedBody.wakeUp(); // 마우스를 이동할 때도 혹시 모를 슬립을 방지
    }
}

function onPointerUp(event) {
    if (!draggedBody) return;
    container.style.cursor = 'grab';

    world.removeConstraint(mouseConstraint);
    mouseConstraint = null;

    draggedBody.angularDamping = 0.01;
    draggedBody.linearDamping = 0.01;
    draggedBody = null;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// 6. 메인 렌더링 & 연산 루프
// ==========================================
const timeStep = 1 / 60;

function animate() {
    requestAnimationFrame(animate);

    world.step(timeStep);

    // 위치와 회전 동기화
    for (const chip of chips) {
        chip.mesh.position.copy(chip.body.position);
        chip.mesh.quaternion.copy(chip.body.quaternion);
    }

    renderer.render(scene, camera);
}

// 루프 시작
animate();
