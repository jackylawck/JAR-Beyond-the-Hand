import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';
import { I18N } from './config/i18n.js';

const sceneManager = new SceneManager('canvas-container');
const app = new MainController(null, sceneManager, null);
app.init();

let currentLang = localStorage.getItem('beyond-lang') || 'zh';
const langBtn = document.getElementById('lang-btn');

function updateLangUI(lang) {
    currentLang = lang;
    localStorage.setItem('beyond-lang', lang);
    const dict = I18N[lang] || I18N.zh;

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

updateLangUI(currentLang);
window.__app = app;
