import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor() {
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
        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        const moveSpeed = 1.9 * dt;
        POOL.v1.copy(POOL.forward).multiplyScalar(-this.ly * moveSpeed);
        POOL.v2.copy(POOL.right).multiplyScalar(this.lx * moveSpeed);
        targetPos.add(POOL.v1).add(POOL.v2);
        targetPos.y -= this.ry * moveSpeed;

        if (targetPos.y < 0.32) targetPos.y = 0.32;
        if (targetPos.y > 2.6) targetPos.y = 2.6;
        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > 2.2) {
            targetPos.x = (targetPos.x / radius) * 2.2;
            targetPos.z = (targetPos.z / radius) * 2.2;
        }
    }
}
