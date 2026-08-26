import { POOL } from '../core/Pool.js';

export class InputMapper {
    constructor() {
        // 虛擬雙搖桿輸入
        this.lx = 0; this.ly = 0;
        this.rx = 0; this.ry = 0;

        // 鍵盤輸入與時間衰減平滑狀態
        this.keys = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._keySmooth = { w: 0, a: 0, s: 0, d: 0, q: 0, e: 0 };
        this._smoothLambda = 14.0; // 物理平滑響應頻率 (Hz)

        // 3A 級速度曲線配置
        this.config = {
            curve: 1.8,          // 非線性手感指數
            maxSpeed: 2.6        // 最大平移速度 (m/s)
        };

        this._keydownHandler = null;
        this._keyupHandler = null;

        this._bindKeyboard();
    }

    _bindKeyboard() {
        this._keydownHandler = (e) => {
            const k = e.key.toLowerCase();
            if (this.keys[k] !== undefined) {
                if (['w', 'a', 's', 'd', 'q', 'e', ' '].includes(k)) {
                    e.preventDefault();
                }
                this.keys[k] = 1;
            }
        };

        this._keyupHandler = (e) => {
            const k = e.key.toLowerCase();
            if (this.keys[k] !== undefined) {
                this.keys[k] = 0;
            }
        };

        window.addEventListener('keydown', this._keydownHandler);
        window.addEventListener('keyup', this._keyupHandler);
    }

    setTranslation(x, y) { this.lx = x; this.ly = y; }
    setRotation(x, y) { this.rx = x; this.ry = y; }

    getIntensity() {
        const joystickInt = Math.hypot(this.lx, this.ly, this.rx, this.ry);
        const keyInt = Math.hypot(
            this._keySmooth.d - this._keySmooth.a,
            this._keySmooth.s - this._keySmooth.w,
            this._keySmooth.e - this._keySmooth.q
        );
        return Math.min(1.0, Math.max(joystickInt, keyInt));
    }

    update(targetPos, dt, camera) {
        const safeDt = Math.max(0.001, Math.min(0.05, dt));

        // 1. 基於真實時間 dt 的物理指數濾波
        const alpha = 1.0 - Math.exp(-this._smoothLambda * safeDt);
        for (const k of ['w', 'a', 's', 'd', 'q', 'e']) {
            this._keySmooth[k] += (this.keys[k] - this._keySmooth[k]) * alpha;
            if (Math.abs(this._keySmooth[k]) < 0.001) this._keySmooth[k] = 0;
        }

        // 2. 視角相對方向向量計算 (Zero-GC)
        camera.getWorldDirection(POOL.forward);
        POOL.forward.y = 0;
        POOL.forward.normalize();
        POOL.right.crossVectors(POOL.forward, camera.up).normalize().negate();

        // 3. 加權混合（搖桿與鍵盤平滑融合，杜絕跳變）
        const joyMagnitude = Math.hypot(this.lx, this.ly);
        const joyWeight = Math.min(1.0, joyMagnitude * 2.5);
        const keyWeight = 1.0 - joyWeight;

        const rawX = this.lx * joyWeight + (this._keySmooth.d - this._keySmooth.a) * keyWeight;
        const rawY = this.ly * joyWeight + (this._keySmooth.s - this._keySmooth.w) * keyWeight;

        const joyElevMag = Math.abs(this.ry);
        const joyElevWeight = Math.min(1.0, joyElevMag * 2.5);
        const keyElevWeight = 1.0 - joyElevWeight;
        const rawElev = this.ry * joyElevWeight + (this._keySmooth.e - this._keySmooth.q) * keyElevWeight;

        // 4. 非線性手感響應曲線 (微幅精確對位，大幅度快速平移)
        const inputMag = Math.hypot(rawX, rawY);
        let finalMoveSpeed = this.config.maxSpeed * safeDt;

        if (inputMag > 0.001) {
            const curvedMag = Math.pow(Math.min(1.0, inputMag), this.config.curve);
            const scale = curvedMag / inputMag;
            const finalX = rawX * scale;
            const finalY = rawY * scale;

            POOL.v1.copy(POOL.forward).multiplyScalar(-finalY * finalMoveSpeed);
            POOL.v2.copy(POOL.right).multiplyScalar(finalX * finalMoveSpeed);
            targetPos.add(POOL.v1).add(POOL.v2);
        }

        // 5. 垂直升降非線性映射
        if (Math.abs(rawElev) > 0.001) {
            const curvedElev = Math.sign(rawElev) * Math.pow(Math.min(1.0, Math.abs(rawElev)), this.config.curve);
            targetPos.y -= curvedElev * finalMoveSpeed;
        }

        // 6. 工作空間外半徑邊界防護
        targetPos.y = Math.max(0.18, Math.min(2.2, targetPos.y));

        const radius = Math.hypot(targetPos.x, targetPos.z);
        if (radius > 2.2) {
            targetPos.x = (targetPos.x / radius) * 2.2;
            targetPos.z = (targetPos.z / radius) * 2.2;
        }
    }

    destroy() {
        if (this._keydownHandler) {
            window.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
        if (this._keyupHandler) {
            window.removeEventListener('keyup', this._keyupHandler);
            this._keyupHandler = null;
        }
        this.lx = 0; this.ly = 0;
        this.rx = 0; this.ry = 0;
        for (const k of ['w', 'a', 's', 'd', 'q', 'e']) {
            this.keys[k] = 0;
            this._keySmooth[k] = 0;
        }
    }
}
