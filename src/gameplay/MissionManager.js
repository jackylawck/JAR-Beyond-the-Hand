import { POOL } from '../core/Pool.js';
import { I18N } from '../config/i18n.js';
import { TargetSpawner } from './TargetSpawner.js';

export class MissionManager {
    constructor(endEffector, reactorSocket, audio, scene, mode, hudManager) {
        this.endEffector = endEffector;
        this.reactorSocket = reactorSocket;
        this.audio = audio;
        this.scene = scene;
        this.mode = mode;
        this.hud = hudManager; // 傳入 HUD 以調用對話

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';

        this.state = 'BRIEFING'; 
        this.totalSteps = 3;
        this.currentStep = 0;
        this.mistakes = 0;
        
        this.timeLeft = mode === 'advanced' ? 60 : 0; 
        this.stability = 100; 
        this.target = null;
        
        // 🌟 綁定 PC 空白鍵抓取
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.state === 'PLAYING') {
                e.preventDefault();
                this.toggleGrip();
            }
        });
    }

    setLanguage(lang) {
        this.currentLang = lang;
        if(this.target) this._updateMissionText();
    }

    startGame() {
        this.state = 'PLAYING';
        this.startTime = Date.now();
        this._spawnNextTarget();
        // 🌟 開局語音
        setTimeout(() => this.hud.playDialogue('start', this.mode), 500);
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
        if (titleEl && this.target) titleEl.innerText = `${this.target.userData.label} (${this.currentStep + 1}/${this.totalSteps})`;
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
            
            // 🌟 觸覺回饋與語音
            if (navigator.vibrate) navigator.vibrate(20);
            this.hud.playDialogue('secured', this.mode, '#00e5ff');
            
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            const socketTolerance = (this.mode === 'research' ? 0.20 : 0.40) * (1 - this.currentStep * 0.1);
            
            if (socketDist < socketTolerance) {
                this.isDelivered = true;
                this.isSecured = false;
                this.audio.playSuccess();
                if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
                
                this.currentStep++;
                if (this.currentStep >= this.totalSteps) {
                    this._finishGame(true);
                } else {
                    this._setStatus('statusComplete', 'rgba(0,204,102,0.25)', '#00cc66');
                    this.hud.playDialogue('success', null, '#00ff66');
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
        if (navigator.vibrate) navigator.vibrate(50); // 失誤強烈震動
        
        const hudEl = document.getElementById('hud');
        if (hudEl) {
            hudEl.style.borderColor = '#ff3d00';
            setTimeout(() => hudEl.style.borderColor = 'transparent', 400);
        }
        
        this.hud.playDialogue('drop', this.mode, '#ff3d00');

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
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
            this.hud.playDialogue('end_fail', null, '#ef4444');
        } else if (score >= 80) {
            rank = 'S'; rankColor = '#eab308';
            if (navigator.vibrate) navigator.vibrate([30, 30, 30, 30, 100]);
            this.hud.playDialogue('end_s', null, '#eab308');
        } else if (score >= 60) {
            rank = 'A'; rankColor = '#a855f7';
        }

        // 🌟 社交分享與成就系統
        const unlocks = JSON.parse(localStorage.getItem('jar-unlocks') || '{}');
        let achievementMsg = '';
        if (rank === 'S' && !unlocks.goldenSkin) {
            unlocks.goldenSkin = true;
            localStorage.setItem('jar-unlocks', JSON.stringify(unlocks));
            achievementMsg = '🏆 解鎖成就：黃金特仕版機械臂！';
        }

        // 產生獨立 Hash 認證碼 (社交分享用)
        const hash = `JAR-${Math.floor(Math.random()*8999)+1000}-${rank}`;
        document.getElementById('result-hash').innerText = hash;

        const overlay = document.getElementById('result-overlay');
        overlay.style.display = 'flex';
        
        // 戰績卡造型配置
        const card = document.getElementById('share-card');
        card.style.borderColor = rankColor;
        card.style.boxShadow = `0 0 40px ${rankColor}44`;

        document.getElementById('result-title').innerText = isSuccess ? '任務完成！' : `任務失敗`;
        document.getElementById('result-title').style.color = rankColor;
        
        const rankEl = document.getElementById('result-rank');
        rankEl.innerText = rank;
        rankEl.style.color = rankColor;
        rankEl.style.textShadow = `0 0 25px ${rankColor}`;
        
        document.getElementById('result-time').innerText = `${timeUsed} 秒`;
        document.getElementById('result-mistakes').innerText = `${this.mistakes} 次`;

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

    update(dt, targetPos, intensity = 0) {
        if (this.state !== 'PLAYING' || !this.target) return;

        if (this.mode === 'advanced') {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) this._finishGame(false, '時間耗盡');
        }

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
