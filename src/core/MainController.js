import { POOL } from './Pool.js';
import { AudioEngine } from './AudioEngine.js';
import { ArmBuilder } from '../kinematics/ArmBuilder.js';
import { CCDIKSolver } from '../kinematics/CCDIKSolver.js';
import { InputMapper } from '../controls/InputMapper.js';
import { JoystickManager } from '../controls/JoystickManager.js';
import { MissionManager } from '../gameplay/MissionManager.js';
import { AtmosphereFX } from '../render/AtmosphereFX.js';
import { I18N } from '../config/i18n.js';

export class MainController {
    constructor(sceneManager) {
        this.sceneMgr = sceneManager;
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.rafId = null;

        this.targetPos = new THREE.Vector3(0, 1.9, 1.5);
        this.idleTime = 0;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';

        this.audio = new AudioEngine();
        this.inputMapper = new InputMapper();
        this.atmosphere = new AtmosphereFX(this.sceneMgr.scene);

        this.armData = null;
        this.mission = null;
        this.controls = null;
    }

    init() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.sceneMgr.camera, this.sceneMgr.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.target.set(0, 1.1, 0.4);
            this.controls.maxPolarAngle = Math.PI / 2 + 0.02;
            this.controls.minDistance = 2.0;
            this.controls.maxDistance = 10.0;
        }

        this.armData = ArmBuilder.build(this.sceneMgr.scene);

        this.mission = new MissionManager(
            this.armData.endEffector,
            this.armData.reactorCore,
            this.armData.reactorSocket,
            this.audio
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
        this.setLanguage(this.currentLang);
        this.animate();
    }

    setLanguage(lang) {
        this.currentLang = lang;
        if (this.mission) this.mission.setLanguage(lang);
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
        this.rafId = requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.05);
        this.idleTime += dt;

        const intensity = this.inputMapper.getIntensity();
        if (intensity < 0.01 && !this.mission.isSecured) {
            this.targetPos.y += Math.sin(this.idleTime * 1.8) * 0.003;
        }

        if (this.armData.coreGlow) {
            const pulse = 1.0 + Math.sin(this.idleTime * 3.2) * 0.15;
            this.armData.coreGlow.scale.set(pulse, pulse, pulse);
        }

        this.atmosphere.update(dt);
        this.inputMapper.update(this.targetPos, dt, this.sceneMgr.camera);
        this.mission.update(dt, this.targetPos);

        CCDIKSolver.solve(this.armData.ikBones, this.armData.endEffector, this.targetPos);

        const targetOffset = this.mission.clawOpen ? 0.08 : 0.01;
        this.armData.clawLeft.position.x += (-0.06 - targetOffset - this.armData.clawLeft.position.x) * 0.25;
        this.armData.clawRight.position.x += (0.06 + targetOffset - this.armData.clawRight.position.x) * 0.25;

        this.audio.setMotorPitch(intensity);
        if (this.controls) this.controls.update();
        this.sceneMgr.render();
    }

    dispose() {
        this.isRunning = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.controls) this.controls.dispose();
    }
}
