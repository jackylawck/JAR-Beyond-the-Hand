import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';
import { I18N } from './config/i18n.js';

// 1. 初始化場景管理器
const sceneManager = new SceneManager('canvas-container');

// 2. 初始化主控制器
const app = new MainController(sceneManager);
app.init();

// 3. 雙語即時切換邏輯
let currentLang = 'zh';
const langBtn = document.getElementById('lang-btn');

function updateLangUI(lang) {
    currentLang = lang;
    const dict = I18N[lang];
    if (!dict) return;

    const titleEl = document.querySelector('.hud-title');
    const missionTitleEl = document.getElementById('mission-title');
    const viewHintEl = document.getElementById('view-hint');
    const gripBtnEl = document.getElementById('btn-grip');

    if (titleEl) titleEl.innerText = dict.title;
    if (missionTitleEl) missionTitleEl.innerText = dict.missionHeader;
    if (viewHintEl) viewHintEl.innerText = dict.viewHint;
    if (gripBtnEl) gripBtnEl.innerText = dict.gripBtn;
    if (langBtn) langBtn.innerText = dict.langBtn;

    app.setLanguage(lang);
}

if (langBtn) {
    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateLangUI(currentLang === 'zh' ? 'en' : 'zh');
    });
}

updateLangUI('zh');
window.__app = app;
