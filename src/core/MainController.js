import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { HUDManager } from '../render/HUDManager.js';

export class MainController {
    constructor(sceneManager, mode = 'kid') {
        this.sceneMgr = sceneManager;
        this.mode = mode;
        this.clock = new THREE.Clock();
        this.isRunning = false;

        this.targetPos = new THREE.Vector3(-0.5, 0.45, 0.5);
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper();
        this.hud = new HUDManager();

        this.armData = null;
        this.mission = null;
        this.controls = null;
        this.joystick = null;
        this.clawAnimProgress = 1.0;

        // 🌟 Zero-GC 遙測數據緩存結構 (避免每幀 new Array 引發 GC 掉幀)
        this._jointAngles = new Float32Array(4);
        this._prevJointAngles = new Float32Array(4);
        this._jointTorques = new Float32Array(4);
    }

    init() {
        this.controls = new OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        
        // 焦點鎖定於工作台中心底座
        this.controls.target.set(0, 0.25, 0);
        this.controls.minDistance = 1.4;
        this.controls.maxDistance = 4.2;
        this.controls.minPolarAngle = 0.2;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;

        this.armData = ArmBuilder.build(this.sceneMgr.scene, this.mode);
        this.hud.init(this.mode);

        this.mission = new MissionManager(
            this.armData.endEffector,
            this.armData.reactorSocket,
            this.audio,
            this.sceneMgr.scene,
            this.mode,
            this.hud
        );

        this.joystick = JoystickManager.init(
            (x, y) => {
                this.inputMapper.setTranslation(x, y);
                if (this.controls) this.controls.enabled = (Math.hypot(x, y) === 0);
            },
            (x, y) => {
                this.inputMapper.setRotation(x, y);
                if (this.controls) this.controls.enabled = (Math.hypot(x, y) === 0);
            },
            () => this.mission.toggleGrip()
        );

        this.isRunning = true;
        this.animate();
    }

    setLanguage(lang) {
        if (this.mission) this.mission.setLanguage(lang);
        if (this.hud) this.hud.setLanguage(lang);
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.04);
        const intensity = this.inputMapper.getIntensity();

        this.inputMapper.update(this.targetPos, dt, this.sceneMgr.camera);
        this.mission.update(dt, this.targetPos, intensity);

        // 🌟 修正 1：標準簽名傳遞 dt，平滑解算 CCD-IK
        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos, dt);

        // 伸縮連桿動態適配
        if (this.armData.extensionRod && this.armData.joint2) {
            const currentDist = this.targetPos.length();
            const extendRatio = Math.max(0.0, Math.min(0.45, (currentDist - 1.0) * 0.4));
            this.armData.extensionRod.position.y = 0.65 + extendRatio;
            this.armData.joint2.position.y = 1.05 + extendRatio;
        }

        // 末端夾爪開合動畫
        const targetOpen = this.mission.clawOpen ? 1.0 : 0.0;
        this.clawAnimProgress += (targetOpen - this.clawAnimProgress) * (14.0 * dt);
        const offset = this.clawAnimProgress * 0.08;
        this.armData.clawLeft.position.x = -offset;
        this.armData.clawRight.position.x = offset;

        // 狀態指示燈
        if (this.armData.statusLed) {
            this.armData.statusLed.material.color.setHex(this.mission.isSecured ? 0x00ff66 : 0xff7700);
        }

        // 🌟 修正 2：真實提取 6-DoF 關節物理角速度與力矩遙測
        if (this.armData.ikBones && this.armData.ikBones.length > 0) {
            const len = Math.min(this.armData.ikBones.length, 4);
            const invDt = dt > 0.0001 ? 1.0 / dt : 60;
            
            for (let i = 0; i < len; i++) {
                const b = this.armData.ikBones[i];
                const currentAngle = (b.axis === 'Y') ? b.obj.rotation.y : b.obj.rotation.x;
                this._jointAngles[i] = currentAngle;
                
                // 動態差分角速度 -> 近似力矩負載估算
                const angularSpeed = Math.abs(currentAngle - this._prevJointAngles[i]) * invDt;
                this._jointTorques[i] = angularSpeed * (0.8 + i * 0.3);
                this._prevJointAngles[i] = currentAngle;
            }
        }

        this.audio.setMotorPitch(intensity);

        // 傳遞真實遙測數據流至 HUD
        this.hud.update(
            this.targetPos,
            this.armData,
            this.mission,
            intensity,
            this._jointAngles,
            this._jointTorques
        );

        if (this.controls) this.controls.update();
        this.sceneMgr.render();
    }

    dispose() {
        this.isRunning = false;
        if (this.inputMapper) this.inputMapper.destroy();
        if (this.joystick) {
            this.joystick.destroy();
            this.joystick = null;
        }
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
    }
}
