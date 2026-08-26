import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor(config) {
        this.config = config;
        this.rawLx = 0; this.rawLy = 0;
        this.rawRx = 0; this.rawRy = 0;
        this.smoothVx = 0;
        this.smoothVz = 0;
        this.smoothVy = 0;
        this.isPayloadLoaded = false;
    }

    setTranslation(x, y) { this.rawLx = x; this.rawLy = y; }
    setRotation(x, y) { this.rawRx = x; this.rawRy = y; }
    setPayload(loaded) { this.isPayloadLoaded = loaded; }

    getIntensity() {
        return Math.hypot(this.smoothVx, this.smoothVz, this.smoothVy);
    }

    update(targetPos, dt, camera) {
        const payloadFactor = this.isPayloadLoaded ? 0.7 : 1.0;
        const maxSpeed = this.config.get('moveSpeed') * payloadFactor;
        const inertiaAlpha = this.isPayloadLoaded ? 0.12 : 0.22;

        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        const targetVx = (-this.rawLy * POOL.forward.x + this.rawLx * POOL.right.x) * maxSpeed;
        const targetVz = (-this.rawLy * POOL.forward.z + this.rawLx * POOL.right.z) * maxSpeed;
        const targetVy = -this.rawRy * maxSpeed;

        this.smoothVx += (targetVx - this.smoothVx) * inertiaAlpha;
        this.smoothVz += (targetVz - this.smoothVz) * inertiaAlpha;
        this.smoothVy += (targetVy - this.smoothVy) * inertiaAlpha;

        targetPos.x += this.smoothVx * dt;
        targetPos.z += this.smoothVz * dt;
        targetPos.y += this.smoothVy * dt;

        const ws = this.config.get('workspace');
        targetPos.y = Math.max(ws.yMin, Math.min(ws.yMax, targetPos.y));

        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > ws.radius) {
            targetPos.x = (targetPos.x / radius) * ws.radius;
            targetPos.z = (targetPos.z / radius) * ws.radius;
        }
    }
}
