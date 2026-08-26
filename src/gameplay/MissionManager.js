import { I18N } from '../config/i18n.js';

export class MissionManager {
    constructor(endEffector, reactorSocket, audioEngine, scene, mode = 'kid', hud = null) {
        this.endEffector = endEffector;
        this.reactorSocket = reactorSocket;
        this.audio = audioEngine;
        this.scene = scene;
        this.mode = mode;
        this.hud = hud;
        this.lang = 'zh';

        this.clawOpen = true;
        this.isSecured = false;
        this.currentDistance = 1.2;
        this.targetObj = null;

        this._initScenario();
    }

    _initScenario() {
        const t = I18N[this.lang];
        const jarBox = document.getElementById('jar-dialogue');
        const jarText = document.getElementById('jar-text');

        if (jarBox && jarText) {
            jarBox.style.display = 'block';
            if (this.mode === 'kid') jarText.innerText = t.jarKidWelcome;
            else if (this.mode === 'advanced') jarText.innerText = t.jarAdvWelcome;
            else jarText.innerText = t.jarResWelcome;
        }
    }

    setLanguage(lang) {
        this.lang = lang;
        const t = I18N[lang];
        const jarText = document.getElementById('jar-text');
        if (jarText) {
            if (this.mode === 'kid') jarText.innerText = t.jarKidWelcome;
            else if (this.mode === 'advanced') jarText.innerText = t.jarAdvWelcome;
            else jarText.innerText = t.jarResWelcome;
        }
    }

    toggleGrip() {
        this.clawOpen = !this.clawOpen;
        if (this.audio) this.audio.playPneumatic();

        if (!this.clawOpen && this.currentDistance < 0.28) {
            this.isSecured = true;
            if (this.audio) this.audio.playSuccess();
        } else if (this.clawOpen) {
            this.isSecured = false;
        }
    }

    update(dt, targetPos, intensity) {
        // 抓取物跟隨夾爪
        if (this.isSecured && this.targetObj) {
            this.targetObj.position.copy(targetPos);
            this.targetObj.position.y -= 0.12;
        }
    }
}
