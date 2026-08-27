export class JoystickManager {
    static init(onMove, onRotate, onGrip) {
        return new JoystickManagerInstance(onMove, onRotate, onGrip);
    }
}

class JoystickManagerInstance {
    constructor(onMove, onRotate, onGrip) {
        this.onMove = onMove;
        this.onRotate = onRotate;
        this.onGrip = onGrip;
        this.activePointers = { left: null, right: null };
        this._listeners = [];

        this._hapticState = {
            left: { passedDeadzone: false, reachedMax: false },
            right: { passedDeadzone: false, reachedMax: false }
        };

        this.config = {
            deadzone: 0.08,  // 8% 防誤觸死區
            curve: 1.8,     // 1.8 階指數手感曲線
            maxRadius: 1.0
        };

        this._setupJoystick('joy-left', 'knob-left', 'left', onMove);
        this._setupJoystick('joy-right', 'knob-right', 'right', onRotate);
        this._setupGripButton();
    }

    _setupJoystick(zoneId, knobId, id, callback) {
        const zone = document.getElementById(zoneId);
        const knob = document.getElementById(knobId);
        if (!zone || !knob) return;

        let active = false;

        const onPointerDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            active = true;
            this.activePointers[id] = e.pointerId;
            zone.setPointerCapture(e.pointerId);
            zone.classList.add('active');
            
            if (navigator.vibrate) navigator.vibrate(5);
            this._handleMove(e, zone, knob, id, callback);
        };

        const onPointerMove = (e) => {
            if (!active || this.activePointers[id] !== e.pointerId) return;
            this._handleMove(e, zone, knob, id, callback);
        };

        const onPointerUp = (e) => {
            if (!active || this.activePointers[id] !== e.pointerId) return;
            active = false;
            this.activePointers[id] = null;
            
            this._hapticState[id].passedDeadzone = false;
            this._hapticState[id].reachedMax = false;

            try {
                if (zone.hasPointerCapture(e.pointerId)) {
                    zone.releasePointerCapture(e.pointerId);
                }
            } catch (err) {}

            zone.classList.remove('active');
            knob.style.transform = 'translate(-50%, -50%)';
            if (callback) callback(0, 0);
        };

        zone.addEventListener('pointerdown', onPointerDown);
        zone.addEventListener('pointermove', onPointerMove);
        zone.addEventListener('pointerup', onPointerUp);
        zone.addEventListener('pointercancel', onPointerUp);

        this._listeners.push(
            { target: zone, type: 'pointerdown', fn: onPointerDown },
            { target: zone, type: 'pointermove', fn: onPointerMove },
            { target: zone, type: 'pointerup', fn: onPointerUp },
            { target: zone, type: 'pointercancel', fn: onPointerUp }
        );
    }

    _handleMove(e, zone, knob, id, callback) {
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxRadius = rect.width / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        const deadzonePx = this.config.deadzone * maxRadius;
        if (dist < deadzonePx) {
            knob.style.transform = 'translate(-50%, -50%)';
            this._hapticState[id].passedDeadzone = false;
            if (callback) callback(0, 0);
            return;
        }

        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, maxRadius);
        
        // 🌟 1. 線性歸一化數值 (0.0 ~ 1.0)
        const rawMagnitude = (clampedDist - deadzonePx) / (maxRadius - deadzonePx);
        
        // 🌟 2. 1.8 階非線性手感曲線 (微調細膩、大幅推動靈敏)
        const curvedMagnitude = Math.pow(Math.max(0, rawMagnitude), this.config.curve);

        const nx = Math.cos(angle) * curvedMagnitude;
        const ny = Math.sin(angle) * curvedMagnitude;

        // 🌟 3. 精確微觸覺回饋 (零延遲穿越死區 + 極限邊界回饋)
        if (navigator.vibrate) {
            if (!this._hapticState[id].passedDeadzone && rawMagnitude > 0.01) {
                navigator.vibrate(8);
                this._hapticState[id].passedDeadzone = true;
            }
            if (!this._hapticState[id].reachedMax && rawMagnitude >= 0.98) {
                navigator.vibrate(12);
                this._hapticState[id].reachedMax = true;
            } else if (rawMagnitude < 0.92) {
                this._hapticState[id].reachedMax = false;
            }
        }

        // 視覺旋鈕位移對齊
        const displayX = nx * maxRadius;
        const displayY = ny * maxRadius;
        knob.style.transform = `translate(calc(-50% + ${displayX}px), calc(-50% + ${displayY}px))`;

        if (callback) callback(nx, ny);
    }

    _setupGripButton() {
        const btn = document.getElementById('btn-grip');
        if (!btn) return;

        let cooldown = false;

        const onPointerDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (cooldown) return;
            cooldown = true;

            if (navigator.vibrate) navigator.vibrate(25);

            btn.style.transform = 'scale(0.88)';
            if (this.onGrip) this.onGrip();

            setTimeout(() => {
                btn.style.transform = 'scale(1)';
                cooldown = false;
            }, 180);
        };

        btn.addEventListener('pointerdown', onPointerDown);
        this._listeners.push({ target: btn, type: 'pointerdown', fn: onPointerDown });
    }

    destroy() {
        this._listeners.forEach(({ target, type, fn }) => {
            target.removeEventListener(type, fn);
        });
        this._listeners = [];
        this.activePointers = { left: null, right: null };
    }
}
