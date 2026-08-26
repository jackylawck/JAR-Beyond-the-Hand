import { POOL } from './core/Pool.js';
import { AudioEngine } from './core/AudioEngine.js';
import { ArmBuilder } from './kinematics/ArmBuilder.js';
import { CCDIKSolver } from './kinematics/CCDIKSolver.js';
import { JoystickManager } from './controls/JoystickManager.js';
import { MissionManager } from './gameplay/MissionManager.js';

const audio = new AudioEngine();
const inputState = { lx: 0, ly: 0, rx: 0, ry: 0 };
const targetPos = new THREE.Vector3(0, 1.8, 1.6);
const clock = new THREE.Clock();

let scene, camera, renderer;
let armData, mission;

function init() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040810, 0.04);

    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 3.5, 4.8);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // 構建機體與任務
    armData = ArmBuilder.build(scene);
    mission = new MissionManager(armData.endEffector, armData.reactorCore, armData.reactorSocket, audio);

    // 綁定搖桿
    JoystickManager.init(inputState, () => mission.toggleGrip());

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    // 1. 操控映射 (相機相對移動)
    camera.getWorldDirection(POOL.forward);
    POOL.forward.y = 0;
    POOL.forward.normalize();
    POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

    const moveSpeed = 1.9 * dt;
    POOL.v1.copy(POOL.forward).multiplyScalar(-inputState.ly * moveSpeed);
    POOL.v2.copy(POOL.right).multiplyScalar(inputState.lx * moveSpeed);
    targetPos.add(POOL.v1).add(POOL.v2);
    targetPos.y -= inputState.ry * moveSpeed;

    // 工作空間保護
    if (targetPos.y < 0.32) targetPos.y = 0.32;
    if (targetPos.y > 2.6) targetPos.y = 2.6;
    const radius = Math.hypot(targetPos.x, targetPos.z);
    if (radius > 2.1) {
        targetPos.x = (targetPos.x / radius) * 2.1;
        targetPos.z = (targetPos.z / radius) * 2.1;
    }

    // 2. 任務更新與磁吸
    mission.update(dt, targetPos);

    // 3. IK 解算
    CCDIKSolver.solve(armData.ikBones, armData.endEffector, targetPos);

    // 4. 夾爪開合
    const targetOffset = mission.clawOpen ? 0.08 : 0.01;
    armData.clawLeft.position.x += (-0.06 - targetOffset - armData.clawLeft.position.x) * 0.25;
    armData.clawRight.position.x += (0.06 + targetOffset - armData.clawRight.position.x) * 0.25;

    // 5. 相機平滑跟隨
    armData.endEffector.getWorldPosition(POOL.v1);
    POOL.camTargetPos.set(POOL.v1.x * 0.35, 2.6 + POOL.v1.y * 0.25, 4.2 + POOL.v1.z * 0.2);
    camera.position.lerp(POOL.camTargetPos, 3.5 * dt);
    POOL.camLook.set(POOL.v1.x * 0.2, 0.8 + POOL.v1.y * 0.2, 0.5);
    camera.lookAt(POOL.camLook);

    // 6. 馬達音效變頻
    audio.setMotorPitch(Math.hypot(inputState.lx, inputState.ly, inputState.rx, inputState.ry));

    // 7. 渲染
    renderer.render(scene, camera);
}

window.onload = () => {
    init();
    animate();
};
