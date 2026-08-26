import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor(config) {
        this.config = config;
        this.rawLx = 0; this.rawLy = 0;
        this.rawRx = 0; this.rawRy = 0;

        // 慣性平滑速度向量 (Zero-GC)
        this.smoothVx = 0;
        this.smoothVz = 0;
        this.smoothVy = 0;

        this.isPayloadLoaded = false; // 是否負載
    }

    setTranslation(x, y) { this.rawLx = x; this.rawLy = y; }
    setRotation(x, y) { this.rawRx = x; this.rawRy = y; }
    setPayload(loaded) { this.isPayloadLoaded = loaded; }

    getIntensity() {
        return Math.hypot(this.smoothVx, this.smoothVz, this.smoothVy);
    }

    update(targetPos, dt, camera) {
        // 負載時最高速度下降 30%，慣性係數增大
        const payloadFactor = this.isPayloadLoaded ? 0.7 : 1.0;
        const maxSpeed = this.config.get('moveSpeed') * payloadFactor;
        const inertiaAlpha = this.isPayloadLoaded ? 0.12 : 0.22; // 響應靈敏度

        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        // 目標期望速度
        const targetVx = (-this.rawLy * POOL.forward.x + this.rawLx * POOL.right.x) * maxSpeed;
        const targetVz = (-this.rawLy * POOL.forward.z + this.rawLx * POOL.right.z) * maxSpeed;
        const targetVy = -this.rawRy * maxSpeed;

        // 一階慣性平滑 (模擬機械臂質量與馬達加速度)
        this.smoothVx += (targetVx - this.smoothVx) * inertiaAlpha;
        this.smoothVz += (targetVz - this.smoothVz) * inertiaAlpha;
        this.smoothVy += (targetVy - this.smoothVy) * inertiaAlpha;

        targetPos.x += this.smoothVx * dt;
        targetPos.z += this.smoothVz * dt;
        targetPos.y += this.smoothVy * dt;

        // 工作空間軟邊界防護
        const ws = this.config.get('workspace');
        targetPos.y = Math.max(ws.yMin, Math.min(ws.yMax, targetPos.y));

        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > ws.radius) {
            targetPos.x = (targetPos.x / radius) * ws.radius;
            targetPos.z = (targetPos.z / radius) * ws.radius;
        }
    }
}
