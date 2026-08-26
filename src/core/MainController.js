import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { HUDManager } from '../render/HUDManager.js';
import { ImpactFXManager } from '../render/ImpactFXManager.js';
import { AtmosphereFX } from '../render/AtmosphereFX.js';
import { ModelDropZone } from '../ugc/ModelDropZone.js';

export class MainController {
    constructor(config, sceneManager, errorBoundary) {
        this.config = config;
        this.scene = sceneManager;
        this.errorBoundary = errorBoundary;
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.rafId = null;

        // Zero-Allocation 目標位置 (IK Target) 與基準坐標
        this.targetPos = new THREE.Vector3(0, 1.9, 1.5);
        this.idleTime = 0;

        // 注入基礎子系統
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper(config);
        this.hud = new HUDManager(config);
        this.fx = new ImpactFXManager(this.scene.scene, this.scene.camera);
        this.atmosphere = new AtmosphereFX(this.scene.scene);

        // 核心組件實例
        this.armData = null;
        this.mission = null;
        this.dropZone = null;
        this.controls = null;
        this.currentCustomMesh = null;
    }

    init() {
        try {
            // 1. 初始化 360° 軌道控制器 (支援多角度觀察)
            if (typeof THREE.OrbitControls !== 'undefined') {
                this.controls = new THREE.OrbitControls(this.scene.camera, this.scene.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.08;
                this.controls.target.set(0, 1.1, 0.4);
                this.controls.maxPolarAngle = Math.PI / 2 + 0.02;
                this.controls.minDistance = 2.0;
                this.controls.maxDistance = 10.0;
            }

            // 2. 構建機械臂與場景幾何
            this.armData = ArmBuilder.build(this.scene.scene);

            // 3. 任務管理器
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

            // 5. 綁定雙搖桿與夾爪控制 (觸控互斥保護)
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

            // 6. 科研/創客模式：掛載 UGC 3D 列印 STL 拖拽介面
            if (this.config && (this.config.getLevel?.() === 'research' || this.config.get?.('ugc.enabled'))) {
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
        if (this.config && this.config.setLang) {
            this.config.setLang(lang);
        }
        if (this.hud && this.hud.updateLanguage) {
            this.hud.updateLanguage(lang, this.mission);
        }
    }

    animate() {
        if (!this.isRunning) return;
        this.rafId = requestAnimationFrame(() => this.animate());

        const rawDt = Math.min(this.clock.getDelta(), 0.05);
        const timeScale = this.mission ? (this.mission.timeScale || 1.0) : 1.0;
        const dt = rawDt * timeScale;
        const camera = this.scene.camera;
        this.idleTime += dt;

        // 1. 機械臂待機微動作 (修正高度漂移：使用振幅微調而非持續累加)
        const intensity = this.inputMapper.getIntensity();
        if (intensity < 0.01 && !this.mission.isSecured && !this.mission.isIgniting) {
            const idleOffset = Math.sin(this.idleTime * 1.8) * 0.003;
            this.targetPos.y += idleOffset;
        }

        // 2. 核心呼吸脈衝光
        if (this.armData.coreGlow) {
            const pulse = 1.0 + Math.sin(this.idleTime * 3.2) * 0.15;
            this.armData.coreGlow.scale.set(pulse, pulse, pulse);
        }

        // 3. 環境大氣微塵與能量流動光節點
        this.atmosphere.update(dt);

        // 4. 操控映射 (基於當前視角平移)
        this.inputMapper.update(this.targetPos, dt, camera);

        // 5. 任務狀態、磁吸與點火序列
        this.mission.update(dt, this.targetPos);

        // 6. 阻尼 CCD-IK 逆運動學解算
        const ikIterations = this.config?.get?.('ik.iterations') || 3;
        const ikDamping = this.config?.get?.('ik.damping') || 0.7;
        CCDIKSolver.solve(
            this.armData.ikBones,
            this.armData.endEffector,
            this.targetPos,
            ikIterations,
            ikDamping
        );

        // 7. 夾爪開合插值動畫
        this._updateGripper();

        // 8. 相機視角更新 (點火時全景鏡頭，平時支援 360° 自由環視)
        this._updateCamera(rawDt, camera);

        // 9. 特效與震屏
        this.fx.update(rawDt);

        // 10. 伺服馬達音調變頻
        this.audio.setMotorPitch(intensity);

        // 11. 全息 HUD 數據刷新
        this.hud.update(this.targetPos, this.armData, this.mission);

        // 12. WebGL 畫面渲染
        this.scene.render();
    }

    _updateGripper() {
        const targetOffset = this.mission.clawOpen
            ? (this.config?.get?.('gripper.open') || 0.08)
            : (this.config?.get?.('gripper.closed') || 0.01);
        const speed = this.config?.get?.('gripper.lerpSpeed') || 0.25;

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

        // 平時啟用 OrbitControls
        if (this.controls && this.controls.enabled) {
            this.controls.update();
        }
    }

    _handleUGCModel(modelData) {
        const { slot, geometry, physics } = modelData;
        const targetMesh = (slot === 'claw') ? this.armData.endEffector : this.armData.ikBones[2].obj;

        if (targetMesh && geometry) {
            // 清理舊有的自訂裝配模型，防止重複疊加穿模與記憶體洩漏
            if (this.currentCustomMesh) {
                this.currentCustomMesh.parent?.remove(this.currentCustomMesh);
                this.currentCustomMesh.geometry?.dispose();
                this.currentCustomMesh.material?.dispose();
                this.currentCustomMesh = null;
            }

            const customMesh = new THREE.Mesh(
                geometry,
                new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.85, roughness: 0.2 })
            );
            targetMesh.add(customMesh);
            this.currentCustomMesh = customMesh;

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

        if (this.currentCustomMesh) {
            this.currentCustomMesh.geometry?.dispose();
            this.currentCustomMesh.material?.dispose();
        }
    }
}
