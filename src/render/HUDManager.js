import { I18N } from '../config/i18n.js';

export class HUDManager {
    constructor() {
        this.dom = {};
        this.mode = 'kid';
        this.lang = 'zh';
        this.recordedData = [];
        this._lastRecordTime = 0;
    }

    init(mode = 'kid') {
        this.mode = mode;
        this.recordedData = [];

        this.dom = {
            valX: document.getElementById('top-val-x'),
            valY: document.getElementById('top-val-y'),
            valZ: document.getElementById('top-val-z'),
            valR: document.getElementById('top-val-r'),
            valErr: document.getElementById('top-val-err'),
            missionTip: document.getElementById('compact-mission-tip'),
            btnLang: document.getElementById('lang-btn'),
            
            // 科研專屬數據面板節點
            resPanel: document.getElementById('research-data-panel'),
            resPos: document.getElementById('res-pos'),
            resJoints: document.getElementById('res-joints'),
            resVel: document.getElementById('res-vel'),
            resErr: document.getElementById('res-err')
        };

        if (this.dom.resPanel) {
            this.dom.resPanel.style.display = (this.mode === 'research') ? 'block' : 'none';
        }

        this.setLanguage(this.lang);
    }

    setLanguage(lang) {
        this.lang = lang;
        const t = I18N[lang] || I18N.zh;
        if (!t) return;

        if (this.dom.btnLang) this.dom.btnLang.innerText = t.langBtn || '🌐 EN';
        if (this.dom.missionTip) {
            if (this.mode === 'kid') this.dom.missionTip.innerText = `🍓 ${t.missionKid || '初熟草莓'} ｜ ${t.missionKidDesc || '移動夾爪至上方按下 GRIP'}`;
            else if (this.mode === 'advanced') this.dom.missionTip.innerText = `📱 ${t.missionAdv || '3C 核心晶片'} ｜ ${t.missionAdvDesc || '精密對位後夾取放入卡槽'}`;
            else this.dom.missionTip.innerText = `🧪 ${t.missionRes || '同位素晶球'} ｜ ${t.missionResDesc || '高精度採樣並記錄遙測數據'}`;
        }
    }

    update(targetPos, armData, mission, intensity, jointAngles, torques) {
        if (!this.dom.valX) return;

        const r = Math.hypot(targetPos.x, targetPos.z);
        const err = mission?.getDistance ? mission.getDistance() : (mission?.currentDistance || 0);

        // 頂部通用數據條
        this.dom.valX.innerText = targetPos.x.toFixed(2);
        this.dom.valY.innerText = targetPos.y.toFixed(2);
        this.dom.valZ.innerText = targetPos.z.toFixed(2);
        this.dom.valR.innerText = r.toFixed(2);
        this.dom.valErr.innerText = err.toFixed(2);

        // 科研面板動態數值
        if (this.mode === 'research' && this.dom.resPos) {
            this.dom.resPos.innerText = `(${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)})`;
            if (jointAngles && this.dom.resJoints) {
                this.dom.resJoints.innerText = Array.from(jointAngles).map(a => (a * 180 / Math.PI).toFixed(1)).join('°, ');
            }
            if (this.dom.resVel) {
                this.dom.resVel.innerText = (intensity * 1.8).toFixed(2);
            }
            if (this.dom.resErr) {
                this.dom.resErr.innerText = err.toFixed(3);
            }
        }

        // 🌟 自動採樣記錄 (每 50ms 記錄一筆，最大緩存 6000 筆)
        const now = performance.now();
        if (now - this._lastRecordTime >= 50) {
            this._lastRecordTime = now;
            this.recordedData.push({
                time: now.toFixed(1),
                x: targetPos.x.toFixed(3),
                y: targetPos.y.toFixed(3),
                z: targetPos.z.toFixed(3),
                j0: jointAngles ? (jointAngles[0] * 180 / Math.PI).toFixed(2) : 0,
                j1: jointAngles ? (jointAngles[1] * 180 / Math.PI).toFixed(2) : 0,
                j2: jointAngles ? (jointAngles[2] * 180 / Math.PI).toFixed(2) : 0,
                j3: jointAngles ? (jointAngles[3] * 180 / Math.PI).toFixed(2) : 0,
                err: err.toFixed(3),
                secured: mission?.isSecured ? 1 : 0
            });

            if (this.recordedData.length > 6000) {
                this.recordedData.shift();
            }
        }
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

        const headers = ['Timestamp(ms)', 'X(m)', 'Y(m)', 'Z(m)', 'J0(deg)', 'J1(deg)', 'J2(deg)', 'J3(deg)', 'Error(m)', 'Secured'];
        let csvContent = headers.map(h => this._sanitizeCSVField(h)).join(',') + '\r\n';

        this.recordedData.forEach(row => {
            const line = [
                this._sanitizeCSVField(row.time),
                this._sanitizeCSVField(row.x),
                this._sanitizeCSVField(row.y),
                this._sanitizeCSVField(row.z),
                this._sanitizeCSVField(row.j0),
                this._sanitizeCSVField(row.j1),
                this._sanitizeCSVField(row.j2),
                this._sanitizeCSVField(row.j3),
                this._sanitizeCSVField(row.err),
                this._sanitizeCSVField(row.secured)
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
