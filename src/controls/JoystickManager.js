export class JoystickManager {
    static init(inputState, onGripToggle) {
        JoystickManager.bindZone('joy-left', 'knob-left', (x, y) => {
            inputState.lx = x;
            inputState.ly = y;
        });

        JoystickManager.bindZone('joy-right', 'knob-right', (x, y) => {
            inputState.rx = x;
            inputState.ry = y;
        });

        document.getElementById('btn-grip').addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            onGripToggle();
        });
    }

    static bindZone(zoneId, knobId, onChange) {
        const zone = document.getElementById(zoneId);
        const knob = document.getElementById(knobId);
        const maxR = 45;
        let activeId = null;

        zone.addEventListener('pointerdown', (e) => {
            activeId = e.pointerId;
            zone.setPointerCapture(e.pointerId);
            update(e);
        });

        zone.addEventListener('pointermove', (e) => {
            if (e.pointerId === activeId) update(e);
        });

        const reset = (e) => {
            if (e.pointerId === activeId) {
                activeId = null;
                knob.style.transform = `translate(0px, 0px)`;
                onChange(0, 0);
            }
        };

        zone.addEventListener('pointerup', reset);
        zone.addEventListener('pointercancel', reset);

        function update(e) {
            const rect = zone.getBoundingClientRect();
            let dx = e.clientX - (rect.left + rect.width / 2);
            let dy = e.clientY - (rect.top + rect.height / 2);
            const dist = Math.hypot(dx, dy);

            if (dist > maxR) {
                dx = (dx / dist) * maxR;
                dy = (dy / dist) * maxR;
            }

            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            const nx = dx / maxR;
            const ny = dy / maxR;
            const dz = 0.12;

            const fx = Math.abs(nx) < dz ? 0 : Math.sign(nx) * Math.pow((Math.abs(nx) - dz) / (1 - dz), 2);
            const fy = Math.abs(ny) < dz ? 0 : Math.sign(ny) * Math.pow((Math.abs(ny) - dz) / (1 - dz), 2);
            onChange(fx, fy);
        }
    }
}
