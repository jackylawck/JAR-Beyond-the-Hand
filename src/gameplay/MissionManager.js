import { POOL } from '../core/Pool.js';

export class MissionManager {
    constructor(endEffector, reactorCore, reactorSocket, audio, config, fxManager, inputMapper) {
        this.endEffector = endEffector;
        this.reactorCore = reactorCore;
        this.reactorSocket = reactorSocket;
        this.audio = audio;
        this.config = config;
        this.fx = fxManager;
        this.inputMapper = inputMapper;

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;

        // 階段流程: 0: SEARCH -> 1: READY_TO_GRIP -> 2: TRANSPORT -> 3: DELIVERED
        this.currentPhase = 0;
        this.startTime = Date.now();
        this.errorCount = 0;
        this.dropVelocityY = 0; // 掉落彈跳速度
    }

    toggleGrip() {
        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(POOL.v1);
        const dist = POOL.v1.distanceTo(this.reactorCore.position);

        if (!this.clawOpen && dist < 0.42 && !this.isDelivered) {
            // 成功抓取
            this.isSecured = true;
            this.currentPhase = 2; // TRANSPORT
            this.inputMapper.setPayload(true);

            this.fx.triggerShake(0.04, 0.15);
            this.fx.triggerBurst(POOL.v1, 0x00e5ff);

            document.getElementById('status-tag').innerText = "CORE SECURED";
            document.getElementById('status-tag').style.background = "rgba(0, 229, 255, 0.25)";
        } else if (this.clawOpen && this.isSecured) {
            // 釋放夾爪
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            this.inputMapper.setPayload(false);

            if (socketDist < 0.35) {
                this._celebrateDelivery();
            } else {
                // 有意義的失敗：核心半空中掉落彈跳
                this._handleAccidentalDrop();
            }
        }
    }

    _handleAccidentalDrop() {
        this.isSecured = false;
        this.currentPhase = 0; // 回到 SEARCH
        this.errorCount++;
        this.dropVelocityY = 0; // 觸發重力下墜

        this.fx.triggerShake(0.03, 0.2);
        this.audio.playError?.();

        // 邊框警示紅閃
        const hud = document.getElementById('hud');
        hud.style.boxShadow = 'inset 0 0 50px rgba(255,61,0,0.4)';
        setTimeout(() => { hud.style.boxShadow = 'none'; }, 600);

        const guidance = document.getElementById('mission-guidance');
        if (guidance) {
            guidance.innerText = "⚠️ 核心脫落！請重新對準並抓取";
            guidance.style.color = "#ff3d00";
        }
    }

    _celebrateDelivery() {
        this.isDelivered = true;
        this.isSecured = false;
        this.currentPhase = 3; // DELIVERED
        this.reactorCore.position.set(0.75, 0.32, 0.75);

        this.audio.playSuccess();
        this.endEffector.getWorldPosition(POOL.v1);
        this.fx.triggerShake(0.08, 0.35);
        this.fx.triggerBurst(POOL.v1, 0x00ff66);

        // 計算分數與評級
        const elapsedSec = (Date.now() - this.startTime) / 1000;
        const score = Math.max(10, Math.round(1000 - elapsedSec * 15 - this.errorCount * 120));
        const rank = score >= 850 ? 'S' : score >= 650 ? 'A' : 'B';

        // 儲存本地高分
        const bestScore = parseInt(localStorage.getItem('beyond_best_score') || '0', 10);
        const isNewRecord = score > bestScore;
        if (isNewRecord) localStorage.setItem('beyond_best_score', score.toString());

        // 結算彈窗渲染
        const scoreModal = document.getElementById('success-screen');
        if (scoreModal) {
            document.getElementById('final-time').innerText = elapsedSec.toFixed(1);
            document.getElementById('final-score').innerText = score;
            document.getElementById('final-rank').innerText = rank;
            document.getElementById('new-record-badge').style.display = isNewRecord ? 'inline-block' : 'none';
            scoreModal.style.display = 'block';
        }
    }

    update(dt, targetPos) {
        this.endEffector.getWorldPosition(POOL.v1);

        // 掉落物理彈跳模擬 (當核心脫離手心且未就位時)
        if (!this.isSecured && !this.isDelivered && this.reactorCore.position.y > 0.3) {
            this.dropVelocityY -= 9.8 * dt;
            this.reactorCore.position.y += this.dropVelocityY * dt;
            if (this.reactorCore.position.y <= 0.3) {
                this.reactorCore.position.y = 0.3;
                this.dropVelocityY = 0;
            }
        }

        // 階段流程與引導
        const progressEl = document.getElementById('phase-progress-bar');
        const guidanceEl = document.getElementById('mission-guidance');

        if (!this.isSecured && !this.isDelivered) {
            const distToCore = POOL.v1.distanceTo(this.reactorCore.position);
            this.audio.updateTension(distToCore);

            if (distToCore > 0.45) {
                this.currentPhase = 0;
                if (guidanceEl) { guidanceEl.innerText = "🎯 移向前方發光核心"; guidanceEl.style.color = "#00e5ff"; }
            } else {
                this.currentPhase = 1;
                if (guidanceEl) { guidanceEl.innerText = "🟢 按下 GRIP 抓取！"; guidanceEl.style.color = "#00ff66"; }
                targetPos.lerp(this.reactorCore.position, 6.0 * dt); // 磁吸輔助
            }
        } else if (this.isSecured) {
            this.reactorCore.position.lerp(POOL.v1, 14.0 * dt);
            const distToSocket = POOL.v1.distanceTo(this.reactorSocket.position);
            this.audio.updateTension(distToSocket);

            if (distToSocket > 0.35) {
                if (guidanceEl) { guidanceEl.innerText = "➡️ 移動至右側光圈槽位"; guidanceEl.style.color = "#ff9100"; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = "✅ 釋放 GRIP 完成安裝！"; guidanceEl.style.color = "#00ff66"; }
            }

            if (distToSocket < 0.32) {
                targetPos.lerp(this.reactorSocket.position, 5.0 * dt);
            }
        }

        // 更新進度條百分比 (0%, 33%, 66%, 100%)
        if (progressEl) {
            const pct = (this.currentPhase / 3) * 100;
            progressEl.style.width = `${Math.max(10, pct)}%`;
        }
    }
}
