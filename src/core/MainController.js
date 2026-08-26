import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { HUDManager } from '../render/HUDManager.js';
import { I18N } from '../config/i18n.js';

export class MainController {
    constructor(sceneManager) {
        this.sceneMgr = sceneManager;
        this.clock = new THREE.Clock();
        this.isRunning = false;

        // 初始位置設置在靠近核心處
        this.targetPos = new THREE.Vector3(-0.6, 0.5, 0.6);
        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper();
        this.hud = new HUDManager();

        this.armData = null;
        this.mission = null;
        this.controls = null;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';
    }

    init() {
        this.controls = new THREE.OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 0.6, 0.2);
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // 防止穿透地板

        this.armData = ArmBuilder.build(this.sceneMgr.scene);
        this.mission = new MissionManager(
            this.armData.endEffector,
            this.armData.reactorCore,
            this.armData.reactorSocket,
            this.audio
        );

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
        this.setLanguage(this.currentLang);
        this.animate();
    }

    setLanguage(lang) {
        this.currentLang = lang;
        if (this.mission) this.mission.setLanguage(lang);
        if (this.hud) this.hud.setLanguage(lang);

        const dict = I18N[lang] || I18N.zh;
        const titleEl = document.querySelector('.hud-title');
        const missionTitleEl = document.getElementById('mission-title');
        const viewHintEl = document.getElementById('view-hint');
        const gripBtnEl = document.getElementById('btn-grip');

        if (titleEl) titleEl.innerText = dict.title;
        if (missionTitleEl) missionTitleEl.innerText = dict.missionHeader;
        if (viewHintEl) viewHintEl.innerText = dict.viewHint;
        if (gripBtnEl) gripBtnEl.innerText = dict.gripBtn;
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        const intensity = this.inputMapper.getIntensity();

        // 1. 輸入更新
        this.inputMapper.update(this.targetPos, dt, this.sceneMgr.camera);
        this.mission.update(dt, this.targetPos);

        // 2. 逆運動學求解
        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos, 4, 0.8);

        // 3. 🌟 動態計算大臂物理伸縮長度 (根據與目標的距離伸長套筒)
        if (this.armData.extensionRod && this.armData.joint2) {
            const currentDist = this.targetPos.length();
            const extendRatio = Math.max(0.0, Math.min(0.5, (currentDist - 1.0) * 0.4));
            this.armData.extensionRod.position.y = 0.65 + extendRatio;
            this.armData.joint2.position.y = 0.9 + extendRatio;
        }

        // 4. 夾爪開合
        const targetOffset = this.mission.clawOpen ? 0.08 : 0.01;
        this.armData.clawLeft.position.x += (-0.07 - targetOffset - this.armData.clawLeft.position.x) * 0.3;
        this.armData.clawRight.position.x += (0.07 + targetOffset - this.armData.clawRight.position.x) * 0.3;

        // 5. 音效與實時數據
        this.audio.setMotorPitch(intensity);
        this.hud.update(this.targetPos, this.armData, this.mission, intensity);

        if (this.controls) this.controls.update();
        this.sceneMgr.render();
    }
}
