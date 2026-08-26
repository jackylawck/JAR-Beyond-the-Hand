import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { HUDManager } from '../render/HUDManager.js';
import { ImpactFXManager } from '../render/ImpactFXManager.js';
import { ModelDropZone } from '../ugc/ModelDropZone.js';

export class MainController {
    constructor(config, sceneManager, errorBoundary) {
        this.config = config;
        this.scene = sceneManager;
        this.errorBoundary = errorBoundary;
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.rafId = null;

        // Zero-Allocation 目標位置 (IK Target)
        this.targetPos = new THREE.Vector3(0, 1.8, 1.6);

        // 注入基礎子系統
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper(config);
        this.hud = new HUDManager(config);
        this.fx = new ImpactFXManager(this.scene.scene, this.scene.camera);

        // 核心組件實例
        this.armData = null;
        this.mission = null;
        this.dropZone = null;
        this.controls = null; // 360° 視角控制器
    }

    init() {
        try {
            // 1. 初始化 360° 軌道控制器 (支援多角度滑動觀察)
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = new THREE.OrbitControls(this.scene.camera, this.scene.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.08;
                this.controls.target.set(0, 1.0, 0.5);
                this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // 避免穿透地台底部
                this.controls.minDistance = 2.0;
                this.controls.maxDistance = 10.0;
            }

            // 2. 構建機械臂與場景
            this.armData = ArmBuilder.build(this.scene.scene);

            // 3. 任務管理器 (注入音效、特效、輸入映射及點光源)
            this.mission = new MissionManager(
                this.armData.endEffector,
                this.armData.reactorCore,
                this.armData.reactorSocket,
                this.audio,
                this.config,
                this.fx,
                this.inputMapper,
                this.armData.labLight || null
            );

            // 4. HUD 初始化
            this.hud.init(this.mission, this.armData);

            // 5. 綁定雙搖桿與夾爪控制
            JoystickManager.init(
                (x, y) => this.inputMapper.setTranslation(x, y),
                (x, y) => this.inputMapper.setRotation(x, y),
                () => this.mission.toggleGrip()
            );

            // 6. 科研/創客模式：掛載 UGC 3D 列印 STL 拖拽介面
            if (this.config.getLevel() === 'research' || this.config.get('ugc.enabled')) {
                this.dropZone = new ModelDropZone((modelData) => {
                    this._handleUGCModel(modelData);
                });
            }

            // 7. 啟動主渲染迴圈
            this.isRunning = true;
            this.animate();
            this.hud.updateStatus('statusReady');

        } catch (error) {
            console.error('[MainController] 初始化失敗:', error);
            if (this.errorBoundary) this.errorBoundary._renderError(`Init Failed: ${error.message}`);
        }
    }

    /**
     * 即時切換雙語 (zh / en)
     */
    setLanguage(lang) {
        if (this.config.setLang) {
            this.config.setLang(lang);
        }
        if (this.hud && this.hud.updateLanguage) {
            this.hud.updateLanguage(lang, this.mission);
        }
    }

    animate() {
        if (!this.isRunning) return;
        this.rafId = requestAnimationFrame(() => this.animate());

        // 取得時間步長並支援 Hit Stop / 慢動作時間縮放 (Time Scale)
        const rawDt = Math.min(this.clock.getDelta(), 0.05);
        const timeScale = this.mission ? this.mission.timeScale : 1.0;
        const dt = rawDt * timeScale;
        const camera = this.scene.camera;

        // 1. 核心呼吸發光動畫
        if (this.armData.coreGlow) {
            const pulse = 1.0 + Math.sin(Date.now() * 0.005) * 0.15;
            this.armData.coreGlow.scale.set(pulse, pulse, pulse);
        }

        // 2. 操控映射 (基於當前視角前後左右平移)
        this.inputMapper.update(this.targetPos, dt, camera);

        // 3. 任務狀態、磁吸與點火序列
        this.mission.update(dt, this.targetPos);

        // 4. 阻尼 CCD-IK 逆運動學解算
        CCDIKSolver.solve(
            this.armData.ikBones,
            this.armData.endEffector,
            this.targetPos,
            this.config.get('ik.iterations'),
            this.config.get('ik.damping')
        );

        // 5. 夾爪開合插值動畫
        this._updateGripper();

        // 6. 相機視角更新 (點火時全景鏡頭，其餘時間允許玩家 360° 旋轉視角)
        this._updateCamera(rawDt, camera);

        // 7. 特效與震屏
        this.fx.update(rawDt);

        // 8. 伺服馬達音調變頻
        this.audio.setMotorPitch(this.inputMapper.getIntensity());

        // 9. 全息 HUD 數據刷新
        this.hud.update(this.targetPos, this.armData, this.mission);

        // 10. WebGL 畫面渲染
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
        // 點火儀式過渡：相機自動拉遠至全景展示 (Ignition Wide Shot)
        if (this.mission && this.mission.isIgniting) {
            if (this.controls) this.controls.enabled = false;
            POOL.camTargetPos.set(0, 4.5, 6.2);
            camera.position.lerp(POOL.camTargetPos, 2.0 * dt);
            POOL.camLook.set(0, 1.2, 0.4);
            camera.lookAt(POOL.camLook);
            return;
        }

        // 平時啟用 OrbitControls，允許用戶手指/滑鼠自由拖曳旋轉多角度觀察
        if (this.controls) {
            this.controls.enabled = true;
            this.controls.update();
        }
    }

    _handleUGCModel(modelData) {
        const { slot, geometry, physics } = modelData;
        const targetMesh = (slot === 'claw') ? this.armData.endEffector : this.armData.ikBones[2].obj;

        if (targetMesh && geometry) {
            const customMesh = new THREE.Mesh(
                geometry,
                new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.2 })
            );
            targetMesh.add(customMesh);
            this.inputMapper.setPayload(physics.mass > 0.5);
            this.hud.updateStatus('UGC_MODEL_LOADED');
        }
    }

    dispose() {
        this.isRunning = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);

        if (this.controls) this.controls.dispose();
        this.scene.dispose();
        this.audio.dispose?.();
        this.hud.dispose?.();
        this.fx.dispose?.();
        this.dropZone?.dispose?.();
    }
}
