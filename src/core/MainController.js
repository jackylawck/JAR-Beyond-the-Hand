import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AudioEngine } from './AudioEngine.js';
import { DataLogger } from './DataLogger.js';
import { FXManager } from '../render/FXManager.js';
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

        this.targetPos = new THREE.Vector3(-0.48, 0.45, 0.48);
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper(mode);
        this.hud = new HUDManager();
        this.fx = new FXManager(this.sceneMgr.scene, this.sceneMgr.camera);
        
        // 🌟 科研級數據記錄器 (科研模式自動開啟 60Hz 採樣)
        this.logger = new DataLogger(mode === 'research', 60);

        this.armData = null;
        this.mission = null;
        this.controls = null;
        this.joystick = null;
        this.clawAnimProgress = 1.0;

        this._jointAngles = new Float32Array(4);
        this._prevJointAngles = new Float32Array(4);
        this._jointTorques = new Float32Array(4);
    }

    init() {
        this.controls = new OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
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
            this.hud,
            this.fx
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

        // 綁定科研模式 CSV 導出按鈕
        const expBtn = document.getElementById('res-export-btn');
        if (expBtn) {
            expBtn.onclick = () => this.logger.exportCSV();
        }

        // 科研面板可見性
        const resPanel = document.getElementById('research-data-panel');
        if (resPanel) {
            resPanel.style.display = (this.mode === 'research') ? 'block' : 'none';
        }

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

        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos, dt);

        if (this.armData.extensionRod && this.armData.joint2) {
            const currentDist = this.targetPos.length();
            const extendRatio = Math.max(0.0, Math.min(0.35, (currentDist - 0.9) * 0.35));
            this.armData.extensionRod.position.y = 0.30 + extendRatio;
            this.armData.joint2.position.y = 0.55 + extendRatio;
        }

        // 夾爪動畫 (科研模式為 0 延遲瞬發，遊戲模式為平滑過渡)
        const targetOpen = this.mission.clawOpen ? 1.0 : 0.0;
        const animSpeed = (this.mode === 'research') ? 999.0 : 16.0;
        this.clawAnimProgress += (targetOpen - this.clawAnimProgress) * Math.min(1.0, animSpeed * dt);
        const offset = this.clawAnimProgress * 0.06;
        this.armData.clawLeft.position.x = -0.065 - offset;
        this.armData.clawRight.position.x = 0.065 + offset;

        if (this.armData.statusLed) {
            this.armData.statusLed.material.color.setHex(this.mission.isSecured ? 0x00ff66 : 0xff7700);
        }

        // 提取關節物理角速度
        if (this.armData.ikBones && this.armData.ikBones.length > 0) {
            const len = Math.min(this.armData.ikBones.length, 4);
            const invDt = dt > 0.0001 ? 1.0 / dt : 60;
            for (let i = 0; i < len; i++) {
                const b = this.armData.ikBones[i];
                const currentAngle = (b.axis === 'Y') ? b.obj.rotation.y : b.obj.rotation.x;
                this._jointAngles[i] = currentAngle;
                const angularSpeed = Math.abs(currentAngle - this._prevJointAngles[i]) * invDt;
                this._jointTorques[i] = angularSpeed * (0.8 + i * 0.3);
                this._prevJointAngles[i] = currentAngle;
            }
        }

        // 🌟 科研數據流記錄與即時面板更新
        if (this.mode === 'research') {
            const vel = Math.hypot(this.inputMapper._currentVel.x, this.inputMapper._currentVel.y, this.inputMapper._currentVel.z);
            this.logger.logFrame({
                posX: this.targetPos.x,
                posY: this.targetPos.y,
                posZ: this.targetPos.z,
                joint0: this._jointAngles[0],
                joint1: this._jointAngles[1],
                joint2: this._jointAngles[2],
                joint3: this._jointAngles[3],
                vel: vel,
                error: this.mission.getDistance(),
                secured: this.mission.isSecured
            });

            // 更新科研 DOM 面板
            const resPos = document.getElementById('res-pos');
            const resJoints = document.getElementById('res-joints');
            const resVel = document.getElementById('res-vel');
            const resErr = document.getElementById('res-err');
            if (resPos) resPos.innerText = `(${this.targetPos.x.toFixed(2)}, ${this.targetPos.y.toFixed(2)}, ${this.targetPos.z.toFixed(2)})`;
            if (resJoints) resJoints.innerText = Array.from(this._jointAngles).map(a => (a*180/Math.PI).toFixed(1)).join('°, ');
            if (resVel) resVel.innerText = vel.toFixed(2);
            if (resErr) resErr.innerText = this.mission.getDistance().toFixed(3);
        }

        this.audio.setMotorPitch(intensity);
        this.hud.update(this.targetPos, this.armData, this.mission, intensity, this._jointAngles, this._jointTorques);

        // 🌟 遊戲模式更新粒子與微震，科研模式跳過
        if (this.mode !== 'research' && this.fx) {
            this.fx.update(dt);
        }

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
