import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor() {
        this.panel = null;
    }

    init() {
        this._mountDashboard();
    }

    _mountDashboard() {
        const hud = document.getElementById('hud');
        if (!hud || document.getElementById('telemetry-box')) return;

        this.panel = document.createElement('div');
        this.panel.id = 'telemetry-box';
        this.panel.style.cssText = `
            background: rgba(8, 14, 22, 0.85);
            border: 1px solid rgba(0, 229, 255, 0.4);
            border-left: 3px solid #00e5ff;
            border-radius: 4px;
            padding: 10px 14px;
            width: 260px;
            font-family: 'Consolas', monospace;
            font-size: 11px;
            color: #9ab;
            backdrop-filter: blur(8px);
            pointer-events: auto;
            margin-top: 6px;
        `;
        this.panel.innerHTML = `
            <div style="font-weight:bold; color:#00e5ff; margin-bottom:6px; letter-spacing:1px;">📊 實時工業數據 (TELEMETRY)</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span>高度 (ALTITUDE):</span><span id="dat-alt" style="color:#fff; font-weight:bold;">1.20 m</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span>伸展半徑 (REACH):</span><span id="dat-reach" style="color:#fff; font-weight:bold;">1.50 m</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span>末端負載 (PAYLOAD):</span><span id="dat-load" style="color:#00ff66; font-weight:bold;">0.0 N</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span>伺服功耗 (POWER):</span><span id="dat-pwr" style="color:#00e5ff; font-weight:bold;">42 W</span>
            </div>
        `;
        hud.insertBefore(this.panel, hud.children[1]);
    }

    update(targetPos, armData, mission, intensity) {
        if (!targetPos || !armData?.endEffector) return;

        // 實時計算高度與半徑
        const altEl = document.getElementById('dat-alt');
        if (altEl) altEl.innerText = `${targetPos.y.toFixed(2)} m`;

        const reachEl = document.getElementById('dat-reach');
        const r = Math.hypot(targetPos.x, targetPos.z);
        if (reachEl) reachEl.innerText = `${r.toFixed(2)} m`;

        // 實時負載與功耗
        const loadEl = document.getElementById('dat-load');
        if (loadEl) {
            const isSecured = mission?.isSecured;
            loadEl.innerText = isSecured ? '24.5 N (LOCKED)' : '0.0 N (IDLE)';
            loadEl.style.color = isSecured ? '#ff9100' : '#00ff66';
        }

        const pwrEl = document.getElementById('dat-pwr');
        if (pwrEl) {
            const watts = 35 + (intensity || 0) * 140;
            pwrEl.innerText = `${Math.round(watts)} W`;
        }
    }

    updateStatus(key) {
        const tag = document.getElementById('status-tag');
        if (tag) tag.innerText = key === 'statusComplete' ? '裝配完成 🎉' : (key === 'statusSecured' ? '核心已鎖定' : '系統就緒');
    }
}
