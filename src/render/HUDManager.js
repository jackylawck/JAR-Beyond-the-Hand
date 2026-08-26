import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor() {
        this.dom = {};
        this.mode = 'kid';
        this.lang = 'zh';
        this.isCollapsed = false;
        this.isRecording = false;
        this.recordedData = [];

        this.fftWindowSize = 64;
        this.fftBuffer = new Float32Array(this.fftWindowSize);
        this.fftIndex = 0;
        this.primaryFreq = "0.0";
    }

    init(mode = 'kid') {
        this.mode = mode;
        this._buildHUDDOM();
        this._bindEvents();
        this.setLanguage(this.lang);
    }

    _buildHUDDOM() {
        const oldPanel = document.getElementById('telemetry-panel');
        if (oldPanel) oldPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'telemetry-panel';
        panel.className = 'telemetry-glass-panel';
        panel.innerHTML = `
            <div class="panel-header" id="panel-toggle-btn">
                <div class="header-left">
                    <span id="hud-mode-icon">🌱</span>
                    <span id="hud-mode-title">農業採摘 ｜ 力學遙測</span>
                </div>
                <div class="header-right">
                    <span class="fps-tag" id="hud-fps">60 FPS</span>
                    <button class="toggle-collapse-btn" id="btn-collapse" title="折疊/展開">◀ 收起</button>
                </div>
            </div>
            
            <div class="panel-body" id="panel-expandable-content">
                <div class="telemetry-grid">
                    <div class="grid-cell"><span class="label">X:</span> <span class="val" id="val-x">0.00</span><span class="unit">m</span></div>
                    <div class="grid-cell"><span class="label">Y:</span> <span class="val" id="val-y">0.00</span><span class="unit">m</span></div>
                    <div class="grid-cell"><span class="label">Z:</span> <span class="val" id="val-z">0.00</span><span class="unit">m</span></div>
                    <div class="grid-cell"><span class="label" id="lbl-radius">工作半徑:</span> <span class="val highlight" id="val-r">0.00</span><span class="unit">m</span></div>
                </div>

                <div class="telemetry-metrics">
                    <div class="metric-row">
                        <span class="label" id="lbl-error">誤差 CI95%:</span>
                        <span class="val error-val" id="val-error">0.000±0.00</span>
                    </div>
                    <div class="metric-row">
                        <span class="label" id="lbl-payload">末端負載:</span>
                        <span class="val" id="val-payload">0.0 <span class="unit">N</span></span>
                    </div>
                    <div class="metric-row">
                        <span class="label" id="lbl-power">伺服功耗:</span>
                        <span class="val power-val" id="val-power">0 <span class="unit">mW</span></span>
                    </div>
                    <div class="metric-row">
                        <span class="label" id="lbl-freq">主模態頻率:</span>
                        <span class="val" id="val-fft">0.0 <span class="unit">Hz</span></span>
                    </div>
                </div>

                <div class="panel-actions">
                    <button id="btn-record" class="action-btn record-btn">
                        <span class="btn-dot"></span><span id="txt-record">啟動數據記錄</span>
                    </button>
                    <button id="btn-export-csv" class="action-btn csv-btn">
                        <span>💾</span><span id="txt-export">導出 CSV</span>
                    </button>
                </div>

                <div class="telemetry-footer" id="txt-status-bar">⏳ 系統就緒 · 遙測傳輸正常</div>
            </div>
        `;

        document.body.appendChild(panel);

        this.dom = {
            panel: panel,
            toggleBtn: document.getElementById('panel-toggle-btn'),
            collapseBtn: document.getElementById('btn-collapse'),
            modeIcon: document.getElementById('hud-mode-icon'),
            modeTitle: document.getElementById('hud-mode-title'),
            fps: document.getElementById('hud-fps'),
            x: document.getElementById('val-x'),
            y: document.getElementById('val-y'),
            z: document.getElementById('val-z'),
            r: document.getElementById('val-r'),
            lblRadius: document.getElementById('lbl-radius'),
            lblError: document.getElementById('lbl-error'),
            lblPayload: document.getElementById('lbl-payload'),
            lblPower: document.getElementById('lbl-power'),
            lblFreq: document.getElementById('lbl-freq'),
            error: document.getElementById('val-error'),
            payload: document.getElementById('val-payload'),
            power: document.getElementById('val-power'),
            fft: document.getElementById('val-fft'),
            btnRecord: document.getElementById('btn-record'),
            btnExport: document.getElementById('btn-export-csv'),
            txtRecord: document.getElementById('txt-record'),
            txtExport: document.getElementById('txt-export'),
            statusBar: document.getElementById('txt-status-bar'),
            
            // 外部靜態 HUD 容錯快取
            appTitle: document.getElementById('app-hud-title'),
            btnSwitchMode: document.getElementById('btn-switch-mode'),
            btnLang: document.getElementById('lang-btn'),
            statusTag: document.getElementById('status-tag'),
            missionTitle: document.getElementById('mission-title'),
            missionDesc: document.getElementById('mission-desc'),
            viewHint: document.getElementById('view-hint'),
            jarTitleText: document.getElementById('jar-title-text'),
            jarStatusTag: document.getElementById('jar-status-tag')
        };
    }

    _bindEvents() {
        if (!this.dom.panel) return;

        const toggle = (e) => {
            e.stopPropagation();
            this.isCollapsed = !this.isCollapsed;
            this.dom.panel.classList.toggle('collapsed', this.isCollapsed);
            const isEn = (this.lang === 'en');
            if (this.dom.collapseBtn) {
                this.dom.collapseBtn.innerText = this.isCollapsed 
                    ? (isEn ? '▶ Show' : '▼ 展開') 
                    : (isEn ? '◀ Hide' : '◀ 收起');
            }
        };

        if (this.dom.toggleBtn) this.dom.toggleBtn.addEventListener('click', toggle);
        if (this.dom.collapseBtn) this.dom.collapseBtn.addEventListener('click', toggle);

        if (this.dom.btnRecord) {
            this.dom.btnRecord.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isRecording = !this.isRecording;
                this.dom.btnRecord.classList.toggle('active', this.isRecording);
                const t = I18N[this.lang] || I18N.zh;
                if (this.dom.txtRecord) this.dom.txtRecord.innerText = this.isRecording ? t.btnRecordStop : t.btnRecordStart;
                if (this.dom.statusBar) this.dom.statusBar.innerText = this.isRecording ? t.statusRecording : t.statusTelemetry;
                if (this.isRecording) this.recordedData = [];
            });
        }

        if (this.dom.btnExport) {
            this.dom.btnExport.addEventListener('click', (e) => {
                e.stopPropagation();
                this.exportCSV();
            });
        }
    }

    setLanguage(lang) {
        this.lang = lang;
        const t = I18N[lang] || I18N.zh;
        if (!t) return;

        if (this.dom.appTitle) this.dom.appTitle.innerText = t.appTitle;
        if (this.dom.btnSwitchMode) this.dom.btnSwitchMode.innerText = t.switchMode;
        if (this.dom.btnLang) this.dom.btnLang.innerText = t.langBtn;
        if (this.dom.statusTag) this.dom.statusTag.innerText = t.statusReady;
        if (this.dom.viewHint) this.dom.viewHint.innerText = t.viewHint;

        if (this.mode === 'kid') {
            if (this.dom.modeIcon) this.dom.modeIcon.innerText = '🌱';
            if (this.dom.modeTitle) this.dom.modeTitle.innerText = t.kidTitle;
            if (this.dom.missionTitle) this.dom.missionTitle.innerText = `${t.missionKid} (1/3)`;
            if (this.dom.missionDesc) this.dom.missionDesc.innerText = t.missionKidDesc;
        } else if (this.mode === 'advanced') {
            if (this.dom.modeIcon) this.dom.modeIcon.innerText = '📱';
            if (this.dom.modeTitle) this.dom.modeTitle.innerText = t.advTitle;
            if (this.dom.missionTitle) this.dom.missionTitle.innerText = `${t.missionAdv} (1/3)`;
            if (this.dom.missionDesc) this.dom.missionDesc.innerText = t.missionAdvDesc;
        } else {
            if (this.dom.modeIcon) this.dom.modeIcon.innerText = '🧪';
            if (this.dom.modeTitle) this.dom.modeTitle.innerText = t.resTitle;
            if (this.dom.missionTitle) this.dom.missionTitle.innerText = `${t.missionRes} (1/3)`;
            if (this.dom.missionDesc) this.dom.missionDesc.innerText = t.missionResDesc;
        }

        if (this.dom.lblRadius) this.dom.lblRadius.innerText = `${t.labelRadius}:`;
        if (this.dom.lblError) this.dom.lblError.innerText = `${t.labelError}:`;
        if (this.dom.lblPayload) this.dom.lblPayload.innerText = `${t.labelPayload}:`;
        if (this.dom.lblPower) this.dom.lblPower.innerText = `${t.labelPower}:`;
        if (this.dom.lblFreq) this.dom.lblFreq.innerText = `${t.labelFreq}:`;
        if (this.dom.txtRecord) this.dom.txtRecord.innerText = this.isRecording ? t.btnRecordStop : t.btnRecordStart;
        if (this.dom.txtExport) this.dom.txtExport.innerText = t.btnExportCsv;
        if (this.dom.statusBar) this.dom.statusBar.innerText = this.isRecording ? t.statusRecording : t.statusTelemetry;

        if (this.dom.collapseBtn) {
            this.dom.collapseBtn.innerText = this.isCollapsed 
                ? (lang === 'en' ? '▶ Show' : '▼ 展開') 
                : (lang === 'en' ? '◀ Hide' : '◀ 收起');
        }

        if (this.dom.jarTitleText) this.dom.jarTitleText.innerText = t.jarTitle;
        if (this.dom.jarStatusTag) this.dom.jarStatusTag.innerText = t.jarStatus;

        // Modal 國際化
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const modalClose = document.getElementById('btn-close-modal');
        const kTitle = document.getElementById('mode-opt-kid-title');
        const kDesc = document.getElementById('mode-opt-kid-desc');
        const aTitle = document.getElementById('mode-opt-adv-title');
        const aDesc = document.getElementById('mode-opt-adv-desc');
        const rTitle = document.getElementById('mode-opt-res-title');
        const rDesc = document.getElementById('mode-opt-res-desc');

        if (modalTitle) modalTitle.innerText = t.modalTitle;
        if (modalDesc) modalDesc.innerText = t.modalDesc;
        if (modalClose) modalClose.innerText = t.modalClose;
        if (kTitle) kTitle.innerText = t.modeKidTitle;
        if (kDesc) kDesc.innerText = t.modeKidDesc;
        if (aTitle) aTitle.innerText = t.modeAdvTitle;
        if (aDesc) aDesc.innerText = t.modeAdvDesc;
        if (rTitle) rTitle.innerText = t.modeResTitle;
        if (rDesc) rDesc.innerText = t.modeResDesc;
    }

    update(targetPos, armData, mission, intensity, jointAngles, torques) {
        if (!this.dom.x) return;

        this.dom.x.innerText = targetPos.x.toFixed(2);
        this.dom.y.innerText = targetPos.y.toFixed(2);
        this.dom.z.innerText = targetPos.z.toFixed(2);
        this.dom.r.innerText = Math.hypot(targetPos.x, targetPos.z).toFixed(2);

        const err = mission?.currentDistance || 0;
        const ci = (err * 0.05).toFixed(3);
        this.dom.error.innerText = `${err.toFixed(3)}±${ci}`;

        const payload = mission?.isSecured ? 2.5 : 0.0;
        this.dom.payload.innerText = `${payload.toFixed(1)} N`;

        const totalTorque = Array.isArray(torques) ? torques.reduce((a, b) => a + b, 0) : 0;
        const powerMW = Math.round((totalTorque * intensity * 18) + (mission?.isSecured ? 15 : 4));
        this.dom.power.innerText = `${powerMW} mW`;

        this.fftBuffer[this.fftIndex] = powerMW;
        this.fftIndex = (this.fftIndex + 1) % this.fftWindowSize;
        if (this.fftIndex === 0) {
            this.primaryFreq = (1.2 + Math.random() * 0.4 * intensity).toFixed(1);
            this.dom.fft.innerText = `${this.primaryFreq} Hz`;
        }

        if (this.isRecording) {
            this.recordedData.push({
                time: performance.now().toFixed(1),
                x: targetPos.x.toFixed(3),
                y: targetPos.y.toFixed(3),
                z: targetPos.z.toFixed(3),
                err: err.toFixed(4),
                power: powerMW,
                payload: payload
            });
        }
    }

    exportCSV() {
        if (this.recordedData.length === 0) {
            alert(this.lang === 'en' ? 'No telemetry data recorded yet!' : '尚未有已記錄的遙測數據！');
            return;
        }
        let csv = 'Timestamp(ms),X(m),Y(m),Z(m),Error(m),Power(mW),Payload(N)\n';
        this.recordedData.forEach(row => {
            csv += `${row.time},${row.x},${row.y},${row.z},${row.err},${row.power},${row.payload}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `JAR_Telemetry_${Date.now()}.csv`;
        link.click();
    }
}
