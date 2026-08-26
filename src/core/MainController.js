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
    }

    init() {
        this.controls = new THREE.OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 0.6, 0.2);
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

        this.armData = ArmBuilder.build(this.sceneMgr.scene);
        
        // 傳入 mode 與 scene 給 MissionManager
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

        this.inputMapper.update(this.targetPos, dt, this.sceneMgr.camera);
        this.mission.update(dt, this.targetPos);

        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos, 4, 0.8);

        // 物理伸縮大臂
        if (this.armData.extensionRod && this.armData.joint2) {
            const currentDist = this.targetPos.length();
            const extendRatio = Math.max(0.0, Math.min(0.5, (currentDist - 1.0) * 0.4));
            this.armData.extensionRod.position.y = 0.65 + extendRatio;
            this.armData.joint2.position.y = 0.9 + extendRatio;
        }

        const targetOffset = this.mission.clawOpen ? 0.08 : 0.01;
        this.armData.clawLeft.position.x += (-0.07 - targetOffset - this.armData.clawLeft.position.x) * 0.3;
        this.armData.clawRight.position.x += (0.07 + targetOffset - this.armData.clawRight.position.x) * 0.3;

        this.audio.setMotorPitch(intensity);
        this.hud.update(this.targetPos, this.armData, this.mission, intensity);

        if (this.controls) this.controls.update();
        this.sceneMgr.render();
    }
}
