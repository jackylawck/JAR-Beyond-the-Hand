import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';
import { I18N } from './config/i18n.js';

let app = null;
let currentLang = localStorage.getItem('beyond-lang') || 'zh';

const modeSelector = document.getElementById('mode-selector');
const modeCards = document.querySelectorAll('.mode-card');

// 🌟 微調 3：建立全螢幕 0.5s 平滑轉場過渡遮罩
const fader = document.createElement('div');
fader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 999;
`;
document.body.appendChild(fader);

modeCards.forEach(card => {
    card.addEventListener('click', () => {
        const selectedMode = card.dataset.mode;
        
        // 觸發黑幕淡入
        fader.style.opacity = '1';
        fader.style.pointerEvents = 'all';

        setTimeout(() => {
            modeSelector.style.display = 'none';
            
            // 銷毀舊實例以防記憶體洩漏
            if (app) app.dispose?.();
            const container = document.getElementById('canvas-container');
            if (container) container.innerHTML = '';

            // 啟動新模式
            startApp(selectedMode);

            // 黑幕淡出
            setTimeout(() => {
                fader.style.opacity = '0';
                fader.style.pointerEvents = 'none';
            }, 100);
        }, 450);
    });
});

function startApp(mode) {
    const sceneManager = new SceneManager('canvas-container', mode);
    app = new MainController(sceneManager, mode);
    app.init();

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

    if (missionTitleEl) {
        const labels = {
            kid: { zh: '🍓 農業精準採摘任務', en: '🍓 Harvest Mission' },
            advanced: { zh: '📱 3C 精密組裝任務', en: '📱 Assembly Mission' },
            research: { zh: '🧪 實驗室自動化抽樣', en: '🧪 Lab Sampling' }
        };
        missionTitleEl.innerText = labels[mode]?.[lang] || dict.missionHeader;
    }

    if (app) app.setLanguage(lang);
}
