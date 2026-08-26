import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor() {
        this.panel = null;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';
        this.currentMode = 'kid';
        this.typewriterInterval = null;

        // 科研數據記錄器 (Data Logger)
        this.isRecording = false;
        this.sessionData = [];
        this.recordStartTime = 0;

        // 時域與誤差歷史 (用於統計與 FFT)
        this.historyData = {
            load: [],
            power: [],
            errors: []
        };
        this.maxHistory = 64; // FFT 64 點採樣窗
        this._lastTime = performance.now();
    }

    init(mode = 'kid') {
        this.currentMode = mode;
        this._injectStyles();
        this._mountDashboard(mode);
        this._mountGraphicalTelemetry();
        this._mountAlertSystem();
    }

    _injectStyles() {
        if (document.getElementById('hud-anim-styles')) return;
        const style = document.createElement('style');
        style.id = 'hud-anim-styles';
        style.textContent = `
            @keyframes slideInAlert {
                from { transform: translateX(50px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .rec-btn-active {
                background: #ff3d00 !important;
                color: #fff !important;
                box-shadow: 0 0 10px #ff3d00 !important;
            }
        `;
        document.head.appendChild(style);
    }

    _mountDashboard(mode) {
        const hud = document.getElementById('hud');
        if (!hud || document.getElementById('telemetry-box')) return;

        this.panel = document.createElement('div');
        this.panel.id = 'telemetry-box';
        this.panel.style.cssText = `
            background: rgba(2, 8, 16, 0.94);
            border: 1px solid #00e5ff;
            border-left: 4px solid #00e5ff;
            border-radius: 6px;
            padding: 10px 14px;
            width: 290px;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 11px;
            color: #88ccdd;
            box-shadow: 0 4px 25px rgba(0, 229, 255, 0.12);
            backdrop-filter: blur(8px);
            margin-top: 6px;
            pointer-events: auto;
        `;

        const modeLabels = {
            kid: '🌱 農業採摘 · 力學回饋',
            advanced: '🏭 工業組裝 · 精密定位',
            research: '🧪 科研實驗 · 數據採集與遙測'
        };

        const isResearch = mode === 'research';

        this.panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid rgba(0,229,255,0.2); padding-bottom:4px;">
                <span id="tel-header" style="font-weight:bold; color:#00e5ff; font-size:11px; letter-spacing:1px;">
                    ${modeLabels[mode] || '機械臂遙測'}
                </span>
                <span id="tel-fps" style="color:#00ff66; font-size:10px;">60 FPS</span>
            </div>

            <!-- XYZ 坐標與半徑 -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px 10px; margin-bottom:4px;">
                <div><span style="color:#557788;">X:</span> <span id="dat-pos-x" style="color:#00e5ff; font-weight:bold;">0.00</span>m</div>
                <div><span style="color:#557788;">Y:</span> <span id="dat-pos-y" style="color:#00e5ff; font-weight:bold;">0.00</span>m</div>
                <div><span style="color:#557788;">Z:</span> <span id="dat-pos-z" style="color:#00e5ff; font-weight:bold;">0.00</span>m</div>
                <div><span style="color:#557788;">工作半徑:</span> <span id="dat-reach" style="color:#ff9100; font-weight:bold;">0.00</span>m</div>
            </div>

            <!-- 關節角度與力矩估算 (科研模式專屬) -->
            <div id="joint-data" style="display:${isResearch ? 'block' : 'none'}; border-top:1px solid rgba(0,229,255,0.1); padding-top:4px; margin-top:3px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px 10px; font-size:10px;">
                    <div><span style="color:#557788;">θ₁:</span> <span id="dat-joint-0" style="color:#88ccdd;">0.0°</span> <span id="dat-torq-0" style="color:#557788; font-size:9px;">(0.0N·m)</span></div>
                    <div><span style="color:#557788;">θ₂:</span> <span id="dat-joint-1" style="color:#88ccdd;">0.0°</span> <span id="dat-torq-1" style="color:#557788; font-size:9px;">(0.0N·m)</span></div>
                    <div><span style="color:#557788;">θ₃:</span> <span id="dat-joint-2" style="color:#88ccdd;">0.0°</span> <span id="dat-torq-2" style="color:#557788; font-size:9px;">(0.0N·m)</span></div>
                    <div><span style="color:#557788;">θ₄:</span> <span id="dat-joint-3" style="color:#88ccdd;">0.0°</span> <span id="dat-torq-3" style="color:#557788; font-size:9px;">(0.0N·m)</span></div>
                </div>
            </div>

            <!-- 動力學、不確定度統計與負載 -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px 10px; border-top:1px solid rgba(0,229,255,0.1); padding-top:4px; margin-top:3px;">
                <div><span style="color:#557788;">誤差 CI95:</span> <span id="dat-error" style="color:#00ff66; font-weight:bold;">0.000±0.000</span></div>
                <div><span style="color:#557788;">末端負載:</span> <span id="dat-load" style="color:#00ff66; font-weight:bold;">0.0 N</span></div>
                <div><span style="color:#557788;">伺服功耗:</span> <span id="dat-pwr" style="color:#00e5ff; font-weight:bold;">35</span>W</div>
                <div><span style="color:#557788;">主模態頻率:</span> <span id="dat-freq" style="color:#ff9100; font-weight:bold;">0.0 Hz</span></div>
            </div>

            <!-- 數據導出控制列 -->
            <div style="display:flex; gap:6px; margin-top:8px; border-top:1px solid rgba(0,229,255,0.15); padding-top:6px;">
                <button id="btn-log-toggle" style="flex:1; background:rgba(0,229,255,0.15); border:1px solid #00e5ff; color:#00e5ff; font-size:10px; border-radius:3px; padding:4px 0; cursor:pointer; font-family:inherit;">⏺ 啟動數據記錄</button>
                <button id="btn-log-export" style="flex:1; background:rgba(0,255,100,0.15); border:1px solid #00ff66; color:#00ff66; font-size:10px; border-radius:3px; padding:4px 0; cursor:pointer; font-family:inherit;">💾 導出 CSV</button>
            </div>

            <div id="status-bar" style="border-top:1px solid rgba(0,229,255,0.1); padding-top:4px; margin-top:6px; font-size:10px; color:#557788;">
                <span id="status-message">⏳ 系統就緒 · 遙測傳輸正常</span>
            </div>
        `;

        hud.insertBefore(this.panel, hud.children[1]);
        this._bindLoggerControls();
        this.setLanguage(this.currentLang);
    }

    _bindLoggerControls() {
        const toggleBtn = document.getElementById('btn-log-toggle');
        const exportBtn = document.getElementById('btn-log-export');

        if (toggleBtn) {
            toggleBtn.onclick = () => {
                this.isRecording = !this.isRecording;
                if (this.isRecording) {
                    this.sessionData = [];
                    this.recordStartTime = performance.now();
                    toggleBtn.classList.add('rec-btn-active');
                    toggleBtn.innerText = '⏹ 停止記錄 (採集中)';
                    this.triggerAlert('科研數據記錄已啟動 (6-DoF + Dynamics)', 'info');
                } else {
                    toggleBtn.classList.remove('rec-btn-active');
                    toggleBtn.innerText = '⏺ 啟動數據記錄';
                    this.triggerAlert(`記錄已完成，共採集 ${this.sessionData.length} 幀數據`, 'success');
                }
            };
        }

        if (exportBtn) {
            exportBtn.onclick = () => {
                this.exportCSV();
            };
        }
    }

    exportCSV() {
        if (this.sessionData.length === 0) {
            this.triggerAlert('當前無可導出的實驗數據！', 'warning');
            return;
        }

        const headers = 'time_ms,pos_x,pos_y,pos_z,joint0_rad,joint1_rad,joint2_rad,joint3_rad,torque0_Nm,torque1_Nm,torque2_Nm,torque3_Nm,tracking_error_m,load_N,power_W\n';
        const rows = this.sessionData.map(d =>
            `${d.time},${d.x},${d.y},${d.z},${d.j0},${d.j1},${d.j2},${d.j3},${d.t0},${d.t1},${d.t2},${d.t3},${d.err},${d.load},${d.pwr}`
        ).join('\n');

        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `JAR_Telemetry_Exp_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.triggerAlert('實驗數據 CSV 已成功生成並下載！', 'success');
    }

    _mountGraphicalTelemetry() {
        if (this.currentMode !== 'research') return;

        const container = document.createElement('div');
        container.id = 'graph-telemetry';
        container.style.cssText = `
            margin-top: 6px;
            width: 290px;
            background: rgba(2, 8, 16, 0.9);
            border: 1px solid rgba(0, 229, 255, 0.2);
            border-radius: 4px;
            padding: 6px 10px;
            pointer-events: none;
        `;
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:9px; color:#557788;">
                <span>即時負載波形 (N)</span>
                <span id="graph-max" style="color:#00e5ff; font-weight:bold;">0.0</span>
            </div>
            <canvas id="load-chart" width="270" height="28" style="width:100%; height:28px; margin: 2px 0;"></canvas>
            <div style="display:flex; justify-content:space-between; font-size:9px; color:#557788;">
                <span>FFT 頻譜分析 (0 - 30 Hz 模態)</span>
                <span id="graph-fft-peak" style="color:#ff9100; font-weight:bold;">0.0 Hz</span>
            </div>
            <canvas id="fft-chart" width="270" height="28" style="width:100%; height:28px;"></canvas>
        `;

        const hud = document.getElementById('hud');
        if (hud) hud.insertBefore(container, hud.children[2] || null);
    }

    _mountAlertSystem() {
        if (document.getElementById('alert-container')) return;
        const alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.cssText = `
            position: absolute;
            top: 75px;
            right: 20px;
            width: 240px;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 6px;
            z-index: 120;
        `;
        document.body.appendChild(alertContainer);
    }

    triggerAlert(message, level = 'warning') {
        const container = document.getElementById('alert-container');
        if (!container) return;

        const colors = {
            info: { bg: 'rgba(0,229,255,0.18)', border: '#00e5ff', text: '#88ccdd' },
            warning: { bg: 'rgba(255,145,0,0.22)', border: '#ff9100', text: '#ff9100' },
            danger: { bg: 'rgba(255,61,0,0.28)', border: '#ff3d00', text: '#ff4444' },
            success: { bg: 'rgba(0,255,100,0.18)', border: '#00ff66', text: '#00ff66' }
        };

        const style = colors[level] || colors.info;
        const alert = document.createElement('div');
        alert.style.cssText = `
            background: ${style.bg};
            border: 1px solid ${style.border};
            border-left: 4px solid ${style.border};
            border-radius: 4px;
            padding: 8px 12px;
            color: ${style.text};
            font-size: 11px;
            font-family: monospace;
            backdrop-filter: blur(6px);
            animation: slideInAlert 0.3s ease-out;
            pointer-events: auto;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        alert.textContent = `⚠ ${message}`;
        alert.onclick = () => alert.remove();

        container.appendChild(alert);

        setTimeout(() => {
            if (alert.parentElement) alert.remove();
        }, 4500);
    }

    playDialogue(key, mode, color = "#00e5ff") {
        const dict = I18N[this.currentLang] || I18N.zh;
        const fullKey = mode ? `jar_${key}_${mode}` : `jar_${key}`;
        const text = dict[fullKey] || key;

        const box = document.getElementById('jar-dialogue');
        const textEl = document.getElementById('jar-text');
        if (!box || !textEl) return;

        box.style.display = 'block';
        box.style.borderColor = color;
        box.style.borderLeftColor = color;
        const titleEl = document.getElementById('jar-title');
        if (titleEl) titleEl.style.color = color;

        clearInterval(this.typewriterInterval);
        textEl.innerText = "";
        let i = 0;
        this.typewriterInterval = setInterval(() => {
            textEl.innerText += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(this.typewriterInterval);
                setTimeout(() => {
                    if (textEl.innerText === text) box.style.display = 'none';
                }, 4500);
            }
        }, 28);
    }

    setLanguage(lang) {
        this.currentLang = lang;
        const dict = I18N[lang] || I18N.zh;
        const header = document.getElementById('tel-header');
        if (header) {
            const modeLabels = {
                kid: lang === 'zh' ? '🌱 農業採摘 · 力學回饋' : '🌱 Agriculture Telemetry',
                advanced: lang === 'zh' ? '🏭 工業組裝 · 精密定位' : '🏭 Factory Telemetry',
                research: lang === 'zh' ? '🧪 科研實驗 · 數據採集與遙測' : '🧪 Quantum Research Telemetry'
            };
            header.innerText = modeLabels[this.currentMode] || dict.telemetryTitle;
        }
    }

    // ============================================================
    // 數據更新與統計分析主循環
    // ============================================================
    update(targetPos, armData, mission, intensity = 0, jointAngles = [], torques = [0, 0, 0, 0]) {
        if (!targetPos) return;

        const now = performance.now();
        const delta = Math.max(1, now - this._lastTime);
        this._lastTime = now;
        const fps = Math.round(1000 / delta);

        const fpsEl = document.getElementById('tel-fps');
        if (fpsEl) fpsEl.textContent = `${fps} FPS`;

        // 坐標
        const xEl = document.getElementById('dat-pos-x');
        if (xEl) xEl.textContent = targetPos.x.toFixed(2);
        const yEl = document.getElementById('dat-pos-y');
        if (yEl) yEl.textContent = targetPos.y.toFixed(2);
        const zEl = document.getElementById('dat-pos-z');
        if (zEl) zEl.textContent = targetPos.z.toFixed(2);
        const rEl = document.getElementById('dat-reach');
        if (rEl) rEl.textContent = Math.hypot(targetPos.x, targetPos.z).toFixed(2);

        // 關節角度與力矩
        if (this.currentMode === 'research') {
            jointAngles.forEach((angle, idx) => {
                const el = document.getElementById(`dat-joint-${idx}`);
                const torqEl = document.getElementById(`dat-torq-${idx}`);
                if (el) el.textContent = `${(angle * 180 / Math.PI).toFixed(1)}°`;
                if (torqEl) torqEl.textContent = `(${torques[idx].toFixed(1)}N·m)`;
            });
        }

        // 追蹤誤差與 95% 信心區間統計 (Uncertainty Quantification)
        let currentErr = 0;
        if (armData?.endEffector) {
            currentErr = armData.endEffector.position.distanceTo(targetPos);
            this.historyData.errors.push(currentErr);
            if (this.historyData.errors.length > this.maxHistory) this.historyData.errors.shift();
        }

        const errStats = this._computeErrorStats();
        const errEl = document.getElementById('dat-error');
        if (errEl && errStats) {
            errEl.textContent = `${errStats.mean.toFixed(3)}±${errStats.ci95.toFixed(3)}`;
            errEl.style.color = errStats.mean > 0.05 ? '#ff3d00' : errStats.mean > 0.02 ? '#ff9100' : '#00ff66';
        }

        // 負載與功耗
        const isSecured = mission?.isSecured || false;
        const currentLoad = isSecured ? (24.0 + Math.sin(now * 0.01) * 2.2) : 0.0;
        const currentPower = Math.round((isSecured ? 75 : 35) + (intensity || 0) * 120);

        const loadEl = document.getElementById('dat-load');
        if (loadEl) {
            loadEl.textContent = `${currentLoad.toFixed(1)} N`;
            loadEl.style.color = isSecured ? '#ff9100' : '#00ff66';
        }

        const pwrEl = document.getElementById('dat-pwr');
        if (pwrEl) pwrEl.textContent = `${currentPower} W`;

        // 寫入 CSV 緩存
        if (this.isRecording) {
            this.sessionData.push({
                time: (now - this.recordStartTime).toFixed(1),
                x: targetPos.x.toFixed(4),
                y: targetPos.y.toFixed(4),
                z: targetPos.z.toFixed(4),
                j0: (jointAngles[0] || 0).toFixed(4),
                j1: (jointAngles[1] || 0).toFixed(4),
                j2: (jointAngles[2] || 0).toFixed(4),
                j3: (jointAngles[3] || 0).toFixed(4),
                t0: (torques[0] || 0).toFixed(2),
                t1: (torques[1] || 0).toFixed(2),
                t2: (torques[2] || 0).toFixed(2),
                t3: (torques[3] || 0).toFixed(2),
                err: currentErr.toFixed(4),
                load: currentLoad.toFixed(2),
                pwr: currentPower
            });
        }

        // 科研圖表 (負載時域 + FFT 頻域)
        if (this.currentMode === 'research') {
            this._updateCharts(currentLoad);
        }
    }

    _computeErrorStats() {
        const arr = this.historyData.errors;
        if (arr.length < 2) return null;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const std = Math.sqrt(arr.reduce((s, e) => s + (e - mean) ** 2, 0) / arr.length);
        const ci95 = 1.96 * (std / Math.sqrt(arr.length));
        return { mean, std, ci95 };
    }

    _updateCharts(loadValue) {
        const loadCanvas = document.getElementById('load-chart');
        const fftCanvas = document.getElementById('fft-chart');
        if (!loadCanvas || !fftCanvas) return;

        this.historyData.load.push(loadValue);
        if (this.historyData.load.length > this.maxHistory) this.historyData.load.shift();

        const ctx = loadCanvas.getContext('2d');
        const fctx = fftCanvas.getContext('2d');
        const w = loadCanvas.width;
        const h = loadCanvas.height;

        // 1. 繪製負載時域圖
        ctx.clearRect(0, 0, w, h);
        this._drawChart(ctx, this.historyData.load, w, h, '#00e5ff', 'rgba(0, 229, 255, 0.08)');

        // 2. 實時 FFT 頻譜分析
        const fftMags = this._computeSimpleFFT(this.historyData.load);
        fctx.clearRect(0, 0, w, h);
        this._drawFFTSpectrum(fctx, fftMags, w, h);

        const maxLoad = Math.max(...this.historyData.load, 1);
        const maxLoadEl = document.getElementById('graph-max');
        if (maxLoadEl) maxLoadEl.textContent = `${maxLoad.toFixed(1)} N`;
    }

    // 簡化版離散傅立葉變換 (DFT/FFT)
    _computeSimpleFFT(signal) {
        const N = signal.length;
        if (N < 8) return new Array(16).fill(0);

        const half = Math.floor(N / 2);
        const mags = new Float32Array(half);

        for (let k = 0; k < half; k++) {
            let re = 0;
            let im = 0;
            for (let n = 0; n < N; n++) {
                const phi = (2 * Math.PI * k * n) / N;
                re += signal[n] * Math.cos(phi);
                im -= signal[n] * Math.sin(phi);
            }
            mags[k] = Math.hypot(re, im) / N;
        }
        return mags;
    }

    _drawFFTSpectrum(ctx, mags, w, h) {
        ctx.fillStyle = 'rgba(255, 145, 0, 0.08)';
        ctx.fillRect(0, 0, w, h);

        const numBars = mags.length;
        const barWidth = w / numBars;
        let peakFreq = 0;
        let maxMag = 0.001;

        for (let i = 1; i < numBars; i++) {
            if (mags[i] > maxMag) {
                maxMag = mags[i];
                // 取樣率約 60Hz，Nyquist 頻率 30Hz
                peakFreq = (i / numBars) * 30;
            }
        }

        const freqEl = document.getElementById('dat-freq');
        const peakEl = document.getElementById('graph-fft-peak');
        if (freqEl) freqEl.textContent = `${peakFreq.toFixed(1)} Hz`;
        if (peakEl) peakEl.textContent = `${peakFreq.toFixed(1)} Hz (主模態)`;

        for (let i = 0; i < numBars; i++) {
            const barH = (mags[i] / maxMag) * (h - 2);
            ctx.fillStyle = i === 0 ? '#557788' : '#ff9100';
            ctx.fillRect(i * barWidth, h - barH, barWidth - 1, barH);
        }
    }

    _drawChart(ctx, data, w, h, color, bgColor) {
        if (data.length < 2) return;
        const maxVal = Math.max(...data, 1);
        const len = data.length;
        const step = w / Math.max(len - 1, 1);

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        for (let i = 0; i < len; i++) {
            const x = i * step;
            const y = h - (data[i] / maxVal) * (h - 4) - 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}
