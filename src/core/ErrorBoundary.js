export class ErrorBoundary {
    constructor(hudElement) {
        this.hud = hudElement;
        this._originalOnError = window.onerror;
        this._bind();
    }

    _bind() {
        window.onerror = (message, source, lineno) => {
            this._renderError(`🚨 ${message} (${source}:${lineno})`);
            return true;
        };
    }

    _renderError(message) {
        if (!this.hud) return;
        this.hud.innerHTML = `
            <div style="background:rgba(255,0,0,0.2);border:1px solid #ff3d00;padding:8px;border-radius:4px;color:#ff6b6b;font-size:11px;font-family:monospace;">
                <b>⚠️ SYSTEM ERROR</b>: ${message}
            </div>
        ` + this.hud.innerHTML;
    }
}
