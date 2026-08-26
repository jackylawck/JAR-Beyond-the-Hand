import * as THREE from 'three';
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
        this.controls = new THREE.OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 0.6, 0.2);
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

        this.armData = ArmBuilder.build(this.sceneMgr.scene, this.mode);
        
        this.mission = new MissionManager(
            this.armData.endEffector,
            this.armData.reactorSocket,
            this.audio,
            this.sceneMgr.scene,
            this.mode
        );

        this.hud.init(this.mode);

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
        
        // 🌟 將 intensity 傳入 MissionManager (用於科研模式穩定度檢測)
        this.mission.update(dt, this.targetPos, intensity);

        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos, 4, 0.8);

        // 液壓與套筒物理聯動
        if (this.armData.extensionRod && this.armData.joint2) {
            const currentDist = this.targetPos.length();
            const extendRatio = Math.max(0.0, Math.min(0.45, (currentDist - 1.0) * 0.4));
            this.armData.extensionRod.position.y = 0.65 + extendRatio;
            this.armData.joint2.position.y = 1.05 + extendRatio;
            
            if (this.armData.pistonRod) {
                this.armData.pistonRod.position.y = 0.78 + extendRatio * 0.6;
            }
        }

        // 夾爪非線性 Ease In/Out 開合
        const targetOpen = this.mission.clawOpen ? 1.0 : 0.0;
        this.clawAnimProgress += (targetOpen - this.clawAnimProgress) * (14.0 * dt);
        const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const progress = ease(Math.max(0, Math.min(1, this.clawAnimProgress)));
        const offset = progress * 0.08;
        this.armData.clawLeft.position.x = -offset;
        this.armData.clawRight.position.x = offset;

        // LED 狀態指示燈
        if (this.armData.statusLed) {
            this.armData.statusLed.material.color.setHex(this.mission.isSecured ? 0x00ff66 : 0xff7700);
        }

        this.audio.setMotorPitch(intensity);
        this.hud.update(this.targetPos, this.armData, this.mission, intensity);

        if (this.controls) this.controls.update();
        this.sceneMgr.render();
    }
}
