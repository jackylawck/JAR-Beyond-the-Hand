/**
 * J.A.R. 在手之上 3D — 科研級入口點
 * 所有子系統透過依賴注入組裝，可測試、可替換
 */
import { ConfigManager } from './core/ConfigManager.js';
import { SceneManager } from './core/SceneManager.js';
import { ErrorBoundary } from './core/ErrorBoundary.js';
import { MainController } from './core/MainController.js';

// 1. 讀取 URL 參數 / localStorage
const urlParams = new URLSearchParams(window.location.search);
const level = urlParams.get('level') || localStorage.getItem('beyond-level') || 'kid';
const lang = urlParams.get('lang') || localStorage.getItem('beyond-lang') || 'zh';

// 2. 初始化配置
const config = new ConfigManager(level, lang);

// 3. 初始化場景
const scene = new SceneManager('canvas-container');

// 4. 初始化錯誤邊界 (掛載到 HUD)
const hudElement = document.getElementById('hud');
const errorBoundary = new ErrorBoundary(hudElement);

// 5. 組裝控制器 (依賴注入)
const app = new MainController(config, scene, errorBoundary);
app.init();

// 6. 暴露到全域以便除錯
window.__app = app;
window.__config = config;
