import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';
import { I18N } from './config/i18n.js';

// 1. 初始化場景
const sceneManager = new SceneManager('canvas-container');

// 2. 初始化主控制器
const app = new MainController(sceneManager);
app.init();

// 3. 雙語切換綁定
let currentLang = localStorage.getItem('beyond-lang') || 'zh';
const langBtn = document.getElementById('lang-btn');

function updateLang(lang) {
    currentLang = lang;
    localStorage.setItem('beyond-lang', lang);
    const dict = I18N[lang] || I18N.zh;
    if (langBtn) langBtn.innerText = dict.langBtn;
    app.setLanguage(lang);
}

if (langBtn) {
    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateLang(currentLang === 'zh' ? 'en' : 'zh');
    });
}

updateLang(currentLang);
window.__app = app;
