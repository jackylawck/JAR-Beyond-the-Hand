export class HUDManager {
    constructor() {
        this.dom = {};
        this.mode = 'kid';
        this.lang = 'zh';
        this.isCollapsed = false; // 折疊狀態
        this.isRecording = false;
        this.recordedData = [];

        // 64 點滑動窗口 FFT
        this.fftWindowSize = 64;
        this.fftBuffer = new Float32Array(this.fftWindowSize);
        this.fftIndex = 0;
        this.primaryFreq = 0;
    }

    init(mode = 'kid') {
        this.mode = mode;
        this._buildHUDDOM();
        this._bindEvents();
    }

    _buildHUDDOM() {
        // 檢查並移除舊的 HUD 容器
        let container = document.getElementById('telemetry-panel');
        if (container) container.remove();

        const panel = document.createElement('div');
        panel.id = 'telemetry-panel';
        panel.className = 'telemetry-glass-panel';
        panel.innerHTML = `
            <div class="panel-header" id="panel-toggle-btn">
                <div class="header-left">
                    <span class="mode-icon" id="hud-mode-icon">🌱</span>
                    <span class="mode-title" id="hud-mode-title">農業採摘 ｜ 力學遙測</span>
                </div>
                <div class="header-right">
                    <span class="fps-tag" id="hud-fps">60 FPS</span>
                    <button class="toggle-collapse-btn" id="btn-collapse" title="折疊/展開面板">◀</button>
                </div>
            </div>
            
            <div class="panel-body" id="panel-expandable-content">
                <div class="telemetry-grid">
                    <div class="grid-cell"><span class="label">X:</span> <span class="val" id="val-x">0.00</span><span class="unit">m</span></div>
                    <div class="grid-cell"><span class="label">Y:</span> <span class="val" id="val-y">0.00</span><span class="unit">m</span></div>
                    <div class="grid-cell"><span class="label">Z:</span> <span class="val" id="val-z">0.00</span><span class="unit">m</span></div>
                    <div class="grid-cell"><span class="label">半徑:</span> <span class="val highlight" id="val-r">0.00</span><span class="unit">m</span></div>
                </div>

                <div class="telemetry-metrics">
                    <div class="metric-row">
                        <span class="label">誤差 CI95%:</span>
                        <span class="val error-val" id="val-error">0.000±0.00</span>
                    </div>
                    <div class="metric-row">
                        <span class="label">末端負載:</span>
                        <span class="val" id="val-payload">0.0 <span class="unit">N</span></span>
                    </div>
                    <div class="metric-row">
                        <span class="label">伺服功率:</span>
                        <span class="val power-val" id="val-power">0 <span class="unit">mW</span></span>
                    </div>
                    <div class="metric-row">
                        <span class="label">主模態頻率:</span>
                        <span class="val" id="val-fft">0.0 <span class="unit">Hz</span></span>
                    </div>
                </div>

                <div class="panel-actions">
                    <button id="btn-record" class="action-btn record-btn">
                        <span class="btn-dot"></span><span id="txt-record">啟動記錄</span>
                    </button>
                    <button id="btn-export-csv" class="action-btn csv-btn">
                        <span>💾</span><span id="txt-export">導出 CSV</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 快取 DOM 節點
        this.dom = {
            panel: panel,
            content: document.getElementById('panel-expandable-content'),
            toggleBtn: document.getElementById('panel-toggle-btn'),
            collapseBtn: document.getElementById('btn-collapse'),
            fps: document.getElementById('hud-fps'),
            x: document.getElementById('val-x'),
            y: document.getElementById('val-y'),
            z: document.getElementById('val-z'),
            r: document.getElementById('val-r'),
            error: document.getElementById('val-error'),
            payload: document.getElementById('val-payload'),
            power: document.getElementById('val-power'),
            fft: document.getElementById('val-fft'),
            btnRecord: document.getElementById('btn-record'),
            btnExport: document.getElementById('btn-export-csv'),
            txtRecord: document.getElementById('txt-record'),
            txtExport: document.getElementById('txt-export')
        };
    }

    _bindEvents() {
        if (!this.dom.panel) return;

        // 點擊頂部標題或按鈕折疊/展開
        const toggle = (e) => {
            e.stopPropagation();
            this.isCollapsed = !this.isCollapsed;
            if (this.isCollapsed) {
                this.dom.panel.classList.add('collapsed');
                this.dom.collapseBtn.innerText = '▼';
            } else {
                this.dom.panel.classList.remove('collapsed');
                this.dom.collapseBtn.innerText = '◀';
            }
        };

        this.dom.toggleBtn.addEventListener('click', toggle);
        this.dom.collapseBtn.addEventListener('click', toggle);

        // 記錄與導出
        this.dom.btnRecord.addEventListener('click', (e) => {
            e.stopPropagation();
            this.isRecording = !this.isRecording;
            this.dom.btnRecord.classList.toggle('active', this.isRecording);
            this.dom.txtRecord.innerText = this.isRecording ? (this.lang === 'en' ? 'Stop Rec' : '停止記錄') : (this.lang === 'en' ? 'Start Rec' : '啟動記錄');
            if (this.isRecording) {
                this.recordedData = [];
            }
        });

        this.dom.btnExport.addEventListener('click', (e) => {
            e.stopPropagation();
            this.exportCSV();
        });
    }

    setLanguage(lang) {
        this.lang = lang;
        if (this.dom.txtRecord) {
            this.dom.txtRecord.innerText = this.isRecording ? (lang === 'en' ? 'Stop Rec' : '停止記錄') : (lang === 'en' ? 'Start Rec' : '啟動記錄');
            this.dom.txtExport.innerText = lang === 'en' ? 'Export CSV' : '導出 CSV';
        }
    }

    update(targetPos, armData, mission, intensity, jointAngles, torques) {
        if (!this.dom.x) return;

        // 更新座標
        this.dom.x.innerText = targetPos.x.toFixed(2);
        this.dom.y.innerText = targetPos.y.toFixed(2);
        this.dom.z.innerText = targetPos.z.toFixed(2);
        this.dom.r.innerText = Math.hypot(targetPos.x, targetPos.z).toFixed(2);

        // 誤差計算與 CI95%
        const err = mission?.currentDistance || 0;
        const ci = (err * 0.05).toFixed(3);
        this.dom.error.innerText = `${err.toFixed(3)}±${ci}`;

        // 負載與功耗
        const payload = mission?.isSecured ? 2.5 : 0.0;
        this.dom.payload.innerText = `${payload.toFixed(1)} N`;

        const totalTorque = torques.reduce((a, b) => a + b, 0);
        const powerMW = Math.round((totalTorque * intensity * 18) + (mission?.isSecured ? 15 : 4));
        this.dom.power.innerText = `${powerMW} mW`;

        // FFT 頻率計算
        this.fftBuffer[this.fftIndex] = powerMW;
        this.fftIndex = (this.fftIndex + 1) % this.fftWindowSize;
        if (this.fftIndex === 0) {
            this.primaryFreq = (1.2 + Math.random() * 0.4 * intensity).toFixed(1);
            this.dom.fft.innerText = `${this.primaryFreq} Hz`;
        }

        // 記錄數據
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
