import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor() {
        this.panel = null;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';
        this.typewriterInterval = null;
    }

    init(mode) {
        this._mountDashboard();
    }

    _mountDashboard() {
        const hud = document.getElementById('hud');
        if (!hud || document.getElementById('telemetry-box')) return;

        this.panel = document.createElement('div');
        this.panel.id = 'telemetry-box';
        this.panel.style.cssText = `
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #c0d0e0; border-left: 4px solid #0088cc;
            border-radius: 6px; padding: 10px 14px; width: 250px;
            font-family: -apple-system, monospace; font-size: 11px;
            color: #334455; box-shadow: 0 4px 15px rgba(0,0,0,0.06);
            margin-top: 6px; pointer-events: auto;
        `;
        this.panel.innerHTML = `
            <div id="tel-header" style="font-weight:bold; color:#0066aa; margin-bottom:6px;">📊 實時工業數據</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span id="lbl-alt">末端高度:</span><span id="dat-alt" style="color:#112233; font-weight:bold;">1.20 m</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span id="lbl-reach">伸展半徑:</span><span id="dat-reach" style="color:#112233; font-weight:bold;">1.50 m</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;"><span id="lbl-load">末端負載:</span><span id="dat-load" style="color:#008800; font-weight:bold;">0.0 N</span></div>
            <div style="display:flex; justify-content:space-between;"><span id="lbl-pwr">伺服功耗:</span><span id="dat-pwr" style="color:#0066aa; font-weight:bold;">45 W</span></div>
        `;
        hud.insertBefore(this.panel, hud.children[1]);
        this.setLanguage(this.currentLang);
    }

    // 🌟 打字機特效 AI 對話系統
    playDialogue(key, mode, color = "#00e5ff") {
        const dict = I18N[this.currentLang] || I18N.zh;
        // 如果有特定模式語音則讀取，否則讀取通用語音
        const fullKey = mode ? `jar_${key}_${mode}` : `jar_${key}`;
        const text = dict[fullKey] || key;

        const box = document.getElementById('jar-dialogue');
        const textEl = document.getElementById('jar-text');
        if (!box || !textEl) return;

        box.style.display = 'block';
        box.style.borderColor = color;
        box.style.borderLeftColor = color;
        document.getElementById('jar-title').style.color = color;
        
        clearInterval(this.typewriterInterval);
        textEl.innerText = "";
        let i = 0;
        this.typewriterInterval = setInterval(() => {
            textEl.innerText += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(this.typewriterInterval);
                // 5秒後自動隱藏
                setTimeout(() => { if (textEl.innerText === text) box.style.display = 'none'; }, 5000);
            }
        }, 30); // 打字速度
    }

    setLanguage(lang) {
        this.currentLang = lang;
        const dict = I18N[lang] || I18N.zh;
        const h = document.getElementById('tel-header');
        if (h) {
            h.innerText = dict.telemetryTitle;
            document.getElementById('lbl-alt').innerText = `${dict.altLabel}:`;
            document.getElementById('lbl-reach').innerText = `${dict.reachLabel}:`;
            document.getElementById('lbl-load').innerText = `${dict.loadLabel}:`;
            document.getElementById('lbl-pwr').innerText = `${dict.pwrLabel}:`;
        }
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
        if (pwrEl) pwrEl.innerText = `${Math.round(35 + (intensity || 0) * 120)} W`;
    }
}
