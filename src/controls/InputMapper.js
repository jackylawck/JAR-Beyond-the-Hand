import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor() {
        this.lx = 0; this.ly = 0;
        this.rx = 0; this.ry = 0;

        // 🌟 鍵盤狀態映射
        this.keys = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._bindKeyboard();
    }

    _bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (this.keys[k] !== undefined) this.keys[k] = 1;
        });
        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (this.keys[k] !== undefined) this.keys[k] = 0;
        });
    }

    setTranslation(x, y) { this.lx = x; this.ly = y; }
    setRotation(x, y) { this.rx = x; this.ry = y; }

    getIntensity() {
        // 合併虛擬搖桿與鍵盤強度
        const keyInt = Math.max(this.keys.w, this.keys.a, this.keys.s, this.keys.d, this.keys.q, this.keys.e);
        return Math.max(Math.hypot(this.lx, this.ly, this.rx, this.ry), keyInt);
    }

    update(targetPos, dt, camera) {
        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        const moveSpeed = 2.4 * dt;

        // 🌟 合併搖桿與鍵盤輸入 (W/S 前後, A/D 左右)
        const finalLx = this.lx + (this.keys.d - this.keys.a);
        const finalLy = this.ly + (this.keys.s - this.keys.w);
        
        POOL.v1.copy(POOL.forward).multiplyScalar(-finalLy * moveSpeed);
        POOL.v2.copy(POOL.right).multiplyScalar(finalLx * moveSpeed);
        targetPos.add(POOL.v1).add(POOL.v2);

        // 🌟 合併右搖桿與 Q/E 鍵盤輸入 (垂直升降)
        const finalRy = this.ry + (this.keys.e - this.keys.q);
        targetPos.y -= finalRy * moveSpeed;

        targetPos.y = Math.max(0.18, Math.min(2.2, targetPos.y));

        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > 2.2) {
            targetPos.x = (targetPos.x / radius) * 2.2;
            targetPos.z = (targetPos.z / radius) * 2.2;
        } else if (radius < 0.35) {
            targetPos.x = (targetPos.x / (radius || 1)) * 0.35;
            targetPos.z = (targetPos.z / (radius || 1)) * 0.35;
        }
    }
}
