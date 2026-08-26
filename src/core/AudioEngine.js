export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.motorGain = null;
        this.motorOsc = null;
        this.ambienceGain = null;
        this.bgmOsc = null;
        this.bgmGain = null;
        this.masterGain = null;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        // 總音量主控 (支援 Audio Ducking 屏息靜音)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // 1. 伺服馬達音效
        this.motorOsc = this.ctx.createOscillator();
        this.motorGain = this.ctx.createGain();
        this.motorOsc.type = 'triangle';
        this.motorOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.motorOsc.connect(this.motorGain);
        this.motorGain.connect(this.masterGain);
        this.motorOsc.start();

        // 2. 實驗室底噪與動態張力 BGM
        this._startAmbience();
        this._startDynamicBGM();
    }

    _startAmbience() {
        const osc = this.ctx.createOscillator();
        this.ambienceGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, this.ctx.currentTime);
        this.ambienceGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        osc.connect(this.ambienceGain);
        this.ambienceGain.connect(this.masterGain);
        osc.start();
    }

    _startDynamicBGM() {
        this.bgmOsc = this.ctx.createOscillator();
        this.bgmGain = this.ctx.createGain();
        this.bgmOsc.type = 'sawtooth';
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, this.ctx.currentTime);

        this.bgmOsc.frequency.setValueAtTime(110, this.ctx.currentTime);
        this.bgmGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

        this.bgmOsc.connect(filter);
        filter.connect(this.bgmGain);
        this.bgmGain.connect(this.masterGain);
        this.bgmOsc.start();
    }

    // 電影級屏息（Ducking）：抓取或安裝瞬間短暫靜音 0.15s
    triggerAudioSilence(duration = 0.15) {
        if (!this.ctx) return;
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        this.masterGain.gain.exponentialRampToValueAtTime(1.0, this.ctx.currentTime + duration);
    }

    updateTension(distanceToTarget) {
        if (!this.ctx || !this.bgmOsc) return;
        const tension = Math.max(0, Math.min(1, 1 - (distanceToTarget - 0.3) / 1.5));
        const targetFreq = 110 + tension * 110;
        const targetVol = 0.01 + tension * 0.035;
        this.bgmOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.15);
        this.bgmGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.15);
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
        filter.frequency.value = 2400;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    }

    // 次低音重擊 (Sub-bass Impact) 配合抓取微停頓
    playSubBassHit() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    // 反應爐臨界點火音效 (Resonance Ignition)
    playIgnitionSurge() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130.81, this.ctx.currentTime); // C3
        osc.frequency.exponentialRampToValueAtTime(1046.50, this.ctx.currentTime + 1.8); // 快速充能音階
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(4000, this.ctx.currentTime + 1.8);

        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 2.2);
    }
}
