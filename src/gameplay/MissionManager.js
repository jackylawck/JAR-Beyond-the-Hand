import { POOL } from '../core/Pool.js';
import { I18N } from '../config/i18n.js';
import { TargetSpawner } from './TargetSpawner.js';

export class MissionManager {
    constructor(endEffector, reactorSocket, audio, scene, mode) {
        this.endEffector = endEffector;
        this.reactorSocket = reactorSocket;
        this.audio = audio;
        this.scene = scene;
        this.mode = mode;

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';

        this.state = 'BRIEFING'; 
        this.totalSteps = 3;
        this.currentStep = 0;
        this.mistakes = 0;
        
        // 🌟 刀法 3：緊張感與時間壓力
        this.timeLeft = mode === 'advanced' ? 60 : 0; // 進階模式 60 秒限時
        this.stability = 100; // 科研模式穩定度
        
        this.target = null;
    }

    setLanguage(lang) {
        this.currentLang = lang;
        if(this.target) this._updateMissionText();
    }

    startGame() {
        this.state = 'PLAYING';
        this.startTime = Date.now();
        this._spawnNextTarget();
    }

    _spawnNextTarget() {
        if (this.target) this.scene.remove(this.target);
        this.target = TargetSpawner.spawnTarget(this.mode, this.scene, this.currentStep);
        this.isSecured = false;
        this.isDelivered = false;
        this.clawOpen = true;
        this._updateMissionText();
    }

    _updateMissionText() {
        const titleEl = document.getElementById('mission-title');
        if (titleEl && this.target) {
            titleEl.innerText = `${this.target.userData.label} (${this.currentStep + 1}/${this.totalSteps})`;
        }
    }

    toggleGrip() {
        if (this.state !== 'PLAYING') return;

        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(POOL.v1);
        const dist = POOL.v1.distanceTo(this.target.position);
        const tolerance = this.target.userData.tolerance;

        if (!this.clawOpen && dist < tolerance && !this.isDelivered) {
            this.isSecured = true;
            this.audio.playPneumatic();
            this._setStatus('statusSecured', 'rgba(0,170,255,0.25)', '#00aaff');
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            // 隨階段增加放入槽位嘅難度
            const socketTolerance = (this.mode === 'research' ? 0.20 : 0.40) * (1 - this.currentStep * 0.1);
            
            if (socketDist < socketTolerance) {
                this.isDelivered = true;
                this.isSecured = false;
                this.audio.playSuccess();
                this.currentStep++;

                if (this.currentStep >= this.totalSteps) {
                    this._finishGame(true);
                } else {
                    this._setStatus('statusComplete', 'rgba(0,204,102,0.25)', '#00cc66');
                    setTimeout(() => this._spawnNextTarget(), 1000); 
                }
            } else {
                this.isSecured = false;
                this._setStatus('statusReady', 'rgba(0,170,255,0.12)', '#00aaff');
                this._applyPenalty();
            }
        }
    }

    _applyPenalty() {
        this.mistakes++;
        this.audio.playPneumatic();
        const hud = document.getElementById('hud');
        if (hud) {
            hud.style.borderColor = '#ff3d00';
            setTimeout(() => hud.style.borderColor = 'transparent', 400);
        }
        if (this.mode === 'research' && this.mistakes >= 3) {
            this._finishGame(false, '化學樣本破損過多');
        }
    }

    _finishGame(isSuccess, reason = '') {
        this.state = 'END';
        const timeUsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        
        let score = 100 - (timeUsed * 0.8) - (this.mistakes * 15);
        let rank = 'B';
        let rankColor = '#38bdf8';
        
        if (!isSuccess) {
            rank = 'F'; rankColor = '#ef4444';
        } else if (score >= 80) {
            rank = 'S'; rankColor = '#eab308';
        } else if (score >= 60) {
            rank = 'A'; rankColor = '#a855f7';
        }

        // 🌟 刀法 2：獎勵機制 (Unlock System)
        const unlocks = JSON.parse(localStorage.getItem('jar-unlocks') || '{}');
        let achievementMsg = '';
        if (rank === 'S' && !unlocks.goldenSkin) {
            unlocks.goldenSkin = true;
            localStorage.setItem('jar-unlocks', JSON.stringify(unlocks));
            achievementMsg = '🏆 解鎖成就：黃金特仕版機械臂！';
        }

        document.getElementById('result-overlay').style.display = 'flex';
        document.getElementById('result-title').innerText = isSuccess ? '任務完成！' : `任務失敗 (${reason})`;
        document.getElementById('result-title').style.color = rankColor;
        
        const rankEl = document.getElementById('result-rank');
        rankEl.innerText = rank;
        rankEl.style.color = rankColor;
        
        document.getElementById('result-time').innerText = timeUsed;
        document.getElementById('result-mistakes').innerText = this.mistakes;

        const achEl = document.getElementById('result-achievement');
        if(achEl) achEl.innerText = achievementMsg;
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

    // 加入 intensity 參數監控搖桿激烈程度
    update(dt, targetPos, intensity = 0) {
        if (this.state !== 'PLAYING' || !this.target) return;

        // 1. 進階模式：限時倒數
        if (this.mode === 'advanced') {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) this._finishGame(false, '時間耗盡');
        }

        // 2. 科研模式：穩定度監控 (操作太急會跌穩定度)
        if (this.mode === 'research') {
            if (this.isSecured && intensity > 0.8) {
                this.stability -= dt * 25;
                if (this.stability <= 0) this._finishGame(false, '樣本劇烈震盪導致爆炸');
            } else {
                this.stability = Math.min(100, this.stability + dt * 10);
            }
        }

        this.endEffector.getWorldPosition(POOL.v1);
        const dict = I18N[this.currentLang] || I18N.zh;
        const guidanceEl = document.getElementById('mission-desc');
        const magneticRange = this.target.userData.tolerance;

        if (!this.isSecured && !this.isDelivered) {
            const distToCore = POOL.v1.distanceTo(this.target.position);
            if (distToCore > magneticRange) {
                if (guidanceEl) { guidanceEl.innerText = dict.step1; guidanceEl.style.color = '#0066cc'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step2; guidanceEl.style.color = '#00aa44'; }
                targetPos.lerp(this.target.position, 6.0 * dt);
            }
        } else if (this.isSecured) {
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
