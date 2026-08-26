import { POOL } from '../core/Pool.js';

export class MissionManager {
    constructor(endEffector, reactorCore, reactorSocket, audio, config, fxManager, inputMapper, labPointLight) {
        this.endEffector = endEffector;
        this.reactorCore = reactorCore;
        this.reactorSocket = reactorSocket;
        this.audio = audio;
        this.config = config;
        this.fx = fxManager;
        this.inputMapper = inputMapper;
        this.labLight = labPointLight; // 環境點光源，用於點火超載效果

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;

        this.currentPhase = 0;
        this.startTime = Date.now();
        this.errorCount = 0;
        this.dropVelocityY = 0;

        // 3A 時間膨脹與點火動畫狀態
        this.timeScale = 1.0;
        this.isIgniting = false;
        this.ignitionProgress = 0;
    }

    toggleGrip() {
        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(POOL.v1);
        const dist = POOL.v1.distanceTo(this.reactorCore.position);

        if (!this.clawOpen && dist < 0.42 && !this.isDelivered) {
            this.isSecured = true;
            this.currentPhase = 2;
            this.inputMapper.setPayload(true);

            // 1. 微停頓 (Hit Stop) + 屏息靜音 + 次低音衝擊
            this.timeScale = 0.1; // 瞬間降速，營造重量咬合感
            setTimeout(() => { this.timeScale = 1.0; }, 120);

            this.audio.triggerAudioSilence(0.12);
            this.audio.playSubBassHit();
            this.inputMapper.triggerHaptic('grip');

            this.fx.triggerShake(0.04, 0.15);
            this.fx.triggerBurst(POOL.v1, 0x00e5ff);

            document.getElementById('status-tag').innerText = "CORE SECURED";
            document.getElementById('status-tag').style.background = "rgba(0, 229, 255, 0.25)";
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            this.inputMapper.setPayload(false);

            if (socketDist < 0.35) {
                this._startIgnitionSequence();
            } else {
                this._handleAccidentalDrop();
            }
        }
    }

    _handleAccidentalDrop() {
        this.isSecured = false;
        this.currentPhase = 0;
        this.errorCount++;
        this.dropVelocityY = 0;

        this.fx.triggerShake(0.03, 0.2);
        this.inputMapper.triggerHaptic('light');

        const hud = document.getElementById('hud');
        hud.style.boxShadow = 'inset 0 0 50px rgba(255,61,0,0.4)';
        setTimeout(() => { hud.style.boxShadow = 'none'; }, 600);

        const guidance = document.getElementById('mission-guidance');
        if (guidance) {
            guidance.innerText = "⚠️ 核心脫落！請重新對準並抓取";
            guidance.style.color = "#ff3d00";
        }
    }

    // 3A 反應爐點火儀式 (Ignition Sequence)
    _startIgnitionSequence() {
        this.isDelivered = true;
        this.isSecured = false;
        this.isIgniting = true;
        this.ignitionProgress = 0;
        this.currentPhase = 3;
        this.reactorCore.position.set(0.75, 0.32, 0.75);

        // 屏息與點火突波音效
        this.audio.triggerAudioSilence(0.2);
        this.audio.playIgnitionSurge();
        this.inputMapper.triggerHaptic('heavy');
        this.fx.triggerShake(0.09, 0.5);

        // 全息 HUD 臨界報警動畫
        const hud = document.getElementById('hud');
        hud.style.boxShadow = 'inset 0 0 120px rgba(0,229,255,0.6)';

        // 熟練度次數 +1
        const runs = parseInt(localStorage.getItem('beyond_completed_runs') || '0', 10);
        localStorage.setItem('beyond_completed_runs', (runs + 1).toString());
    }

    update(dt, targetPos) {
        const scaledDt = dt * this.timeScale;
        this.endEffector.getWorldPosition(POOL.v1);

        // 點火動畫演繹：環境光脈衝超載至臨界
        if (this.isIgniting) {
            this.ignitionProgress += dt;
            if (this.labLight) {
                // 燈光由暗至極亮脈衝
                this.labLight.intensity = 2.0 + Math.sin(this.ignitionProgress * 8) * 3.5;
            }

            // 1.8 秒後全景完成，彈出結算畫面
            if (this.ignitionProgress >= 1.8) {
                this.isIgniting = false;
                if (this.labLight) this.labLight.intensity = 2.5;
                document.getElementById('hud').style.boxShadow = 'none';
                this._renderVictoryModal();
            }
            return;
        }

        // 掉落物理彈跳模擬
        if (!this.isSecured && !this.isDelivered && this.reactorCore.position.y > 0.3) {
            this.dropVelocityY -= 9.8 * scaledDt;
            this.reactorCore.position.y += this.dropVelocityY * scaledDt;
            if (this.reactorCore.position.y <= 0.3) {
                this.reactorCore.position.y = 0.3;
                this.dropVelocityY = 0;
            }
        }

        const progressEl = document.getElementById('phase-progress-bar');
        const guidanceEl = document.getElementById('mission-guidance');

        if (!this.isSecured && !this.isDelivered) {
            const distToCore = POOL.v1.distanceTo(this.reactorCore.position);
            this.audio.updateTension(distToCore);

            if (distToCore > 0.45) {
                this.currentPhase = 0;
                if (guidanceEl) { guidanceEl.innerText = "🎯 移向前方量子核心"; guidanceEl.style.color = "#00e5ff"; }
            } else {
                this.currentPhase = 1;
                if (guidanceEl) { guidanceEl.innerText = "🟢 按下 GRIP 抓取！"; guidanceEl.style.color = "#00ff66"; }
                targetPos.lerp(this.reactorCore.position, 6.0 * scaledDt);
            }
        } else if (this.isSecured) {
            this.reactorCore.position.lerp(POOL.v1, 14.0 * scaledDt);
            const distToSocket = POOL.v1.distanceTo(this.reactorSocket.position);
            this.audio.updateTension(distToSocket);

            if (distToSocket > 0.35) {
                if (guidanceEl) { guidanceEl.innerText = "➡️ 移動至右側光圈基座"; guidanceEl.style.color = "#ff9100"; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = "✅ 釋放 GRIP 啟動點火！"; guidanceEl.style.color = "#00ff66"; }
            }

            if (distToSocket < 0.32) {
                targetPos.lerp(this.reactorSocket.position, 5.0 * scaledDt);
            }
        }

        if (progressEl) {
            const pct = (this.currentPhase / 3) * 100;
            progressEl.style.width = `${Math.max(10, pct)}%`;
        }
    }

    _renderVictoryModal() {
        const elapsedSec = (Date.now() - this.startTime) / 1000;
        const score = Math.max(10, Math.round(1000 - elapsedSec * 15 - this.errorCount * 120));
        const rank = score >= 850 ? 'S' : score >= 650 ? 'A' : 'B';

        const bestScore = parseInt(localStorage.getItem('beyond_best_score') || '0', 10);
        const isNewRecord = score > bestScore;
        if (isNewRecord) localStorage.setItem('beyond_best_score', score.toString());

        const scoreModal = document.getElementById('success-screen');
        if (scoreModal) {
            document.getElementById('final-time').innerText = elapsedSec.toFixed(1);
            document.getElementById('final-score').innerText = score;
            document.getElementById('final-rank').innerText = rank;
            document.getElementById('new-record-badge').style.display = isNewRecord ? 'inline-block' : 'none';
            scoreModal.style.display = 'block';
        }
    }
}
