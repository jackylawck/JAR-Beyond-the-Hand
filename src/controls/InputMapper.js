import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor() {
        this.lx = 0; this.ly = 0;
        this.rx = 0; this.ry = 0;

        this.keys = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._keySmooth = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._smoothLambda = 12.0;

        this.config = {
            maxSpeed: 1.8,
            curve: 1.6
        };

        this._keydownHandler = null;
        this._keyupHandler = null;
        this._bindKeyboard();
    }

    _bindKeyboard() {
        this._keydownHandler = (e) => {
            const k = e.key.toLowerCase();
            if (this.keys[k] !== undefined) {
                if (['w', 'a', 's', 'd', 'q', 'e', ' '].includes(k)) e.preventDefault();
                this.keys[k] = 1;
            }
        };
        this._keyupHandler = (e) => {
            const k = e.key.toLowerCase();
            if (this.keys[k] !== undefined) this.keys[k] = 0;
        };
        window.addEventListener('keydown', this._keydownHandler);
        window.addEventListener('keyup', this._keyupHandler);
    }

    setTranslation(x, y) { this.lx = x; this.ly = y; }
    setRotation(x, y) { this.rx = x; this.ry = y; }

    getIntensity() {
        const joy = Math.hypot(this.lx, this.ly, this.rx, this.ry);
        const key = Math.hypot(
            this._keySmooth.d - this._keySmooth.a,
            this._keySmooth.s - this._keySmooth.w,
            this._keySmooth.e - this._keySmooth.q
        );
        return Math.min(1.0, Math.max(joy, key));
    }

    update(targetPos, dt, camera) {
        const safeDt = Math.max(0.001, Math.min(0.04, dt));

        const alpha = 1.0 - Math.exp(-this._smoothLambda * safeDt);
        for (const k of ['w', 'a', 's', 'd', 'q', 'e']) {
            this._keySmooth[k] += (this.keys[k] - this._keySmooth[k]) * alpha;
            if (Math.abs(this._keySmooth[k]) < 0.001) this._keySmooth[k] = 0;
        }

        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        const joyMag = Math.hypot(this.lx, this.ly);
        const joyWeight = Math.min(1.0, joyMag * 2.5);
        const keyWeight = 1.0 - joyWeight;

        const rawX = this.lx * joyWeight + (this._keySmooth.d - this._keySmooth.a) * keyWeight;
        const rawY = this.ly * joyWeight + (this._keySmooth.s - this._keySmooth.w) * keyWeight;
        const rawElev = this.ry * joyWeight + (this._keySmooth.e - this._keySmooth.q) * keyWeight;

        const inputMag = Math.hypot(rawX, rawY);
        const moveSpeed = this.config.maxSpeed * safeDt;

        if (inputMag > 0.001) {
            const curvedMag = Math.pow(Math.min(1.0, inputMag), this.config.curve);
            const scale = curvedMag / inputMag;
            POOL.v1.copy(POOL.forward).multiplyScalar(-rawY * scale * moveSpeed);
            POOL.v2.copy(POOL.right).multiplyScalar(rawX * scale * moveSpeed);
            targetPos.add(POOL.v1).add(POOL.v2);
        }

        if (Math.abs(rawElev) > 0.001) {
            const curvedElev = Math.sign(rawElev) * Math.pow(Math.min(1.0, Math.abs(rawElev)), this.config.curve);
            targetPos.y -= curvedElev * moveSpeed;
        }

        // 工作空間安全範圍
        targetPos.y = Math.max(0.20, Math.min(1.60, targetPos.y));
        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > 1.85) {
            targetPos.x = (targetPos.x / radius) * 1.85;
            targetPos.z = (targetPos.z / radius) * 1.85;
        } else if (radius < 0.35) {
            targetPos.x = (targetPos.x / (radius || 1)) * 0.35;
            targetPos.z = (targetPos.z / (radius || 1)) * 0.35;
        }
    }

    destroy() {
        if (this._keydownHandler) window.removeEventListener('keydown', this._keydownHandler);
        if (this._keyupHandler) window.removeEventListener('keyup', this._keyupHandler);
    }
}
