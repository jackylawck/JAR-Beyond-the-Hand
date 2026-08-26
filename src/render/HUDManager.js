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
        this.dom = {
            valX: document.getElementById('top-val-x'),
            valY: document.getElementById('top-val-y'),
            valZ: document.getElementById('top-val-z'),
            valR: document.getElementById('top-val-r'),
            valErr: document.getElementById('top-val-err'),
            valFps: document.getElementById('top-val-fps'),
            missionTip: document.getElementById('compact-mission-tip'),
            btnSwitch: document.getElementById('btn-switch-mode'),
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
}
