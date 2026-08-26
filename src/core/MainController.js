import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { HUDManager } from '../render/HUDManager.js';
import { ImpactFXManager } from '../render/ImpactFXManager.js';

export class MainController {
    constructor(config, sceneManager, errorBoundary) {
        this.config = config;
        this.scene = sceneManager;
        this.errorBoundary = errorBoundary;
        this.clock = new THREE.Clock();
        this.isRunning = false;

        this.targetPos = new THREE.Vector3(0, 1.8, 1.6);

        // 子系統
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper(config);
        this.hud = new HUDManager(config);
        this.fx = new ImpactFXManager(this.scene.scene, this.scene.camera);

        this.armData = null;
        this.mission = null;
    }

    init() {
        try {
            this.armData = ArmBuilder.build(this.scene.scene);

            this.mission = new MissionManager(
                this.armData.endEffector,
                this.armData.reactorCore,
                this.armData.reactorSocket,
                this.audio,
                this.config,
                this.fx,
                this.inputMapper
            );

            this.hud.init(this.mission, this.armData);

            JoystickManager.init(
                (x, y) => this.inputMapper.setTranslation(x, y),
                (x, y) => this.inputMapper.setRotation(x, y),
                () => this.mission.toggleGrip()
            );

            this.isRunning = true;
            this.animate();
            this.hud.updateStatus('statusReady');

        } catch (error) {
            console.error('[MainController] 初始化失敗:', error);
            if (this.errorBoundary) this.errorBoundary._renderError(`Init Failed: ${error.message}`);
        }
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const camera = this.scene.camera;

        // 核心呼吸光動畫 (Environmental Storytelling)
        if (this.armData.coreGlow) {
            const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.15;
            this.armData.coreGlow.scale.set(pulse, pulse, pulse);
        }

        this.inputMapper.update(this.targetPos, dt, camera);
        this.mission.update(dt, this.targetPos);

        CCDIKSolver.solve(
            this.armData.ikBones,
            this.armData.endEffector,
            this.targetPos,
            this.config.get('ik.iterations'),
            this.config.get('ik.damping')
        );

        this._updateGripper();
        this._updateCamera(dt, camera);
        this.fx.update(dt);
        this.audio.setMotorPitch(this.inputMapper.getIntensity());
        this.hud.update(this.targetPos, this.armData, this.mission);
        this.scene.render();
    }

    _updateGripper() {
        const targetOffset = this.mission.clawOpen
            ? this.config.get('gripper.open')
            : this.config.get('gripper.closed');
        const speed = this.config.get('gripper.lerpSpeed');

        this.armData.clawLeft.position.x += (-0.06 - targetOffset - this.armData.clawLeft.position.x) * speed;
        this.armData.clawRight.position.x += (0.06 + targetOffset - this.armData.clawRight.position.x) * speed;
    }

    _updateCamera(dt, camera) {
        this.armData.endEffector.getWorldPosition(POOL.v1);
        const cfg = this.config.get('camera');

        POOL.camTargetPos.set(
            POOL.v1.x * cfg.posWeight,
            cfg.heightOffset + POOL.v1.y * 0.25,
            cfg.depthOffset + POOL.v1.z * 0.2
        );
        camera.position.lerp(POOL.camTargetPos, cfg.smoothness * dt);

        POOL.camLook.set(
            POOL.v1.x * cfg.lookAtWeight,
            cfg.lookAtYOffset + POOL.v1.y * 0.2,
            0.5
        );
        camera.lookAt(POOL.camLook);
    }

    dispose() {
        this.isRunning = false;
        this.scene.dispose();
        this.audio.dispose?.();
        this.hud.dispose?.();
        this.fx.dispose?.();
    }
}
