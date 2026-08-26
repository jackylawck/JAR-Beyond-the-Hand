import { ConfigManager } from './core/ConfigManager.js';
import { SceneManager } from './core/SceneManager.js';
import { ErrorBoundary } from './core/ErrorBoundary.js';
import { MainController } from './core/MainController.js';
import { I18N } from './config/i18n.js';

// 1. 初始化核心管理器
const urlParams = new URLSearchParams(window.location.search);
const lang = urlParams.get('lang') || localStorage.getItem('beyond-lang') || 'zh';

const config = new ConfigManager('kid', lang);
const sceneManager = new SceneManager('canvas-container');
const errorBoundary = new ErrorBoundary(document.getElementById('hud'));

// 2. 組裝主控制器並啟動
const app = new MainController(config, sceneManager, errorBoundary);
app.init();

// 3. 雙語即時切換邏輯
let currentLang = lang;
const langBtn = document.getElementById('lang-btn');

function applyLanguage(l) {
    currentLang = l;
    localStorage.setItem('beyond-lang', l);
    const dict = I18N[l];

    document.querySelector('.hud-title').innerText = dict.title;
    document.getElementById('mission-title').innerText = dict.missionHeader;
    document.getElementById('view-hint').innerText = dict.viewHint;
    document.getElementById('btn-grip').innerText = dict.gripBtn;
    langBtn.innerText = dict.langBtn;

    app.setLanguage(l);
}

langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    applyLanguage(currentLang === 'zh' ? 'en' : 'zh');
});

applyLanguage(currentLang);

// 導出全局除錯
window.__app = app;
window.__config = config;
