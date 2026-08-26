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

function initWhenReady() {
    startApp(currentMode);

    const modal = document.getElementById('mode-selector');
    const btnSwitch = document.getElementById('btn-switch-mode');
    const btnClose = document.getElementById('btn-close-modal');

    if (btnSwitch && modal) {
        btnSwitch.onclick = (e) => {
            e.stopPropagation();
            modal.style.display = 'flex';
        };
    }

    if (btnClose && modal) {
        btnClose.onclick = (e) => {
            e.stopPropagation();
            modal.style.display = 'none';
        };
    }

    document.querySelectorAll('.mode-card').forEach(card => {
        card.onclick = (e) => {
            e.stopPropagation();
            const m = card.getAttribute('data-mode');
            if (m) {
                currentMode = m;
                startApp(currentMode);
                if (modal) modal.style.display = 'none';
            }
        };
    });

    const langBtn = document.getElementById('lang-btn');
    if (langBtn) {
        langBtn.onclick = (e) => {
            e.stopPropagation();
            currentLang = (currentLang === 'zh') ? 'en' : 'zh';
            if (controller) {
                controller.setLanguage(currentLang);
            }
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
    initWhenReady();
}
