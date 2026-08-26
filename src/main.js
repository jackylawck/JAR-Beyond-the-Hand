import { SceneManager } from './core/SceneManager.js';
import { MainController } from './core/MainController.js';

let sceneMgr = null;
let controller = null;
let currentMode = 'kid';
let currentLang = 'zh';

function startApp(mode) {
    if (controller) {
        controller.dispose();
    }
    if (sceneMgr) {
        sceneMgr.dispose();
    }

    const container = document.getElementById('canvas-container');
    container.innerHTML = '';

    sceneMgr = new SceneManager('canvas-container', mode);
    controller = new MainController(sceneMgr, mode);
    controller.init();
    controller.setLanguage(currentLang);
}

window.addEventListener('DOMContentLoaded', () => {
    // 1. 啟動預設兒童模式
    startApp(currentMode);

    // 2. 模式切換 Modal 綁定
    const modal = document.getElementById('mode-selector');
    const btnSwitch = document.getElementById('btn-switch-mode');
    const btnClose = document.getElementById('btn-close-modal');

    if (btnSwitch && modal) {
        btnSwitch.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const m = card.getAttribute('data-mode');
            if (m) {
                currentMode = m;
                startApp(currentMode);
                if (modal) modal.style.display = 'none';
            }
        });
    });

    // 3. 雙語即時熱切換按鈕
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = (currentLang === 'zh') ? 'en' : 'zh';
            if (controller) {
                controller.setLanguage(currentLang);
            }
        });
    }
});
