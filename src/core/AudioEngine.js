export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.motorGain = null;
        this.motorOsc = null;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        this.motorOsc = this.ctx.createOscillator();
        this.motorGain = this.ctx.createGain();
        this.motorOsc.type = 'triangle';
        this.motorOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.motorOsc.connect(this.motorGain);
        this.motorGain.connect(this.ctx.destination);
        this.motorOsc.start();
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
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.5, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
}
