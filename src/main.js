import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';
import { I18N } from './config/i18n.js';

let app = null;
let currentLang = localStorage.getItem('beyond-lang') || 'zh';

// 1. 處理模式選擇 UI
const modeSelector = document.getElementById('mode-selector');
const modeCards = document.querySelectorAll('.mode-card');

modeCards.forEach(card => {
    card.addEventListener('click', () => {
        const selectedMode = card.dataset.mode;
        // 隱藏 UI
        modeSelector.style.opacity = '0';
        setTimeout(() => {
            modeSelector.style.display = 'none';
            startApp(selectedMode);
        }, 600);
    });
});

// 2. 啟動遊戲核心
function startApp(mode) {
    const sceneManager = new SceneManager('canvas-container', mode);
    app = new MainController(sceneManager, mode);
    app.init();

    // 綁定雙語切換
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateLangUI(currentLang === 'zh' ? 'en' : 'zh', mode);
        });
    }

    updateLangUI(currentLang, mode);
    window.__app = app;
}

// 3. 更新介面語言
function updateLangUI(lang, mode) {
    currentLang = lang;
    localStorage.setItem('beyond-lang', lang);
    const dict = I18N[lang] || I18N.zh;

    const titleEl = document.querySelector('.hud-title');
    const missionTitleEl = document.getElementById('mission-title');
    const viewHintEl = document.getElementById('view-hint');
    const gripBtnEl = document.getElementById('btn-grip');
    const langBtnEl = document.getElementById('lang-btn');

    if (titleEl) titleEl.innerText = dict.title;
    if (viewHintEl) viewHintEl.innerText = dict.viewHint;
    if (gripBtnEl) gripBtnEl.innerText = dict.gripBtn;
    if (langBtnEl) langBtnEl.innerText = dict.langBtn;

    // 根據模式設定對應任務標題
    if (missionTitleEl && app && app.mission && app.mission.target) {
        // 中文直接用 label，英文可根據 mode 給予對應字眼
        const labels = {
            kid: { zh: '🍓 農業採摘任務', en: '🍓 Harvest Mission' },
            advanced: { zh: '📱 3C 組裝任務', en: '📱 Assembly Mission' },
            research: { zh: '🧪 實驗室抽樣任務', en: '🧪 Lab Sampling' }
        };
        missionTitleEl.innerText = labels[mode][lang];
    }

    if (app) app.setLanguage(lang);
}
