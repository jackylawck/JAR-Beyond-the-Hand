export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.motorGain = null;
        this.motorOsc = null;
        this.ambienceGain = null;
        this.bgmOsc = null;
        this.bgmGain = null;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        // 馬達音效
        this.motorOsc = this.ctx.createOscillator();
        this.motorGain = this.ctx.createGain();
        this.motorOsc.type = 'triangle';
        this.motorOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.motorOsc.connect(this.motorGain);
        this.motorGain.connect(this.ctx.destination);
        this.motorOsc.start();

        // 環境交流音
        const ambOsc = this.ctx.createOscillator();
        this.ambienceGain = this.ctx.createGain();
        ambOsc.type = 'sine';
        ambOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
        this.ambienceGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        ambOsc.connect(this.ambienceGain);
        this.ambienceGain.connect(this.ctx.destination);
        ambOsc.start();

        // 動態張力 BGM
        this.bgmOsc = this.ctx.createOscillator();
        this.bgmGain = this.ctx.createGain();
        this.bgmOsc.type = 'sawtooth';
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, this.ctx.currentTime);
        this.bgmOsc.frequency.setValueAtTime(110, this.ctx.currentTime);
        this.bgmGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        this.bgmOsc.connect(filter);
        filter.connect(this.bgmGain);
        this.bgmGain.connect(this.ctx.destination);
        this.bgmOsc.start();
    }

    updateTension(distanceToTarget) {
        if (!this.ctx || !this.bgmOsc) return;
        const tension = Math.max(0, Math.min(1, 1 - (distanceToTarget - 0.3) / 1.5));
        this.bgmOsc.frequency.setTargetAtTime(110 + tension * 110, this.ctx.currentTime, 0.15);
        this.bgmGain.gain.setTargetAtTime(0.01 + tension * 0.03, this.ctx.currentTime, 0.15);
    }

    setMotorPitch(speed) {
        if (!this.ctx) return;
        this.motorGain.gain.setTargetAtTime(Math.min(speed * 0.12, 0.05), this.ctx.currentTime, 0.05);
        this.motorOsc.frequency.setTargetAtTime(45 + speed * 100, this.ctx.currentTime, 0.05);
    }

    playPneumatic() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2200;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    playSuccess() {
        if (!this.ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.08);
            osc.stop(this.ctx.currentTime + idx * 0.08 + 0.4);
        });
    }

    playError() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
}
