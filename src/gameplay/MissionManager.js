import { POOL } from '../core/Pool.js';
import { I18N } from '../config/i18n.js';

export class MissionManager {
    constructor(endEffector, reactorCore, reactorSocket, audio) {
        this.endEffector = endEffector;
        this.reactorCore = reactorCore;
        this.reactorSocket = reactorSocket;
        this.audio = audio;

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';
    }

    setLanguage(lang) {
        this.currentLang = lang;
    }

    toggleGrip() {
        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(POOL.v1);
        const dist = POOL.v1.distanceTo(this.reactorCore.position);
        const dict = I18N[this.currentLang] || I18N.zh;

        if (!this.clawOpen && dist < 0.45 && !this.isDelivered) {
            this.isSecured = true;
            this._setStatus(dict.statusSecured, 'rgba(0, 229, 255, 0.25)', '#00e5ff');
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            if (socketDist < 0.38) {
                this.isDelivered = true;
                this.isSecured = false;
                this.reactorCore.position.set(0.85, 0.26, 0.85);
                this.audio.playSuccess();
                this._setStatus(dict.statusComplete, 'rgba(0, 255, 100, 0.2)', '#00ff66');
            } else {
                this.isSecured = false;
                this._setStatus(dict.statusReady, 'rgba(0, 229, 255, 0.12)', '#00e5ff');
            }
        }
    }

    _setStatus(text, bg, border) {
        const tag = document.getElementById('status-tag');
        if (tag) {
            tag.innerText = text;
            tag.style.background = bg;
            tag.style.borderColor = border;
        }
    }

    update(dt, targetPos) {
        this.endEffector.getWorldPosition(POOL.v1);
        const guidanceEl = document.getElementById('mission-desc');
        const dict = I18N[this.currentLang] || I18N.zh;

        if (!this.isSecured && !this.isDelivered) {
            const distToCore = POOL.v1.distanceTo(this.reactorCore.position);
            if (distToCore > 0.45) {
                if (guidanceEl) { guidanceEl.innerText = dict.step1; guidanceEl.style.color = '#00e5ff'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step2; guidanceEl.style.color = '#00ff66'; }
                targetPos.lerp(this.reactorCore.position, 6.0 * dt);
            }
        } else if (this.isSecured) {
            this.reactorCore.position.lerp(POOL.v1, 14.0 * dt);
            const distToSocket = POOL.v1.distanceTo(this.reactorSocket.position);
            if (distToSocket > 0.38) {
                if (guidanceEl) { guidanceEl.innerText = dict.step3; guidanceEl.style.color = '#ff9100'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step4; guidanceEl.style.color = '#00ff66'; }
            }
            if (distToSocket < 0.34) {
                targetPos.lerp(this.reactorSocket.position, 5.0 * dt);
            }
        }
    }
}
