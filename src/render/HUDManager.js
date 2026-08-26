import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor() {
        this.panel = null;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';
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
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #c0d0e0;
            border-left: 4px solid #0088cc;
            border-radius: 6px;
            padding: 10px 14px;
            width: 250px;
            font-family: -apple-system, monospace;
            font-size: 11px;
            color: #334455;
            box-shadow: 0 4px 15px rgba(0,0,0,0.06);
            margin-top: 6px;
            pointer-events: auto;
        `;
        this.panel.innerHTML = `
            <div id="tel-header" style="font-weight:bold; color:#0066aa; margin-bottom:6px;">📊 實時工業數據</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span id="lbl-alt">末端高度:</span><span id="dat-alt" style="color:#112233; font-weight:bold;">1.20 m</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span id="lbl-reach">伸展半徑:</span><span id="dat-reach" style="color:#112233; font-weight:bold;">1.50 m</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                <span id="lbl-load">末端負載:</span><span id="dat-load" style="color:#008800; font-weight:bold;">0.0 N</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span id="lbl-pwr">伺服功耗:</span><span id="dat-pwr" style="color:#0066aa; font-weight:bold;">45 W</span>
            </div>
        `;
        hud.insertBefore(this.panel, hud.children[1]);
        this.setLanguage(this.currentLang);
    }

    setLanguage(lang) {
        this.currentLang = lang;
        const dict = I18N[lang] || I18N.zh;

        const h = document.getElementById('tel-header');
        const alt = document.getElementById('lbl-alt');
        const reach = document.getElementById('lbl-reach');
        const load = document.getElementById('lbl-load');
        const pwr = document.getElementById('lbl-pwr');

        if (h) h.innerText = dict.telemetryTitle;
        if (alt) alt.innerText = `${dict.altLabel}:`;
        if (reach) reach.innerText = `${dict.reachLabel}:`;
        if (load) load.innerText = `${dict.loadLabel}:`;
        if (pwr) pwr.innerText = `${dict.pwrLabel}:`;
    }

    update(targetPos, armData, mission, intensity) {
        if (!targetPos) return;

        const altEl = document.getElementById('dat-alt');
        if (altEl) altEl.innerText = `${targetPos.y.toFixed(2)} m`;

        const reachEl = document.getElementById('dat-reach');
        const r = Math.hypot(targetPos.x, targetPos.z);
        if (reachEl) reachEl.innerText = `${r.toFixed(2)} m`;

        const loadEl = document.getElementById('dat-load');
        const dict = I18N[this.currentLang] || I18N.zh;
        if (loadEl) {
            loadEl.innerText = mission?.isSecured ? dict.loadLocked : dict.loadIdle;
            loadEl.style.color = mission?.isSecured ? '#cc5500' : '#008800';
        }

        const pwrEl = document.getElementById('dat-pwr');
        if (pwrEl) {
            const watts = 35 + (intensity || 0) * 120;
            pwrEl.innerText = `${Math.round(watts)} W`;
        }
    }
}
