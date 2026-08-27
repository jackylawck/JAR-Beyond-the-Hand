import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor(mode = 'kid') {
        this.lx = 0; this.ly = 0; // 左搖桿：水平前後左右
        this.rx = 0; this.ry = 0; // 右搖桿：上下升降 + 旋轉微調

        this.keys = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._keySmooth = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._smoothLambda = 12.0;

        // 🌟 1. 模式化動力學配置 (Speed / Accel / Profile)
        const speedMap = {
            kid:      { maxSpeed: 1.2, elevationSpeed: 1.0, responseAlpha: 14.0, maxAccel: 5.0, rotSpeed: 1.8 },
            advanced: { maxSpeed: 1.8, elevationSpeed: 1.5, responseAlpha: 18.0, maxAccel: 8.0, rotSpeed: 2.4 },
            research: { maxSpeed: 2.4, elevationSpeed: 2.0, responseAlpha: 22.0, maxAccel: 12.0, rotSpeed: 3.0 }
        };
        this.config = speedMap[mode] || speedMap.advanced;

        // 🌟 2. 真實物理速度與旋轉慣性緩存 (Zero-GC)
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

    /**
     * 🌟 雙段式非線性手感曲線 (Dual-Zone Curve)
     * 微操區 (<30%) 極致細膩，巡航區 (>30%) 敏捷靈敏
     */
    _applyDualZoneCurve(inputMag) {
        if (inputMag <= 0.001) return 0;
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

        // 鍵盤平滑濾波
        const alpha = 1.0 - Math.exp(-this._smoothLambda * safeDt);
        for (const k of ['w', 'a', 's', 'd', 'q', 'e']) {
            this._keySmooth[k] += (this.keys[k] - this._keySmooth[k]) * alpha;
            if (Math.abs(this._keySmooth[k]) < 0.001) this._keySmooth[k] = 0;
        }

        // 相機水平前向與右向投影 (鎖定在 X-Z 水平地面)
        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        // -------------------------------------------------------------
        // 🌟 A. 水平期望速度計算 (雙段式曲線，單位: m/s)
        // -------------------------------------------------------------
        const joyMagL = Math.hypot(this.lx, this.ly);
        const joyWeightL = Math.min(1.0, joyMagL * 2.5);
        const keyWeightL = 1.0 - joyWeightL;

        const rawMoveX = this.lx * joyWeightL + (this._keySmooth.d - this._keySmooth.a) * keyWeightL;
        const rawMoveY = this.ly * joyWeightL + (this._keySmooth.s - this._keySmooth.w) * keyWeightL;

        const inputMagL = Math.hypot(rawMoveX, rawMoveY);
        let targetVx = 0;
        let targetVz = 0;

        if (inputMagL > 0.001) {
            const curvedMag = this._applyDualZoneCurve(Math.min(1.0, inputMagL));
            const scale = (curvedMag / inputMagL) * this.config.maxSpeed;
            targetVx = (POOL.forward.x * (-rawMoveY) + POOL.right.x * rawMoveX) * scale;
            targetVz = (POOL.forward.z * (-rawMoveY) + POOL.right.z * rawMoveX) * scale;
        }

        // -------------------------------------------------------------
        // 🌟 B. 垂直升降期望速度計算 (Y 軸，單位: m/s)
        // -------------------------------------------------------------
        const joyMagR = Math.hypot(this.rx, this.ry);
        const joyWeightR = Math.min(1.0, joyMagR * 2.5);
        const keyWeightR = 1.0 - joyWeightR;

        const rawElev = (-this.ry) * joyWeightR + (this._keySmooth.e - this._keySmooth.q) * keyWeightR;
        let targetVy = 0;

        if (Math.abs(rawElev) > 0.001) {
            const curvedElev = Math.sign(rawElev) * this._applyDualZoneCurve(Math.min(1.0, Math.abs(rawElev)));
            targetVy = curvedElev * this.config.elevationSpeed;
        }

        // -------------------------------------------------------------
        // 🌟 C. 物理速度阻尼與最大加速度限幅 (Velocity Damping & Accel Clamping)
        // -------------------------------------------------------------
        const blendFactor = 1.0 - Math.exp(-this.config.responseAlpha * safeDt);
        const maxDeltaV = this.config.maxAccel * safeDt;

        // X 軸平滑
        let deltaVx = (targetVx - this._currentVel.x) * blendFactor;
        deltaVx = Math.max(-maxDeltaV, Math.min(maxDeltaV, deltaVx));
        this._currentVel.x += deltaVx;

        // Z 軸平滑
        let deltaVz = (targetVz - this._currentVel.z) * blendFactor;
        deltaVz = Math.max(-maxDeltaV, Math.min(maxDeltaV, deltaVz));
        this._currentVel.z += deltaVz;

        // Y 軸平滑
        let deltaVy = (targetVy - this._currentVel.y) * blendFactor;
        deltaVy = Math.max(-maxDeltaV, Math.min(maxDeltaV, deltaVy));
        this._currentVel.y += deltaVy;

        // 速度數值積分為位移
        targetPos.x += this._currentVel.x * safeDt;
        targetPos.y += this._currentVel.y * safeDt;
        targetPos.z += this._currentVel.z * safeDt;

        // -------------------------------------------------------------
        // 🌟 D. 右搖桿 X 軸：環繞基座旋轉微調 (慣性平滑版)
        // -------------------------------------------------------------
        if (Math.abs(this.rx) > 0.03) {
            const targetRotVel = -this.rx * this.config.rotSpeed;
            this._currentRotVel += (targetRotVel - this._currentRotVel) * blendFactor;
        } else {
            // 自然慣性滑行減速
            this._currentRotVel *= Math.exp(-12.0 * safeDt);
        }

        if (Math.abs(this._currentRotVel) > 0.001) {
            const rotAngle = this._currentRotVel * safeDt;
            const cosA = Math.cos(rotAngle);
            const sinA = Math.sin(rotAngle);
            const nx = targetPos.x * cosA - targetPos.z * sinA;
            const nz = targetPos.x * sinA + targetPos.z * cosA;
            targetPos.x = nx;
            targetPos.z = nz;
        }

        // -------------------------------------------------------------
        // 🌟 E. 柔性彈簧軟邊界 + 彈性回彈 (Elastic Bounce) + 硬限位
        // -------------------------------------------------------------
        const softRadius = 1.65;
        const maxRadius = 1.95;
        const minRadius = 0.18; // 🌟 放寬至 0.18m，支援極致近身收折
        const radius = Math.hypot(targetPos.x, targetPos.z);

        // 外圈軟邊界彈簧力 + 彈性回彈衰減
        if (radius > softRadius && radius <= maxRadius) {
            const push = (radius - softRadius) / (maxRadius - softRadius);
            const springFactor = 1.0 - push * 0.14 * (safeDt / 0.016);
            targetPos.x *= springFactor;
            targetPos.z *= springFactor;

            // 🌟 計算徑向動量：若正向外衝，則施加柔性反向回彈力
            const radialV = (this._currentVel.x * targetPos.x + this._currentVel.z * targetPos.z) / radius;
            if (radialV > 0.01) {
                const bounceFactor = 0.65 * (1.0 - push);
                this._currentVel.x -= (targetPos.x / radius) * radialV * bounceFactor;
                this._currentVel.z -= (targetPos.z / radius) * radialV * bounceFactor;
            }
        }

        // 外圈物理硬限位
        if (radius > maxRadius) {
            targetPos.x = (targetPos.x / radius) * maxRadius;
            targetPos.z = (targetPos.z / radius) * maxRadius;
            this._currentVel.x = 0;
            this._currentVel.z = 0;
        }

        // 內圈基座防自穿限位 (放寬至 0.18m)
        if (radius < minRadius) {
            targetPos.x = (targetPos.x / (radius || 1)) * minRadius;
            targetPos.z = (targetPos.z / (radius || 1)) * minRadius;
            this._currentVel.x = 0;
            this._currentVel.z = 0;
        }

        // 🌟 垂直高度工作包絡線：最低放寬至 0.06m，確保能精準貼地夾取草莓
        targetPos.y = Math.max(0.06, Math.min(1.65, targetPos.y));
    }

    destroy() {
        if (this._keydownHandler) window.removeEventListener('keydown', this._keydownHandler);
        if (this._keyupHandler) window.removeEventListener('keyup', this._keyupHandler);
    }
}
