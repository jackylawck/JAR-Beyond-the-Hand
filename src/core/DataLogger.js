export class DataLogger {
    constructor(enabled = false, sampleRate = 60) {
        this.enabled = enabled;
        this.sampleRate = sampleRate;
        this.data = [];
        this._frameCount = 0;
        this._startTime = performance.now();
    }

    setEnabled(val) {
        this.enabled = val;
        if (val) this.clear();
    }

    logFrame(telemetry) {
        if (!this.enabled) return;
        this._frameCount++;
        
        // 採樣頻率控制
        if (this._frameCount % Math.max(1, Math.floor(60 / this.sampleRate)) !== 0) return;

        this.data.push({
            timestamp: ((performance.now() - this._startTime) / 1000).toFixed(4),
            posX: telemetry.posX.toFixed(4),
            posY: telemetry.posY.toFixed(4),
            posZ: telemetry.posZ.toFixed(4),
            j0_deg: (telemetry.joint0 * 180 / Math.PI).toFixed(2),
            j1_deg: (telemetry.joint1 * 180 / Math.PI).toFixed(2),
            j2_deg: (telemetry.joint2 * 180 / Math.PI).toFixed(2),
            j3_deg: (telemetry.joint3 * 180 / Math.PI).toFixed(2),
            vel: telemetry.vel.toFixed(4),
            error_m: telemetry.error.toFixed(4),
            secured: telemetry.secured ? 1 : 0
        });

        // 限制最大緩存 10000 筆 (約 3 分鐘)，防爆記憶體
        if (this.data.length > 10000) {
            this.data.shift();
        }
    }

    exportCSV() {
        if (this.data.length === 0) return null;
        const headers = Object.keys(this.data[0]).join(',');
        const rows = this.data.map(row => Object.values(row).join(','));
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `jar_research_telemetry_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    clear() {
        this.data = [];
        this._frameCount = 0;
        this._startTime = performance.now();
    }
}
