import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';
import { I18N } from './config/i18n.js';

let app = null;
let currentLang = localStorage.getItem('beyond-lang') || 'zh';
let currentMode = localStorage.getItem('jar-mode') || 'kid'; // 預設兒童模式

const modeSelector = document.getElementById('mode-selector');
const modeCards = document.querySelectorAll('.mode-card');
const btnSwitchMode = document.getElementById('btn-switch-mode');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnRestart = document.getElementById('btn-restart');

// 轉場遮罩
const fader = document.createElement('div');
fader.style.cssText = `position:fixed; top:0; left:0; width:100vw; height:100vh; background:#000; opacity:0; pointer-events:none; transition:opacity 0.35s; z-index:999;`;
document.body.appendChild(fader);

// 🌟 點擊頂部「🔀 切換模式」按鈕彈出選單
if (btnSwitchMode) {
    btnSwitchMode.addEventListener('click', () => {
        modeSelector.style.display = 'flex';
    });
}

if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
        modeSelector.style.display = 'none';
    });
}

// 選擇新模式進行切換
modeCards.forEach(card => {
    card.addEventListener('click', () => {
        const selectedMode = card.dataset.mode;
        modeSelector.style.display = 'none';
        switchMode(selectedMode);
    });
});

btnRestart.addEventListener('click', () => {
    document.getElementById('result-overlay').style.display = 'none';
    switchMode(currentMode);
});

function switchMode(newMode) {
    currentMode = newMode;
    localStorage.setItem('jar-mode', newMode);

    fader.style.opacity = '1';
    fader.style.pointerEvents = 'all';

    setTimeout(() => {
        if (app) app.dispose?.();
        const container = document.getElementById('canvas-container');
        if (container) container.innerHTML = '';

        // 移除舊的動態 HUD 元素
        document.getElementById('telemetry-box')?.remove();
        document.getElementById('graph-telemetry')?.remove();

        startApp(newMode);
        startBriefing(newMode);

        setTimeout(() => {
            fader.style.opacity = '0';
            fader.style.pointerEvents = 'none';
        }, 100);
    }, 350);
}

function startBriefing(mode) {
    const dict = I18N[currentLang] || I18N.zh;
    const textMap = { kid: 'briefingKid', advanced: 'briefingAdv', research: 'briefingRes' };
    
    const overlay = document.getElementById('briefing-overlay');
    overlay.style.display = 'flex';
    document.getElementById('briefing-text').innerText = dict[textMap[mode]] || '';
    
    let count = 2;
    const countEl = document.getElementById('briefing-countdown');
    countEl.innerText = count;

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countEl.innerText = count;
        } else {
            clearInterval(interval);
            overlay.style.display = 'none';
            if (app && app.mission) app.mission.startGame();
        }
    }, 800);
}

function startApp(mode) {
    const sceneManager = new SceneManager('canvas-container', mode);
    app = new MainController(sceneManager, mode);
    app.init();

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.onclick = (e) => {
            e.stopPropagation();
            updateLangUI(currentLang === 'zh' ? 'en' : 'zh');
        };
    }
    updateLangUI(currentLang);
    window.__app = app;
}

function updateLangUI(lang) {
    currentLang = lang;
    localStorage.setItem('beyond-lang', lang);
    const dict = I18N[lang] || I18N.zh;

    const titleEl = document.querySelector('.hud-title');
    const viewHintEl = document.getElementById('view-hint');
    const gripBtnEl = document.getElementById('btn-grip');
    const langBtnEl = document.getElementById('lang-btn');
    const switchBtnEl = document.getElementById('btn-switch-mode');

    if (titleEl) titleEl.innerText = dict.title;
    if (viewHintEl) viewHintEl.innerText = dict.viewHint;
    if (gripBtnEl) gripBtnEl.innerText = dict.gripBtn;
    if (langBtnEl) langBtnEl.innerText = dict.langBtn;
    if (switchBtnEl) switchBtnEl.innerText = lang === 'zh' ? '🔀 切換模式' : '🔀 Switch Mode';

    if (app) app.setLanguage(lang);
}

// 🌟 開啟網頁即刻進入（零黑屏等待）
startApp(currentMode);
startBriefing(currentMode);
