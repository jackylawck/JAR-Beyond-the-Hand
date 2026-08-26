import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { HUDManager } from '../render/HUDManager.js';

export class MainController {
    constructor(config, sceneManager, errorBoundary) {
        this.config = config;
        this.scene = sceneManager;
        this.errorBoundary = errorBoundary;
        this.clock = new THREE.Clock();
        this.isRunning = false;

        // Zero-Allocation 目標位置
        this.targetPos = new THREE.Vector3(0, 1.8, 1.6);

        // 子系統 (全部通過依賴注入)
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper(config);
        this.hud = new HUDManager(config);

        // 將被構建嘅子系統
        this.armData = null;
        this.mission = null;
        this.joystick = null;
    }

    init() {
        try {
            // 1. 構建機械臂
            this.armData = ArmBuilder.build(this.scene.scene);

            // 2. 任務管理器
            this.mission = new MissionManager(
                this.armData.endEffector,
                this.armData.reactorCore,
                this.armData.reactorSocket,
                this.audio,
                this.config
            );

            // 3. HUD
            this.hud.init(this.mission, this.armData);

            // 4. 搖桿 (注入 inputMapper)
            this.joystick = new JoystickManager(
                (x, y) => this.inputMapper.setTranslation(x, y),
                (x, y) => this.inputMapper.setRotation(x, y),
                () => this.mission.toggleGrip()
            );

            // 5. 啟動主循環
            this.isRunning = true;
            this.animate();

            // 6. 更新狀態
            this.hud.updateStatus('SYSTEM_READY');

        } catch (error) {
            console.error('[MainController] 初始化失敗:', error);
            this.errorBoundary._renderError(`Init Failed: ${error.message}`);
        }
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const camera = this.scene.camera;

        // ----- Stage 1: 輸入處理 -----
        this.inputMapper.update(this.targetPos, dt, camera);

        // ----- Stage 2: 物理與任務 -----
        this.mission.update(dt, this.targetPos);

        // ----- Stage 3: IK 解算 -----
        CCDIKSolver.solve(
            this.armData.ikBones,
            this.armData.endEffector,
            this.targetPos,
            this.config.get('ik.iterations'),
            this.config.get('ik.damping')
        );

        // ----- Stage 4: 夾爪動畫 -----
        this._updateGripper();

        // ----- Stage 5: 相機跟隨 -----
        this._updateCamera(dt, camera);

        // ----- Stage 6: 音效 -----
        this.audio.setMotorPitch(this.inputMapper.getIntensity());

        // ----- Stage 7: HUD -----
        this.hud.update(this.targetPos, this.armData, this.mission);

        // ----- Stage 8: 渲染 -----
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
        const endPos = this.armData.endEffector.position;
        const cfg = this.config._config.camera;

        POOL.camTargetPos.set(
            endPos.x * cfg.posWeight,
            cfg.heightOffset + endPos.y * 0.25,
            cfg.depthOffset + endPos.z * 0.2
        );
        camera.position.lerp(POOL.camTargetPos, cfg.smoothness * dt);

        POOL.camLook.set(
            endPos.x * cfg.lookAtWeight,
            cfg.lookAtYOffset + endPos.y * 0.2,
            0.5
        );
        camera.lookAt(POOL.camLook);
    }

    dispose() {
        this.isRunning = false;
        this.scene.dispose();
        this.audio.dispose?.();
        this.hud.dispose?.();
        this.joystick.dispose?.();
    }
}
