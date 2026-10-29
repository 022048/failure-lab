// --- 1. Three.js 기본 설정 ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.03);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.1;

// 조명
const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);
const spotLight = new THREE.SpotLight(0xffffff, 1.2);
spotLight.position.set(5, 15, 5);
scene.add(spotLight);

// --- 2. 3D 오브젝트 (산업용 고압 반응기) ---
const reactorGroup = new THREE.Group();

// 반응기 본체
const bodyGeo = new THREE.CylinderGeometry(1.5, 1.5, 5, 32);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.8, roughness: 0.2 });
const reactorBody = new THREE.Mesh(bodyGeo, bodyMat);
reactorBody.position.y = 2.5;
reactorGroup.add(reactorBody);

// 배관 (Pipes)
const pipeGeo = new THREE.CylinderGeometry(0.2, 0.2, 3, 16);
const pipeMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
const pipeIn = new THREE.Mesh(pipeGeo, pipeMat);
pipeIn.position.set(-1.5, 4, 0);
pipeIn.rotation.z = Math.PI / 2;
reactorGroup.add(pipeIn);

const pipeOut = new THREE.Mesh(pipeGeo, pipeMat);
pipeOut.position.set(1.5, 1, 0);
pipeOut.rotation.z = Math.PI / 2;
reactorGroup.add(pipeOut);

scene.add(reactorGroup);

// --- 3. 화학공학 시뮬레이션 로직 ---
const sliderTemp = document.getElementById('slider-temp');
const sliderPres = document.getElementById('slider-pres');
const valTemp = document.getElementById('val-temp');
const valPres = document.getElementById('val-pres');
const yieldDisplay = document.getElementById('yield-display');
const rateDisplay = document.getElementById('rate-display');
const riskDisplay = document.getElementById('risk-display');
const systemLog = document.getElementById('system-log');

let currentYield = 0;
let isSuccess = false;

function logMessage(msg, type="normal") {
    const li = document.createElement('li');
    li.textContent = msg;
    if(type !== "normal") li.className = type;
    systemLog.appendChild(li);
    systemLog.scrollTop = systemLog.scrollHeight;
}

function calculateProcess() {
    const T = parseInt(sliderTemp.value);
    const P = parseInt(sliderPres.value);
    
    valTemp.textContent = T;
    valPres.textContent = P;

    // 르 샤틀리에의 원리 & 반응 속도론 적용
    // 1. 촉매 활성화 (온도가 350도 이하이면 반응이 거의 안 일어남)
    let reactionRate = T < 350 ? 0 : Math.min(100, (T - 300) * 0.3);
    
    // 2. 열역학적 평형 수율 (발열 반응이므로 온도가 낮을수록, 압력이 높을수록 유리함)
    let thermoYield = Math.max(0, (P / 100) * 12 - (T - 400) * 0.05);
    
    // 3. 실제 수율 = 평형 수율 * 반응 속도 (단순화된 모델)
    currentYield = (reactionRate / 100) * thermoYield;
    
    if (currentYield < 0) currentYield = 0;

    // UI 업데이트
    yieldDisplay.textContent = currentYield.toFixed(1) + " %";
    rateDisplay.textContent = T < 350 ? "너무 낮음 (촉매 비활성)" : (T > 600 ? "매우 빠름 (역반응 우세)" : "적정 수준");
    
    // 설비 부하(위험도) 판별
    let load = P + (T * 0.5);
    if (load > 650) {
        riskDisplay.textContent = "위험 (CRITICAL)";
        riskDisplay.className = "warning-text";
    } else if (load > 500) {
        riskDisplay.textContent = "경고 (WARNING)";
        riskDisplay.className = "highlight";
    } else {
        riskDisplay.textContent = "안전 (SAFE)";
        riskDisplay.className = "";
        riskDisplay.style.color = "#00ffcc";
    }

    // 3D 비주얼 업데이트 (온도에 따라 붉게 달아오름)
    let heatRatio = (T - 200) / 600;
    bodyMat.color.setRGB(0.2 + heatRatio, 0.2, 0.2 + (1-heatRatio)*0.2);
    
    // 성공 판정
    if (currentYield >= 15.0 && !isSuccess && load <= 650) {
        isSuccess = true;
        logMessage("[성공] 목표 수율 15% 달성! 프리츠 하버가 기뻐합니다.", "success");
        logMessage("[결과] 온도와 압력의 완벽한 타협점을 찾았습니다.", "success");
    }
}

// 이벤트 리스너
sliderTemp.addEventListener('input', calculateProcess);
sliderPres.addEventListener('input', calculateProcess);

// --- 4. 애니메이션 루프 (압력에 따른 진동 효과) ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    const P = parseInt(sliderPres.value);
    // 압력이 250 이상이면 반응기가 진동함 (흔들림)
    if (P > 250) {
        let shake = (P - 250) * 0.0002;
        reactorGroup.position.x = (Math.random() - 0.5) * shake;
        reactorGroup.position.z = (Math.random() - 0.5) * shake;
    } else {
        reactorGroup.position.x = 0;
        reactorGroup.position.z = 0;
    }

    renderer.render(scene, camera);
}
animate();
calculateProcess(); // 초기 계산

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
