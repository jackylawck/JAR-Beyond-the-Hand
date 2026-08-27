import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor() {
        this.dom = {};
        this.mode = 'kid';
        this.lang = 'zh';
        this.recordedData = [];
    }

    init(mode = 'kid') {
        this.mode = mode;
        
        const oldPanel = document.getElementById('telemetry-panel');
        if (oldPanel) oldPanel.remove();

        this.dom = {
            valX: document.getElementById('top-val-x'),
            valY: document.getElementById('top-val-y'),
            valZ: document.getElementById('top-val-z'),
            valR: document.getElementById('top-val-r'),
            valErr: document.getElementById('top-val-err'),
            missionTip: document.getElementById('compact-mission-tip'),
            btnLang: document.getElementById('lang-btn')
        };
        this.setLanguage(this.lang);
    }

    setLanguage(lang) {
        this.lang = lang;
        const t = I18N[lang] || I18N.zh;
        if (!t) return;

        if (this.dom.btnLang) this.dom.btnLang.innerText = t.langBtn;
        if (this.dom.missionTip) {
            if (this.mode === 'kid') this.dom.missionTip.innerText = `🍓 ${t.missionKid} ｜ ${t.missionKidDesc}`;
            else if (this.mode === 'advanced') this.dom.missionTip.innerText = `📱 ${t.missionAdv} ｜ ${t.missionAdvDesc}`;
            else this.dom.missionTip.innerText = `🧪 ${t.missionRes} ｜ ${t.missionResDesc}`;
        }
    }

    update(targetPos, armData, mission, intensity, jointAngles, torques) {
        if (!this.dom.valX) return;

        this.dom.valX.innerText = targetPos.x.toFixed(2);
        this.dom.valY.innerText = targetPos.y.toFixed(2);
        this.dom.valZ.innerText = targetPos.z.toFixed(2);
        this.dom.valR.innerText = Math.hypot(targetPos.x, targetPos.z).toFixed(2);

        const err = mission?.currentDistance || 0;
        this.dom.valErr.innerText = err.toFixed(2);
    }

    _sanitizeCSVField(val) {
        let str = String(val ?? '');
        if (/^[=+\-@\t\r]/.test(str)) {
            str = `'${str}`;
        }
        if (/[",\n\r]/.test(str)) {
            str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    exportCSV() {
        if (this.recordedData.length === 0) {
            alert(this.lang === 'en' ? 'No telemetry data recorded yet!' : '尚未有已記錄的遙測數據！');
            return;
        }

        const headers = ['Timestamp(ms)', 'X(m)', 'Y(m)', 'Z(m)', 'Error(m)', 'Power(mW)', 'Payload(N)'];
        let csvContent = headers.map(h => this._sanitizeCSVField(h)).join(',') + '\r\n';

        this.recordedData.forEach(row => {
            const line = [
                this._sanitizeCSVField(row.time),
                this._sanitizeCSVField(row.x),
                this._sanitizeCSVField(row.y),
                this._sanitizeCSVField(row.z),
                this._sanitizeCSVField(row.err),
                this._sanitizeCSVField(row.power),
                this._sanitizeCSVField(row.payload)
            ];
            csvContent += line.join(',') + '\r\n';
        });

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `JAR_Telemetry_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }
}
