export class ConfigManager {
    constructor(level = 'kid', lang = 'zh') {
        this.level = level;
        this.lang = lang;
        this._config = this._mergeConfigs(level);
        this._i18n = this._loadI18n(lang);
    }

    _mergeConfigs(level) {
        const base = {
            moveSpeed: 1.9,
            workspace: { yMin: 0.32, yMax: 2.6, radius: 2.1 },
            camera: {
                posWeight: 0.35, heightOffset: 2.6, depthOffset: 4.2,
                smoothness: 3.5, lookAtWeight: 0.2, lookAtYOffset: 0.8
            },
            ik: { iterations: 3, damping: 0.4, maxDelta: 0.12 },
            gripper: { open: 0.08, closed: 0.01, lerpSpeed: 0.25 }
        };

        const overrides = {
            'kid': { ik: { damping: 0.25 } },
            'advanced': { ik: { damping: 0.40 } },
            'research': { ik: { damping: 0.60, iterations: 5 } }
        };

        return { ...base, ...(overrides[level] || {}) };
    }

    _loadI18n(lang) {
        const dict = {
            'zh': {
                statusReady: 'SYSTEM READY',
                missionKid: '推動搖桿抓住量子能量核心，安裝至右側槽位！',
                missionAdvanced: '手動控制末端執行器，將量子核心精確放入槽位。',
                missionResearch: '無輔助模式。記錄軌跡誤差，分析 IK 精度。'
            },
            'en': {
                statusReady: 'SYSTEM READY',
                missionKid: 'Move joystick to secure the Quantum Core and dock it into the socket.',
                missionAdvanced: 'Manual end-effector control. Place core into socket.',
                missionResearch: 'No-assist mode. Log trajectory error, analyze IK precision.'
            }
        };
        return dict[lang] || dict['zh'];
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this._config);
    }

    t(key) {
        return this._i18n[key] || key;
    }

    getLevel() { return this.level; }
}
