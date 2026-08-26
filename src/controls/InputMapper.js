import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor(config) {
        this.config = config;
        this.lx = 0;
        this.ly = 0;
        this.rx = 0;
        this.ry = 0;
    }

    setTranslation(x, y) {
        this.lx = x;
        this.ly = y;
    }

    setRotation(x, y) {
        this.rx = x;
        this.ry = y;
    }

    getIntensity() {
        return Math.hypot(this.lx, this.ly, this.rx, this.ry);
    }

    update(targetPos, dt, camera) {
        const moveSpeed = this.config.get('moveSpeed') * dt;

        // 計算相機水平 Forward 與 Right 向量
        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        // 相機視角相對平移
        POOL.v1.copy(POOL.forward).multiplyScalar(-this.ly * moveSpeed);
        POOL.v2.copy(POOL.right).multiplyScalar(this.lx * moveSpeed);
        targetPos.add(POOL.v1).add(POOL.v2);
        targetPos.y -= this.ry * moveSpeed;

        // 工作空間邊界限制
        const ws = this.config.get('workspace');
        targetPos.y = Math.max(ws.yMin, Math.min(ws.yMax, targetPos.y));

        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > ws.radius) {
            targetPos.x = (targetPos.x / radius) * ws.radius;
            targetPos.z = (targetPos.z / radius) * ws.radius;
        }
    }
}
