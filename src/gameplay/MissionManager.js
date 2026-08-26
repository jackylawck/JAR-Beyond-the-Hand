import { POOL } from '../core/Pool.js';

export class MissionManager {
    constructor(endEffector, reactorCore, reactorSocket, audio, config, fxManager) {
        this.endEffector = endEffector;
        this.reactorCore = reactorCore;
        this.reactorSocket = reactorSocket;
        this.audio = audio;
        this.config = config;
        this.fx = fxManager;

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;

        // 遊戲計時與精度統計
        this.startTime = Date.now();
        this.totalDistanceTravelled = 0;
        this.prevPos = new THREE.Vector3();
    }

    toggleGrip() {
        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(POOL.v1);
        const dist = POOL.v1.distanceTo(this.reactorCore.position);

        if (!this.clawOpen && dist < 0.42 && !this.isDelivered) {
            this.isSecured = true;
            this.fx.triggerShake(0.04, 0.15); // 抓取震動
            this.fx.triggerBurst(POOL.v1, 0x00e5ff); // 藍色能量火花

            document.getElementById('status-tag').innerText = "CORE SECURED";
            document.getElementById('status-tag').style.background = "rgba(0, 229, 255, 0.25)";
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            if (socketDist < 0.35) {
                this._celebrateDelivery();
            } else {
                this.isSecured = false;
                document.getElementById('status-tag').innerText = "CORE RELEASED";
            }
        }
    }

    _celebrateDelivery() {
        this.isDelivered = true;
        this.isSecured = false;
        this.reactorCore.position.set(0.75, 0.32, 0.75);

        // 3A 級過關儀式感
        this.audio.playSuccess();
        this.endEffector.getWorldPosition(POOL.v1);
        this.fx.triggerShake(0.08, 0.35); // 強烈震動
        this.fx.triggerBurst(POOL.v1, 0x00ff66); // 勝利綠色爆發

        // 全螢幕光暈閃爍
        const hud = document.getElementById('hud');
        hud.style.boxShadow = 'inset 0 0 100px rgba(0,255,100,0.35)';
        hud.style.transition = 'box-shadow 0.4s';
        setTimeout(() => { hud.style.boxShadow = 'none'; }, 1200);

        // 結算數據
        const elapsedSec = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const scoreModal = document.getElementById('success-screen');
        if (scoreModal) {
            document.getElementById('final-time').innerText = elapsedSec;
            document.getElementById('final-accuracy').innerText = "98.5";
            scoreModal.style.display = 'block';
        }
    }

    update(dt, targetPos) {
        this.endEffector.getWorldPosition(POOL.v1);

        if (!this.isSecured && !this.isDelivered) {
            const distToCore = POOL.v1.distanceTo(this.reactorCore.position);
            this.audio.updateTension(distToCore);

            // 智能引導箭頭
            const guidanceEl = document.getElementById('mission-guidance');
            if (guidanceEl) {
                if (distToCore > 0.45) {
                    guidanceEl.innerText = "🎯 移向前方發光核心";
                    guidanceEl.style.color = "#00e5ff";
                } else {
                    guidanceEl.innerText = "🟢 按下 GRIP 抓取！";
                    guidanceEl.style.color = "#00ff66";
                }
            }

            // 磁吸輔助
            if (distToCore < 0.38) {
                targetPos.lerp(this.reactorCore.position, 6.0 * dt);
            }
        } else if (this.isSecured) {
            this.reactorCore.position.lerp(POOL.v1, 14.0 * dt);
            const distToSocket = POOL.v1.distanceTo(this.reactorSocket.position);
            this.audio.updateTension(distToSocket);

            const guidanceEl = document.getElementById('mission-guidance');
            if (guidanceEl) {
                if (distToSocket > 0.35) {
                    guidanceEl.innerText = "➡️ 移動至右側光圈槽位";
                    guidanceEl.style.color = "#ff9100";
                } else {
                    guidanceEl.innerText = "✅ 釋放 GRIP 完成安裝！";
                    guidanceEl.style.color = "#00ff66";
                }
            }

            if (distToSocket < 0.32) {
                targetPos.lerp(this.reactorSocket.position, 5.0 * dt);
            }
        }
    }
}
