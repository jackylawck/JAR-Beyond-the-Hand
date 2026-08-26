import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor() {
        this.lx = 0; this.ly = 0;
        this.rx = 0; this.ry = 0;
    }

    setTranslation(x, y) { this.lx = x; this.ly = y; }
    setRotation(x, y) { this.rx = x; this.ry = y; }

    getIntensity() {
        return Math.hypot(this.lx, this.ly, this.rx, this.ry);
    }

    update(targetPos, dt, camera) {
        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        const moveSpeed = 2.2 * dt;
        // 左搖桿：平面伸縮與平移
        POOL.v1.copy(POOL.forward).multiplyScalar(-this.ly * moveSpeed);
        POOL.v2.copy(POOL.right).multiplyScalar(this.lx * moveSpeed);
        targetPos.add(POOL.v1).add(POOL.v2);

        // 右搖桿：垂直升降伸縮
        targetPos.y -= this.ry * moveSpeed;

        // 解鎖更大伸縮範圍 (半徑 0.4m ~ 2.4m, 高度 0.15m ~ 2.8m)
        targetPos.y = Math.max(0.15, Math.min(2.8, targetPos.y));
        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > 2.4) {
            targetPos.x = (targetPos.x / radius) * 2.4;
            targetPos.z = (targetPos.z / radius) * 2.4;
        } else if (radius < 0.3) {
            targetPos.x = (targetPos.x / (radius || 1)) * 0.3;
            targetPos.z = (targetPos.z / (radius || 1)) * 0.3;
        }
    }
}
