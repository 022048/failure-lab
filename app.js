// --- 1. Three.js 기본 설정 ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.02);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // 바닥 아래로 못 가게 설정

// 조명 설정 (실험실 같은 차가운 조명)
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);
const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(5, 10, 5);
spotLight.castShadow = true;
scene.add(spotLight);

// --- 2. 3D 오브젝트 생성 (코드로 만드는 산업 설비) ---
// 바닥
const floorGeo = new THREE.PlaneGeometry(20, 20);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// 정밀 저울 (Scale)
const scaleBaseGeo = new THREE.BoxGeometry(3, 0.2, 3);
const scaleMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 });
const scaleBase = new THREE.Mesh(scaleBaseGeo, scaleMat);
scaleBase.position.y = 0.1;
scaleBase.castShadow = true;
scaleBase.receiveShadow = true;
scene.add(scaleBase);

// 밀폐 용기 (Reaction Flask)
const flaskGroup = new THREE.Group();
flaskGroup.position.y = 0.2;

const flaskGeo = new THREE.CylinderGeometry(0.8, 1, 1.5, 32);
const glassMat = new THREE.MeshPhysicalMaterial({ 
    color: 0xffffff, transmission: 0.9, opacity: 1, transparent: true, roughness: 0.1, ior: 1.5 
});
const flask = new THREE.Mesh(flaskGeo, glassMat);
flask.position.y = 0.75;
flask.castShadow = true;
flaskGroup.add(flask);

// 뚜껑 (Seal Cap)
const capGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.2, 32);
const capMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8 });
const cap = new THREE.Mesh(capGeo, capMat);
cap.position.y = 1.6;
flaskGroup.add(cap);

// 내부 시료 (Tin - 주석)
const sampleGeo = new THREE.SphereGeometry(0.4, 16, 16);
const sampleMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1.0, roughness: 0.4 });
const sample = new THREE.Mesh(sampleGeo, sampleMat);
sample.position.y = 0.4;
flaskGroup.add(sample);

scene.add(flaskGroup);

// --- 3. 게임 상태 및 로직 ---
let isSealed = false;
let isHeated = false;
let currentMass = 250.00; 

// UI 요소
const massDisplay = document.getElementById('mass-display');
const sealDisplay = document.getElementById('seal-display');
const btnSeal = document.getElementById('btn-seal');
const btnHeat = document.getElementById('btn-heat');
const btnReset = document.getElementById('btn-reset');
const systemLog = document.getElementById('system-log');

function logMessage(msg, type="normal") {
    const li = document.createElement('li');
    li.textContent = msg;
    if(type !== "normal") li.className = type;
    systemLog.appendChild(li);
    systemLog.scrollTop = systemLog.scrollHeight;
}

// 뚜껑 열고 닫기 애니메이션 대용 (위치 이동)
btnSeal.addEventListener('click', () => {
    if(isHeated) return;
    isSealed = !isSealed;
    cap.position.y = isSealed ? 1.6 : 2.0; 
    sealDisplay.textContent = isSealed ? "밀폐됨 (Sealed)" : "개방됨 (Opened)";
    sealDisplay.style.color = isSealed ? "#00ffcc" : "#e0e0e0";
    logMessage(isSealed ? "[조작] 용기를 밀폐했습니다." : "[조작] 용기를 개방했습니다.");
});

// 실험 (가열) 실행
btnHeat.addEventListener('click', () => {
    if(isHeated) return;
    isHeated = true;
    btnSeal.disabled = true;
    btnHeat.disabled = true;
    logMessage("[프로세스] 가열 시작... 반응 진행 중", "warning");

    // 시료 색상 변화 (주석 -> 산화주석)
    sampleMat.color.setHex(0x333333); 
    sampleMat.metalness = 0.1;

    setTimeout(() => {
        if(isSealed) {
            // 밀폐 시: 질량 보존
            logMessage("[결과] 질량 변화 없음. 플로지스톤은 빠져나가지 않았음.", "success");
            logMessage("[분석] 닫힌 계(Closed System)에서 질량 수지 성립.", "success");
        } else {
            // 개방 시: 산소 결합으로 인한 질량 증가 (오류 유도)
            currentMass += 3.20;
            massDisplay.textContent = currentMass.toFixed(2) + " g";
            logMessage("[결과] 질량 증가 감지! (산화 반응)", "warning");
            logMessage("[분석] 외부 기체가 유입되어 질량 수지 오차 발생.", "warning");
        }
    }, 2000);
});

// 초기화
btnReset.addEventListener('click', () => {
    isHeated = false;
    isSealed = false;
    currentMass = 250.00;
    cap.position.y = 2.0;
    sealDisplay.textContent = "개방됨 (Opened)";
    sealDisplay.style.color = "#e0e0e0";
    massDisplay.textContent = "250.00 g";
    sampleMat.color.setHex(0xaaaaaa);
    sampleMat.metalness = 1.0;
    btnSeal.disabled = false;
    btnHeat.disabled = false;
    systemLog.innerHTML = '<li>[시스템] 장비 초기화 완료.</li>';
});

// --- 4. 애니메이션 루프 및 반응형 처리 ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // 가열 중일 때 시료가 살짝 떨리는 효과 (시각적 피드백)
    if(isHeated && sample.position.y < 0.45) {
        sample.position.y = 0.4 + Math.random() * 0.02;
    } else if (!isHeated) {
        sample.position.y = 0.4;
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
