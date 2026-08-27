export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.motorOsc = null;
        this.motorGain = null;
        this.isMuted = false;
        this._initOnFirstTouch();
    }

    _initOnFirstTouch() {
        const unlock = () => {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                    this._setupMotorOsc();
                }
            } else if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
    }

    _setupMotorOsc() {
        try {
            this.motorOsc = this.ctx.createOscillator();
            this.motorGain = this.ctx.createGain();
            this.motorOsc.type = 'sawtooth';
            this.motorOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
            this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);

            // 低通濾波器模擬外殼隔音
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(240, this.ctx.currentTime);

            this.motorOsc.connect(filter);
            filter.connect(this.motorGain);
            this.motorGain.connect(this.ctx.destination);
            this.motorOsc.start();
        } catch (e) {}
    }

    setMotorPitch(intensity) {
        if (!this.ctx || !this.motorOsc || !this.motorGain) return;
        const now = this.ctx.currentTime;
        const freq = 45 + intensity * 95;
        const vol = this.isMuted ? 0 : Math.min(0.08, intensity * 0.08);
        this.motorOsc.frequency.setTargetAtTime(freq, now, 0.05);
        this.motorGain.gain.setTargetAtTime(vol, now, 0.05);
    }

    // 🌟 1. 氣動釋放聲 (Pneumatic Hiss)
    playPneumatic() {
        if (!this.ctx || this.isMuted) return;
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    // 🌟 2. 夾取鎖定「金屬咔嗒聲」（Lock Clack）
    playLock() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.08);
    }

    // 🌟 3. 成功抓取和弦 (Arpeggio Sparkle)
    playSuccess() {
        if (!this.ctx || this.isMuted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6
        notes.forEach((freq, idx) => {
            const now = this.ctx.currentTime + idx * 0.06;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        });
    }

    // 🌟 4. 任務圓滿達成：勝利交響能量和弦
    playVictory() {
        if (!this.ctx || this.isMuted) return;
        const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        chords.forEach((freq) => {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.2);
        });
    }
}
