import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor(mode = 'kid') {
        this.mode = mode;
        this.lx = 0; this.ly = 0;
        this.rx = 0; this.ry = 0;

        this.keys = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._keySmooth = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._smoothLambda = 12.0;

        // 🌟 動力學配置矩陣：科研模式啟用純線性確定性映射 (Deterministic Input)
        const speedMap = {
            kid:      { maxSpeed: 1.2, elevationSpeed: 1.0, responseAlpha: 14.0, maxAccel: 5.0,  rotSpeed: 1.8, isLinear: false },
            advanced: { maxSpeed: 1.8, elevationSpeed: 1.5, responseAlpha: 18.0, maxAccel: 8.0,  rotSpeed: 2.4, isLinear: false },
            research: { maxSpeed: 2.0, elevationSpeed: 1.6, responseAlpha: 999.0, maxAccel: 999.0, rotSpeed: 2.0, isLinear: true  } // 🌟 科研級：瞬時線性無延遲
        };
        this.config = speedMap[mode] || speedMap.advanced;

        this._currentVel = { x: 0, y: 0, z: 0 };
        this._currentRotVel = 0;

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

    _applyCurve(inputMag) {
        if (inputMag <= 0.001) return 0;
        // 🌟 科研模式：1:1 純線性輸出
        if (this.config.isLinear) return inputMag;

        // 遊戲模式：雙段式非線性手感曲線
        const smallZone = 0.30;
        if (inputMag < smallZone) {
            const t = inputMag / smallZone;
            return smallZone * Math.pow(t, 2.2);
        } else {
            const t = (inputMag - smallZone) / (1.0 - smallZone);
            return smallZone + (1.0 - smallZone) * Math.pow(t, 1.35);
        }
    }

    update(targetPos, dt, camera) {
        const safeDt = Math.max(0.001, Math.min(0.04, dt || 0.016));

        // 鍵盤平滑
        const alpha = this.config.isLinear ? 1.0 : (1.0 - Math.exp(-this._smoothLambda * safeDt));
        for (const k of ['w', 'a', 's', 'd', 'q', 'e']) {
            this._keySmooth[k] += (this.keys[k] - this._keySmooth[k]) * alpha;
            if (Math.abs(this._keySmooth[k]) < 0.001) this._keySmooth[k] = 0;
        }

        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        // 1. 水平速度
        const joyMagL = Math.hypot(this.lx, this.ly);
        const joyWeightL = this.config.isLinear ? (joyMagL > 0 ? 1 : 0) : Math.min(1.0, joyMagL * 2.5);
        const keyWeightL = 1.0 - joyWeightL;

        const rawMoveX = this.lx * joyWeightL + (this._keySmooth.d - this._keySmooth.a) * keyWeightL;
        const rawMoveY = this.ly * joyWeightL + (this._keySmooth.s - this._keySmooth.w) * keyWeightL;
        const inputMagL = Math.hypot(rawMoveX, rawMoveY);

        let targetVx = 0, targetVz = 0;
        if (inputMagL > 0.001) {
            const curvedMag = this._applyCurve(Math.min(1.0, inputMagL));
            const scale = (curvedMag / inputMagL) * this.config.maxSpeed;
            targetVx = (POOL.forward.x * (-rawMoveY) + POOL.right.x * rawMoveX) * scale;
            targetVz = (POOL.forward.z * (-rawMoveY) + POOL.right.z * rawMoveX) * scale;
        }

        // 2. 垂直升降速度
        const joyMagR = Math.hypot(this.rx, this.ry);
        const joyWeightR = this.config.isLinear ? (joyMagR > 0 ? 1 : 0) : Math.min(1.0, joyMagR * 2.5);
        const keyWeightR = 1.0 - joyWeightR;

        const rawElev = (-this.ry) * joyWeightR + (this._keySmooth.e - this._keySmooth.q) * keyWeightR;
        let targetVy = 0;
        if (Math.abs(rawElev) > 0.001) {
            const curvedElev = Math.sign(rawElev) * this._applyCurve(Math.min(1.0, Math.abs(rawElev)));
            targetVy = curvedElev * this.config.elevationSpeed;
        }

        // 3. 速度積分 (科研模式直接覆蓋，遊戲模式走阻尼)
        if (this.config.isLinear) {
            this._currentVel.x = targetVx;
            this._currentVel.y = targetVy;
            this._currentVel.z = targetVz;
        } else {
            const blendFactor = 1.0 - Math.exp(-this.config.responseAlpha * safeDt);
            const maxDeltaV = this.config.maxAccel * safeDt;

            let deltaVx = (targetVx - this._currentVel.x) * blendFactor;
            deltaVx = Math.max(-maxDeltaV, Math.min(maxDeltaV, deltaVx));
            this._currentVel.x += deltaVx;

            let deltaVz = (targetVz - this._currentVel.z) * blendFactor;
            deltaVz = Math.max(-maxDeltaV, Math.min(maxDeltaV, deltaVz));
            this._currentVel.z += deltaVz;

            let deltaVy = (targetVy - this._currentVel.y) * blendFactor;
            deltaVy = Math.max(-maxDeltaV, Math.min(maxDeltaV, deltaVy));
            this._currentVel.y += deltaVy;
        }

        targetPos.x += this._currentVel.x * safeDt;
        targetPos.y += this._currentVel.y * safeDt;
        targetPos.z += this._currentVel.z * safeDt;

        // 4. 右搖桿基座旋轉
        if (Math.abs(this.rx) > 0.03) {
            const rotAngle = -this.rx * this.config.rotSpeed * safeDt;
            const cosA = Math.cos(rotAngle);
            const sinA = Math.sin(rotAngle);
            const nx = targetPos.x * cosA - targetPos.z * sinA;
            const nz = targetPos.x * sinA + targetPos.z * cosA;
            targetPos.x = nx;
            targetPos.z = nz;
        }

        // 5. 工作空間限制
        const minRadius = 0.18;
        const maxRadius = 1.95;
        const radius = Math.hypot(targetPos.x, targetPos.z);

        if (radius > maxRadius) {
            targetPos.x = (targetPos.x / radius) * maxRadius;
            targetPos.z = (targetPos.z / radius) * maxRadius;
        }
        if (radius < minRadius) {
            targetPos.x = (targetPos.x / (radius || 1)) * minRadius;
            targetPos.z = (targetPos.z / (radius || 1)) * minRadius;
        }
        targetPos.y = Math.max(0.06, Math.min(1.65, targetPos.y));
    }

    destroy() {
        if (this._keydownHandler) window.removeEventListener('keydown', this._keydownHandler);
        if (this._keyupHandler) window.removeEventListener('keyup', this._keyupHandler);
    }
}
