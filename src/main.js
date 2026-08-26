import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';

let sceneMgr = null;
let controller = null;
let currentMode = 'kid';
let currentLang = 'zh';

function startApp(mode) {
    try {
        if (controller) {
            controller.dispose();
            controller = null;
        }
        if (sceneMgr) {
            sceneMgr.dispose();
            sceneMgr = null;
        }

        const container = document.getElementById('canvas-container');
        if (container) {
            container.innerHTML = '';
        }

        sceneMgr = new SceneManager('canvas-container', mode);
        controller = new MainController(sceneMgr, mode);
        controller.init();
        controller.setLanguage(currentLang);
    } catch (err) {
        console.error("Simulation Start Error:", err);
    }
}

// 🌟 核心修復：ES Module 直接執行，確保 iOS Safari 100% 啟動
startApp(currentMode);

// 綁定 UI 切換邏輯
const modal = document.getElementById('mode-selector');
const btnSwitch = document.getElementById('btn-switch-mode');
const btnClose = document.getElementById('btn-close-modal');

if (btnSwitch && modal) {
    btnSwitch.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.style.display = 'flex';
    });
}

if (btnClose && modal) {
    btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.style.display = 'none';
    });
}

document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = card.getAttribute('data-mode');
        if (m) {
            currentMode = m;
            startApp(currentMode);
            if (modal) modal.style.display = 'none';
        }
    });
});

const langBtn = document.getElementById('lang-btn');
if (langBtn) {
    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentLang = (currentLang === 'zh') ? 'en' : 'zh';
        if (controller) {
            controller.setLanguage(currentLang);
        }
    });
}
