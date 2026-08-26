import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor(config) {
        this.config = config;
        this.statusTag = null;
        this.missionTitle = null;
        this.missionDesc = null;
        this.dataPanel = null;
    }

    init(mission, armData) {
        this.statusTag = document.getElementById('status-tag');
        this.missionTitle = document.getElementById('mission-title');
        this.missionDesc = document.getElementById('mission-desc');

        // 安全取得當前語言設定
        const currentLang = (this.config?.getLang?.()) || localStorage.getItem('beyond-lang') || 'zh';
        this.updateLanguage(currentLang, mission);

        // 進階/科研模式掛載數據遙測面板 (安全檢查)
        if (this.config?.getLevel?.() && this.config.getLevel() !== 'kid') {
            this._mountTelemetryPanel();
        }
    }

    _mountTelemetryPanel() {
        const hud = document.getElementById('hud');
        if (!hud || document.getElementById('telemetry-panel')) return;

        this.dataPanel = document.createElement('div');
        this.dataPanel.id = 'telemetry-panel';
        this.dataPanel.style.cssText = `
            background: rgba(4, 12, 24, 0.88);
            border: 1px solid #00e5ff;
            border-radius: 6px;
            padding: 8px 12px;
            max-width: 280px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #88ccdd;
            backdrop-filter: blur(6px);
            margin-top: 8px;
        `;
        this.dataPanel.innerHTML = `
            <div style="display:flex; justify-content:space-between;"><span>EE Pos:</span><span id="tel-pos" style="color:#00e5ff;">0.0, 0.0, 0.0</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Tracking Err:</span><span id="tel-err" style="color:#00e5ff;">0.000m</span></div>
        `;
        hud.insertBefore(this.dataPanel, hud.children[2] || null);
    }

    updateLanguage(lang, mission) {
        const dict = I18N[lang] || I18N.zh;
        if (!dict) return;

        if (this.missionTitle) this.missionTitle.innerText = dict.missionHeader;
        if (this.missionDesc && (!mission || (!mission.isSecured && !mission.isDelivered))) {
            this.missionDesc.innerText = dict.step1;
        }

        if (this.statusTag) {
            if (mission?.isDelivered) this.statusTag.innerText = dict.statusComplete;
            else if (mission?.isSecured) this.statusTag.innerText = dict.statusSecured;
            else this.statusTag.innerText = dict.statusReady;
        }
    }

    updateStatus(statusKey) {
        if (!this.statusTag) return;
        const currentLang = (this.config?.getLang?.()) || localStorage.getItem('beyond-lang') || 'zh';
        const dict = I18N[currentLang] || I18N.zh;
        this.statusTag.innerText = dict[statusKey] || statusKey;
    }

    update(targetPos, armData, mission) {
        if (!this.dataPanel) return;

        const posEl = document.getElementById('tel-pos');
        if (posEl && targetPos) {
            posEl.innerText = `${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)}`;
        }

        const errEl = document.getElementById('tel-err');
        if (errEl && armData?.endEffector && targetPos) {
            const err = armData.endEffector.position.distanceTo(targetPos);
            errEl.innerText = `${err.toFixed(3)}m`;
            errEl.style.color = err > 0.05 ? '#ff9100' : '#00e5ff';
        }
    }

    dispose() {
        if (this.dataPanel?.parentElement) {
            this.dataPanel.parentElement.removeChild(this.dataPanel);
        }
    }
}
