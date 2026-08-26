/**
 * 錯誤邊界：防止單一模組崩潰導致整個 App 白屏
 * 將錯誤訊息顯示喺 HUD 中，而非直接崩潰
 */
export class ErrorBoundary {
    constructor(hudElement) {
        this.hud = hudElement;
        this._originalOnError = window.onerror;
        this._originalUnhandledRejection = window.onunhandledrejection;
        this._bind();
    }

    _bind() {
        window.onerror = (message, source, lineno, colno, error) => {
            this._renderError(`🚨 ${message} (${source}:${lineno})`);
            // 仍然呼叫原先嘅 handler (如果有)
            if (this._originalOnError) {
                this._originalOnError(message, source, lineno, colno, error);
            }
            return true; // 阻止默認行為
        };

        window.onunhandledrejection = (event) => {
            this._renderError(`⚠️ Unhandled Promise Rejection: ${event.reason?.message || event.reason}`);
            if (this._originalUnhandledRejection) {
                this._originalUnhandledRejection(event);
            }
        };
    }

    _renderError(message) {
        if (!this.hud) return;
        this.hud.innerHTML = `
            <div style="background:rgba(255,0,0,0.2);border:1px solid #ff3d00;padding:8px 12px;border-radius:4px;color:#ff6b6b;font-size:11px;font-family:monospace;">
                <b>⚠️ SYSTEM ERROR</b><br>
                <span style="font-size:10px;">${message}</span>
                <br><small style="color:#888;">請重整頁面 (Refresh)</small>
            </div>
        ` + this.hud.innerHTML;
    }

    dispose() {
        window.onerror = this._originalOnError;
        window.onunhandledrejection = this._originalUnhandledRejection;
    }
}
