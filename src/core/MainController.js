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

        this.targetPos = new THREE.Vector3(-0.6, 0.5, 0.6);
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper();
        this.hud = new HUDManager();

        this.armData = null;
        this.mission = null;
        this.controls = null;
        this.clawAnimProgress = 1.0;
        this.coreAnimTime = 0;
    }

    init() {
        // 🌟 正確使用模組化 OrbitControls
        this.controls = new OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 0.6, 0.2);
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

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

        JoystickManager.init(
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

    _getJointAngles() {
        if (!this.armData?.ikBones) return [0, 0, 0, 0];
        return this.armData.ikBones.map(b => {
            if (b.axis === 'Y') return b.obj.rotation.y;
            return b.obj.rotation.x;
        });
    }

    _estimateJointTorques(angles, isSecured) {
        const payloadMass = isSecured ? 2.5 : 0.0;
        const g = 9.81;

        const m1 = 1.8, L1 = 1.1;
        const m2 = 1.2, L2 = 0.8;
        const m3 = 0.6;

        const theta1 = angles[1] || 0;
        const theta2 = angles[2] || 0;

        const r1 = (L1 / 2) * Math.sin(theta1);
        const r2 = L1 * Math.sin(theta1) + (L2 / 2) * Math.sin(theta1 + theta2);
        const rEnd = L1 * Math.sin(theta1) + L2 * Math.sin(theta1 + theta2);

        const tau0 = 0.8;
        const tau2 = Math.abs((m2 * g * (L2 / 2) + (m3 + payloadMass) * g * L2) * Math.sin(theta1 + theta2));
        const tau1 = Math.abs(m1 * g * r1 + m2 * g * r2 + (m3 + payloadMass) * g * rEnd);
        const tau3 = Math.abs((m3 + payloadMass) * g * 0.15);

        return [tau0, tau1, tau2, tau3];
    }

    setLanguage(lang) {
        if (this.mission) this.mission.setLanguage(lang);
        if (this.hud) this.hud.setLanguage(lang);
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const intensity = this.inputMapper.getIntensity();
        this.coreAnimTime += dt;

        this.inputMapper.update(this.targetPos, dt, this.sceneMgr.camera);
        this.mission.update(dt, this.targetPos, intensity);

        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos, 4, 0.8);

        if (this.armData.extensionRod && this.armData.joint2) {
            const currentDist = this.targetPos.length();
            const extendRatio = Math.max(0.0, Math.min(0.45, (currentDist - 1.0) * 0.4));
            this.armData.extensionRod.position.y = 0.65 + extendRatio;
            this.armData.joint2.position.y = 1.05 + extendRatio;

            if (this.armData.pistonRod) {
                this.armData.pistonRod.position.y = 0.78 + extendRatio * 0.6;
            }
        }

        const targetOpen = this.mission.clawOpen ? 1.0 : 0.0;
        this.clawAnimProgress += (targetOpen - this.clawAnimProgress) * (14.0 * dt);
        const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const progress = ease(Math.max(0, Math.min(1, this.clawAnimProgress)));
        const offset = progress * 0.08;
        this.armData.clawLeft.position.x = -offset;
        this.armData.clawRight.position.x = offset;

        if (this.armData.statusLed) {
            this.armData.statusLed.material.color.setHex(this.mission.isSecured ? 0x00ff66 : 0xff7700);
        }

        this.audio.setMotorPitch(intensity);

        const jointAngles = this._getJointAngles();
        const torques = this._estimateJointTorques(jointAngles, this.mission.isSecured);

        this.hud.update(this.targetPos, this.armData, this.mission, intensity, jointAngles, torques);

        if (this.controls) this.controls.update();
        this.sceneMgr.render();
    }
}
