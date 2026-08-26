import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { AtmosphereFX } from '../render/AtmosphereFX.js';
import { HUDManager } from '../render/HUDManager.js';

export class MainController {
    constructor(sceneManager) {
        this.sceneMgr = sceneManager;
        this.clock = new THREE.Clock();
        this.isRunning = false;

        this.targetPos = new THREE.Vector3(0, 1.6, 1.4);
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper();
        this.atmosphere = new AtmosphereFX(this.sceneMgr.scene);
        this.hud = new HUDManager();

        this.armData = null;
        this.mission = null;
        this.controls = null;
    }

    init() {
        this.controls = new THREE.OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 0.9, 0.3);
        this.controls.maxPolarAngle = Math.PI / 2 + 0.02;

        this.armData = ArmBuilder.build(this.sceneMgr.scene);
        this.mission = new MissionManager(this.armData.endEffector, this.armData.reactorCore, this.armData.reactorSocket, this.audio);

        this.hud.init();

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
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const intensity = this.inputMapper.getIntensity();

        this.atmosphere.update(dt);
        this.inputMapper.update(this.targetPos, dt, this.sceneMgr.camera);
        this.mission.update(dt, this.targetPos);

        // 逆運動學平滑求解
        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos, 4, 0.75);

        // 夾爪插值
        const targetOffset = this.mission.clawOpen ? 0.08 : 0.01;
        this.armData.clawLeft.position.x += (-0.09 - targetOffset - this.armData.clawLeft.position.x) * 0.25;
        this.armData.clawRight.position.x += (0.09 + targetOffset - this.armData.clawRight.position.x) * 0.25;

        this.audio.setMotorPitch(intensity);

        // 實時更新遙測面板
        this.hud.update(this.targetPos, this.armData, this.mission, intensity);

        if (this.controls) this.controls.update();
        this.sceneMgr.render();
    }
}
