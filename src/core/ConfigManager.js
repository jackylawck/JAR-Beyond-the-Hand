/**
 * 配置管理器：支援兒童/進階/科研三級模式無縫切換
 * 所有數值參數集中管理，杜絕硬編碼
 */
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
            gripper: { open: 0.08, closed: 0.01, lerpSpeed: 0.25 },
            audio: { motorGain: 0.05, baseFreq: 45, maxFreq: 145 },
            mission: { magneticRange: 0.35, magneticStrength: 6.0, socketTolerance: 0.32 }
        };

        const levelOverrides = {
            'kid': {
                mission: { magneticRange: 0.42, magneticStrength: 8.0 },
                ik: { damping: 0.25 }
            },
            'advanced': {
                mission: { magneticRange: 0.25, magneticStrength: 3.0 },
                ik: { damping: 0.40 }
            },
            'research': {
                mission: { magneticRange: 0.0, magneticStrength: 0.0 },
                ik: { damping: 0.60, iterations: 5 },
                camera: { smoothness: 2.0 }
            }
        };

        return this._deepMerge(base, levelOverrides[level] || {});
    }

    _deepMerge(base, override) {
        const result = { ...base };
        for (const key of Object.keys(override)) {
            if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
                result[key] = this._deepMerge(base[key] || {}, override[key]);
            } else {
                result[key] = override[key];
            }
        }
        return result;
    }

    _loadI18n(lang) {
        const dict = {
            'zh': {
                statusReady: '系統就緒',
                statusSecured: '核心已捕獲',
                statusDelivered: '任務完成 🎉',
                missionKid: '推動搖桿接近方舟核心，夾爪具備智能輔助磁吸。',
                missionAdvanced: '手動控制末端執行器，將核心精確放入槽位。',
                missionResearch: '無輔助模式。記錄軌跡誤差，分析 IK 解算精度。'
            },
            'en': {
                statusReady: 'SYSTEM READY',
                statusSecured: 'CORE SECURED',
                statusDelivered: 'MISSION COMPLETE 🎉',
                missionKid: 'Move joystick to approach the core. Smart magnetic assist enabled.',
                missionAdvanced: 'Manual end-effector control. Place core into socket.',
                missionResearch: 'No-assist mode. Log trajectory error, analyze IK precision.'
            }
        };
        return dict[lang] || dict['en'];
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this._config);
    }

    t(key) {
        return this._i18n[key] || key;
    }

    getLevel() { return this.level; }
    getLang() { return this.lang; }
}
