import { POOL } from '../core/Pool.js';

export class MissionManager {
    constructor(endEffector, reactorCore, reactorSocket, audio) {
        this.endEffector = endEffector;
        this.reactorCore = reactorCore;
        this.reactorSocket = reactorSocket;
        this.audio = audio;
        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;
    }

    toggleGrip() {
        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(POOL.v1);
        const dist = POOL.v1.distanceTo(this.reactorCore.position);

        if (!this.clawOpen && dist < 0.42 && !this.isDelivered) {
            this.isSecured = true;
            document.getElementById('status-tag').innerText = "CORE SECURED";
            document.getElementById('status-tag').style.background = "rgba(0, 229, 255, 0.25)";
            document.getElementById('mission-text').innerText = "很好！將反應爐移動到右側發光槽位安裝。";
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = POOL.v1.distanceTo(this.reactorSocket.position);
            if (socketDist < 0.35) {
                this.isDelivered = true;
                this.isSecured = false;
                this.reactorCore.position.set(0.75, 0.32, 0.75);
                this.audio.playSuccess();
                document.getElementById('status-tag').innerText = "MISSION COMPLETE 🎉";
                document.getElementById('status-tag').style.background = "rgba(0, 255, 100, 0.2)";
                document.getElementById('status-tag').style.borderColor = "#00ff66";
                document.getElementById('mission-text').innerText = "史塔克實驗室能源已滿載！任務完成！";
            } else {
                this.isSecured = false;
                document.getElementById('status-tag').innerText = "CORE RELEASED";
            }
        }
    }

    update(dt, targetPos) {
        this.endEffector.getWorldPosition(POOL.v1);

        if (!this.isSecured && !this.isDelivered) {
            // 磁吸引力 (未抓取時)
            const distToCore = POOL.v1.distanceTo(this.reactorCore.position);
            if (distToCore < 0.38) {
                targetPos.lerp(this.reactorCore.position, 6.0 * dt);
            }
        } else if (this.isSecured) {
            // 物理跟隨末端
            this.reactorCore.position.lerp(POOL.v1, 14.0 * dt);
            if (POOL.v1.distanceTo(this.reactorSocket.position) < 0.32) {
                targetPos.lerp(this.reactorSocket.position, 5.0 * dt);
            }
        }
    }
}
