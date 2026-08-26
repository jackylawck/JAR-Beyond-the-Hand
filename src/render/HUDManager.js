export class HUDManager {
    constructor(config) {
        this.config = config;
        this.statusTag = null;
        this.missionText = null;
        this.dataPanel = null;
    }

    init(mission, armData) {
        this.statusTag = document.getElementById('status-tag');
        this.missionText = document.getElementById('mission-text');

        // 依據難度模式注入對應任務說明
        const levelKey = `mission${this.config.getLevel().charAt(0).toUpperCase() + this.config.getLevel().slice(1)}`;
        if (this.missionText) {
            this.missionText.innerText = this.config.t(levelKey);
        }

        // 科研/進階模式動態掛載數據遙測面板
        if (this.config.getLevel() !== 'kid') {
            this._mountTelemetryPanel();
        }
    }

    _mountTelemetryPanel() {
        const hud = document.getElementById('hud');
        if (!hud || document.getElementById('telemetry-panel')) return;

        this.dataPanel = document.createElement('div');
        this.dataPanel.id = 'telemetry-panel';
        this.dataPanel.style.cssText = `
            background: rgba(4, 12, 24, 0.85);
            border: 1px solid #00e5ff;
            border-radius: 6px;
            padding: 8px 12px;
            max-width: 280px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #88ccdd;
            backdrop-filter: blur(4px);
        `;
        this.dataPanel.innerHTML = `
            <div style="display:flex; justify-content:space-between;"><span>EE Pos:</span><span id="tel-pos" style="color:#00e5ff;">0.0, 0.0, 0.0</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Tracking Err:</span><span id="tel-err" style="color:#00e5ff;">0.000m</span></div>
        `;
        hud.insertBefore(this.dataPanel, hud.children[2]);
    }

    updateStatus(statusKey) {
        if (!this.statusTag) return;
        this.statusTag.innerText = this.config.t(statusKey);
    }

    update(targetPos, armData, mission) {
        if (!this.dataPanel) return;

        const posEl = document.getElementById('tel-pos');
        if (posEl) {
            posEl.innerText = `${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)}`;
        }

        const errEl = document.getElementById('tel-err');
        if (errEl && armData.endEffector) {
            const err = armData.endEffector.position.distanceTo(targetPos);
            errEl.innerText = `${err.toFixed(3)}m`;
            errEl.style.color = err > 0.05 ? '#ff9100' : '#00e5ff';
        }
    }

    dispose() {
        if (this.dataPanel && this.dataPanel.parentElement) {
            this.dataPanel.parentElement.removeChild(this.dataPanel);
        }
    }
}
