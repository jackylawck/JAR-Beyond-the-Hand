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

        const moveSpeed = 2.4 * dt;

        // 左搖桿：控制水平平移與前後伸縮
        POOL.v1.copy(POOL.forward).multiplyScalar(-this.ly * moveSpeed);
        POOL.v2.copy(POOL.right).multiplyScalar(this.lx * moveSpeed);
        targetPos.add(POOL.v1).add(POOL.v2);

        // 右搖桿：控制垂直升降
        targetPos.y -= this.ry * moveSpeed;

        // 限制在可到達的物理空間 (貼近地面 0.18m 到 高處 2.2m)
        targetPos.y = Math.max(0.18, Math.min(2.2, targetPos.y));

        // 伸縮半徑 (最小 0.35m，最大 2.2m)
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
