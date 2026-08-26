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

        // 🌟 放寬抓取半徑至 0.65m，解決點不到的問題
        if (!this.clawOpen && dist < 0.65 && !this.isDelivered) {
            this.isSecured = true;
            this._setStatus(dict.statusSecured, 'rgba(0, 170, 255, 0.25)', '#00aaff');
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            // 🌟 放寬安裝半徑至 0.55m
            if (socketDist < 0.55) {
                this.isDelivered = true;
                this.isSecured = false;
                this.reactorCore.position.set(0.9, 0.2, 0.9);
                this.audio.playSuccess();
                this._setStatus(dict.statusComplete, 'rgba(0, 204, 102, 0.25)', '#00cc66');
            } else {
                this.isSecured = false;
                this._setStatus(dict.statusReady, 'rgba(0, 170, 255, 0.12)', '#00aaff');
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
            if (distToCore > 0.65) {
                if (guidanceEl) { guidanceEl.innerText = dict.step1; guidanceEl.style.color = '#0066cc'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step2; guidanceEl.style.color = '#00aa44'; }
                // 自動磁吸引導至核心正上方
                targetPos.lerp(this.reactorCore.position, 5.0 * dt);
            }
        } else if (this.isSecured) {
            // 抓取後跟隨機械臂末端
            this.reactorCore.position.lerp(POOL.v1, 16.0 * dt);
            const distToSocket = POOL.v1.distanceTo(this.reactorSocket.position);
            if (distToSocket > 0.55) {
                if (guidanceEl) { guidanceEl.innerText = dict.step3; guidanceEl.style.color = '#ff6600'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step4; guidanceEl.style.color = '#00aa44'; }
                targetPos.lerp(this.reactorSocket.position, 5.0 * dt);
            }
        }
    }
}
