import { POOL } from '../core/Pool.js';
import { I18N } from '../config/i18n.js';
import { TargetSpawner } from './TargetSpawner.js';

export class MissionManager {
    constructor(endEffector, reactorSocket, audio, scene, mode) {
        this.endEffector = endEffector;
        this.reactorSocket = reactorSocket;
        this.audio = audio;
        this.mode = mode;

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';

        // 🌟 生成專屬目標 (草莓/晶片/試管)
        this.target = TargetSpawner.spawnTarget(this.mode, scene);
    }

    setLanguage(lang) {
        this.currentLang = lang;
    }

    toggleGrip() {
        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(POOL.v1);
        const dist = POOL.v1.distanceTo(this.target.position);
        
        // 讀取該物件的專屬容錯值
        const tolerance = this.target.userData.tolerance || 0.45;

        if (!this.clawOpen && dist < tolerance && !this.isDelivered) {
            this.isSecured = true;
            this.audio.playPneumatic(); // 成功鎖定聲
            this._setStatus('statusSecured', 'rgba(0,170,255,0.25)', '#00aaff');
        } else if (this.clawOpen && this.isSecured) {
            // 判斷是否放入槽位
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            const socketTolerance = this.mode === 'research' ? 0.20 : 0.45;
            
            if (socketDist < socketTolerance) {
                this.isDelivered = true;
                this.isSecured = false;
                this.target.position.set(0.9, 0.26, 0.9);
                this.audio.playSuccess();
                this._setStatus('statusComplete', 'rgba(0,204,102,0.25)', '#00cc66');
            } else {
                this.isSecured = false;
                this._setStatus('statusReady', 'rgba(0,170,255,0.12)', '#00aaff');
                // 科研模式失手懲罰
                if (this.mode === 'research') this._applyPenalty();
            }
        }
    }

    _applyPenalty() {
        this.audio.playPneumatic(); // 警示音
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.borderColor = '#ff3d00';
            setTimeout(() => hud.style.borderColor = 'transparent', 600);
        }
    }

    _setStatus(statusKey, bg, border) {
        const dict = I18N[this.currentLang] || I18N.zh;
        const tag = document.getElementById('status-tag');
        if (tag) {
            tag.innerText = dict[statusKey] || statusKey;
            tag.style.background = bg;
            tag.style.borderColor = border;
        }
    }

    update(dt, targetPos) {
        this.endEffector.getWorldPosition(POOL.v1);
        const dict = I18N[this.currentLang] || I18N.zh;
        const guidanceEl = document.getElementById('mission-desc');
        const magneticRange = this.target.userData.tolerance || 0.45;

        if (!this.isSecured && !this.isDelivered) {
            const distToCore = POOL.v1.distanceTo(this.target.position);
            if (distToCore > magneticRange) {
                if (guidanceEl) { guidanceEl.innerText = dict.step1; guidanceEl.style.color = '#0066cc'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step2; guidanceEl.style.color = '#00aa44'; }
                // 磁吸
                targetPos.lerp(this.target.position, 6.0 * dt);
            }
        } else if (this.isSecured) {
            // 抓取後跟隨末端
            this.target.position.lerp(POOL.v1, 16.0 * dt);
            const distToSocket = POOL.v1.distanceTo(this.reactorSocket.position);
            if (distToSocket > 0.45) {
                if (guidanceEl) { guidanceEl.innerText = dict.step3; guidanceEl.style.color = '#ff6600'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step4; guidanceEl.style.color = '#00aa44'; }
                targetPos.lerp(this.reactorSocket.position, 5.0 * dt);
            }
        }
    }
}
