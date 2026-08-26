import { I18N } from './config/i18n.js';

// =========================================================================
// 1. Web Audio 合成音效引擎
// =========================================================================
class AudioEngine {
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
        this.motorGain.gain.setTargetAtTime(Math.min(speed * 0.12, 0.06), this.ctx.currentTime, 0.05);
        this.motorOsc.frequency.setTargetAtTime(45 + speed * 120, this.ctx.currentTime, 0.05);
    }

    playPneumatic() {
        if (!this.ctx) return;
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2400;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
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
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.08);
            osc.stop(this.ctx.currentTime + idx * 0.08 + 0.4);
        });
    }
}

// =========================================================================
// 2. 主控制器與 3D 渲染系統
// =========================================================================
class AppController {
    constructor() {
        this.audio = new AudioEngine();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.ikBones = [];
        this.targetPos = new THREE.Vector3(0, 1.9, 1.5);
        this.endEffector = null;
        this.clawLeft = null;
        this.clawRight = null;
        this.reactorCore = null;
        this.reactorSocket = null;
        this.coreGlow = null;
        this.dustParticles = null;
        this.energyNodes = [];

        this.clawOpen = true;
        this.isSecured = false;
        this.isDelivered = false;
        this.currentLang = localStorage.getItem('beyond-lang') || 'zh';

        this.inputState = { lx: 0, ly: 0, rx: 0, ry: 0 };
        this.clock = new THREE.Clock();
        this.idleTime = 0;

        this.pool = {
            v1: new THREE.Vector3(),
            v2: new THREE.Vector3(),
            forward: new THREE.Vector3(),
            right: new THREE.Vector3(),
            toEnd: new THREE.Vector3(),
            toTarget: new THREE.Vector3(),
            cross: new THREE.Vector3()
        };
    }

    init() {
        const container = document.getElementById('canvas-container');
        if (!container) return;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050a14, 0.03);

        this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.8, 5.8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.4;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.target.set(0, 1.1, 0.4);
        this.controls.maxPolarAngle = Math.PI / 2 + 0.02;
        this.controls.minDistance = 2.0;
        this.controls.maxDistance = 10.0;

        this._buildLighting();
        this._buildIndustrialScene();
        this._buildArm();
        this._buildInteractives();
        this._buildAtmosphere();
        this._setupControls();
        this._bindResize();

        this.updateLanguage(this.currentLang);
        this.animate();
    }

    _buildLighting() {
        this.scene.add(new THREE.AmbientLight(0x223348, 1.8));

        const spot = new THREE.SpotLight(0xffffff, 4.8, 22, Math.PI / 3.5, 0.4, 1.2);
        spot.position.set(3.5, 8, 4.5);
        spot.castShadow = true;
        spot.shadow.mapSize.width = 1024;
        spot.shadow.mapSize.height = 1024;
        this.scene.add(spot);

        const rim = new THREE.DirectionalLight(0x00e5ff, 3.6);
        rim.position.set(-6, 6, -5);
        this.scene.add(rim);

        const warm = new THREE.DirectionalLight(0xff6600, 1.3);
        warm.position.set(4, -1, 3);
        this.scene.add(warm);
    }

    _buildIndustrialScene() {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0f16, metalness: 0.85, roughness: 0.4 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x16202c, metalness: 0.95, roughness: 0.2 });
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x242e3a, metalness: 0.9, roughness: 0.3 });
        const glowCyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 14), wallMat);
        backWall.position.set(0, 5, -8);
        this.scene.add(backWall);

        for (let x = -8; x <= 8; x += 4) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 14, 0.45), frameMat);
            pillar.position.set(x, 5, -7.8);
            this.scene.add(pillar);

            for (let y = 1; y < 9; y += 1.2) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.2), frameMat);
                fin.position.set(x, y, -7.6);
                this.scene.add(fin);
            }
        }

        for (const y of [2.2, 4.8, 6.4]) {
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 24, 16), pipeMat);
            pipe.rotation.z = Math.PI / 2;
            pipe.position.set(0, y, -7.5);
            this.scene.add(pipe);
        }

        const wallStrip = new THREE.Mesh(new THREE.BoxGeometry(20, 0.08, 0.05), glowCyan);
        wallStrip.position.set(0, 3.5, -7.4);
        this.scene.add(wallStrip);

        for (let z = -4; z <= 4; z += 4) {
            const lightBar = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            lightBar.position.set(0, 7.8, z);
            this.scene.add(lightBar);
        }

        const floor = new THREE.Mesh(
            new THREE.CylinderGeometry(3.5, 3.7, 0.2, 48),
            new THREE.MeshStandardMaterial({ color: 0x141b24, metalness: 0.9, roughness: 0.3 })
        );
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(18, 36, 0x00e5ff, 0x112233);
        grid.position.y = 0.01;
        this.scene.add(grid);

        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.9 + i * 0.55, 0.015, 8, 64),
                new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 - i * 0.1 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.02;
            this.scene.add(ring);
        }

        const labelSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: (() => {
                    const c = document.createElement('canvas');
                    c.width = 512;
                    c.height = 128;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = 'transparent';
                    ctx.fillRect(0, 0, 512, 128);
                    ctx.font = '800 38px "Segoe UI", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillText('⚡ J.A.R. ROBOTICS // LAB-01', 256, 64);
                    return new THREE.CanvasTexture(c);
                })(),
                transparent: true,
                depthWrite: false
            })
        );
        labelSprite.position.set(0, 0.06, 1.7);
        labelSprite.scale.set(1.5, 0.38, 1);
        this.scene.add(labelSprite);
    }

    _buildArm() {
        const scratchTex = (() => {
            const c = document.createElement('canvas');
            c.width = 256;
            c.height = 256;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#555555';
            ctx.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 200; i++) {
                ctx.strokeStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.2})`;
                ctx.lineWidth = 1 + Math.random();
                ctx.beginPath();
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
                ctx.stroke();
            }
            const t = new THREE.CanvasTexture(c);
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(2, 2);
            return t;
        })();

        const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.92, roughness: 0.22, roughnessMap: scratchTex });
        const matRed = new THREE.MeshStandardMaterial({ color: 0x8a0f0f, metalness: 0.88, roughness: 0.24, roughnessMap: scratchTex });
        const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1c222b, metalness: 0.96, roughness: 0.28, roughnessMap: scratchTex });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 1.0, roughness: 0.08 });
        const matCyanGlow = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const baseGroup = new THREE.Group();
        this.scene.add(baseGroup);

        const baseArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.28, 32), matRed);
        baseArmor.position.y = 0.14;
        baseArmor.castShadow = true;
        baseArmor.receiveShadow = true;
        baseGroup.add(baseArmor);

        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 32), matDarkSteel);
        flange.position.y = 0.31;
        baseGroup.add(flange);

        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.34, 0);
        baseGroup.add(joint0);
        this.ikBones.push({ obj: joint0, axis: 'Y', min: -Math.PI, max: Math.PI });

        const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.32), matDarkSteel);
        forkL.position.set(-0.25, 0.18, 0);
        forkL.castShadow = true;
        joint0.add(forkL);

        const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.32), matDarkSteel);
        forkR.position.set(0.25, 0.18, 0);
        forkR.castShadow = true;
        joint0.add(forkR);

        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.35, 0);
        joint0.add(joint1);
        this.ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.45, max: Math.PI * 0.45 });

        const shoulderAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.5, 24), matChrome);
        shoulderAxis.rotation.z = Math.PI / 2;
        joint1.add(shoulderAxis);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.16), matGold);
        armL.position.set(-0.14, 0.58, 0);
        armL.castShadow = true;
        joint1.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.16), matGold);
        armR.position.set(0.14, 0.58, 0);
        armR.castShadow = true;
        joint1.add(armR);

        const pistonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.75, 16), matDarkSteel);
        pistonBase.position.set(0, 0.42, -0.09);
        pistonBase.castShadow = true;
        joint1.add(pistonBase);

        const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.7, 16), matChrome);
        pistonRod.position.set(0, 0.8, -0.09);
        joint1.add(pistonRod);

        const joint2 = new THREE.Group();
        joint2.position.set(0, 1.15, 0);
        joint1.add(joint2);
        this.ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.75, max: 0.05 });

        const elbowGear = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.4, 24), matDarkSteel);
        elbowGear.rotation.z = Math.PI / 2;
        joint2.add(elbowGear);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.92, 8), matRed);
        forearm.position.set(0, 0.46, 0);
        forearm.castShadow = true;
        joint2.add(forearm);

        const joint3 = new THREE.Group();
        joint3.position.set(0, 0.92, 0);
        joint2.add(joint3);
        this.ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.5, max: Math.PI * 0.5 });

        const wristServo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.13, 16), matDarkSteel);
        joint3.add(wristServo);

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.2), matGold);
        palm.position.set(0, 0.08, 0);
        palm.castShadow = true;
        joint3.add(palm);

        const palmArc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), matCyanGlow);
        palmArc.rotation.x = Math.PI / 2;
        palmArc.position.set(0, 0.08, 0.1);
        joint3.add(palmArc);

        const clawBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.12), matDarkSteel);
        clawBase.position.set(0, 0.12, 0);
        joint3.add(clawBase);

        this.clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.09), matChrome);
        this.clawLeft.position.set(-0.1, 0.23, 0);
        this.clawLeft.castShadow = true;
        joint3.add(this.clawLeft);

        const padL = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.07), matRed);
        padL.position.set(-0.08, 0.23, 0.02);
        joint3.add(padL);

        this.clawRight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.09), matChrome);
        this.clawRight.position.set(0.1, 0.23, 0);
        this.clawRight.castShadow = true;
        joint3.add(this.clawRight);

        const padR = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.07), matRed);
        padR.position.set(0.08, 0.23, 0.02);
        joint3.add(padR);

        this.endEffector = new THREE.Group();
        this.endEffector.position.set(0, 0.36, 0);
        joint3.add(this.endEffector);
    }

    _buildInteractives() {
        const socketGroup = new THREE.Group();
        socketGroup.position.set(0.85, 0.02, 0.85);
        this.scene.add(socketGroup);

        this.reactorSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.38, 0.16, 24),
            new THREE.MeshStandardMaterial({ color: 0x1c222b, metalness: 0.95, roughness: 0.25 })
        );
        this.reactorSocket.position.y = 0.08;
        this.reactorSocket.castShadow = true;
        socketGroup.add(this.reactorSocket);

        const glowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.016, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        glowRing.rotation.x = Math.PI / 2;
        glowRing.position.y = 0.165;
        socketGroup.add(glowRing);

        this.reactorCore = new THREE.Group();
        const coreBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 })
        );
        this.coreGlow = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.035, 12, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        this.coreGlow.rotation.x = Math.PI / 2;

        const coreCaps = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.035, 16),
            new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 1.0, roughness: 0.1 })
        );
        coreCaps.position.y = 0.1;

        this.reactorCore.add(coreBody);
        this.reactorCore.add(this.coreGlow);
        this.reactorCore.add(coreCaps);
        this.reactorCore.position.set(-0.85, 0.25, 0.85);
        this.reactorCore.castShadow = true;
        this.scene.add(this.reactorCore);
    }

    _buildAtmosphere() {
        const dustCount = 140;
        const dustGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(dustCount * 3);
        for (let i = 0; i < dustCount * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 8;
            pos[i + 1] = Math.random() * 4;
            pos[i + 2] = (Math.random() - 0.5) * 8;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const dustMat = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.035, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
        this.dustParticles = new THREE.Points(dustGeo, dustMat);
        this.scene.add(this.dustParticles);

        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        for (let i = 0; i < 8; i++) {
            const node = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), nodeMat);
            this.scene.add(node);
            this.energyNodes.push({ mesh: node, angle: (i / 8) * Math.PI * 2, radius: 2.0, speed: 0.95 });
        }
    }

    _setupControls() {
        this._bindJoy('joy-left', 'knob-left', (x, y) => {
            this.inputState.lx = x;
            this.inputState.ly = y;
            if (this.controls) this.controls.enabled = (Math.hypot(x, y) === 0);
        });

        this._bindJoy('joy-right', 'knob-right', (x, y) => {
            this.inputState.rx = x;
            this.inputState.ry = y;
            if (this.controls) this.controls.enabled = (Math.hypot(x, y) === 0);
        });

        const gripBtn = document.getElementById('btn-grip');
        if (gripBtn) {
            gripBtn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this.toggleGrip();
            });
        }

        const langBtn = document.getElementById('lang-btn');
        if (langBtn) {
            langBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
                localStorage.setItem('beyond-lang', this.currentLang);
                this.updateLanguage(this.currentLang);
            });
        }
    }

    _bindJoy(zoneId, knobId, onChange) {
        const zone = document.getElementById(zoneId);
        const knob = document.getElementById(knobId);
        if (!zone || !knob) return;

        const maxR = 45;
        let activeId = null;

        zone.addEventListener('pointerdown', (e) => {
            this.audio.init();
            activeId = e.pointerId;
            zone.setPointerCapture(e.pointerId);
            update(e);
        });

        zone.addEventListener('pointermove', (e) => {
            if (e.pointerId === activeId) update(e);
        });

        const reset = (e) => {
            if (e.pointerId === activeId) {
                activeId = null;
                knob.style.transform = `translate(0, 0)`;
                onChange(0, 0);
            }
        };

        zone.addEventListener('pointerup', reset);
        zone.addEventListener('pointercancel', reset);

        function update(e) {
            const rect = zone.getBoundingClientRect();
            let dx = e.clientX - (rect.left + rect.width / 2);
            let dy = e.clientY - (rect.top + rect.height / 2);
            const dist = Math.hypot(dx, dy);
            if (dist > maxR) {
                dx = (dx / dist) * maxR;
                dy = (dy / dist) * maxR;
            }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            const nx = dx / maxR;
            const ny = dy / maxR;
            const dz = 0.12;
            const fx = Math.abs(nx) < dz ? 0 : Math.sign(nx) * Math.pow((Math.abs(nx) - dz) / (1 - dz), 2);
            const fy = Math.abs(ny) < dz ? 0 : Math.sign(ny) * Math.pow((Math.abs(ny) - dz) / (1 - dz), 2);
            onChange(fx, fy);
        }
    }

    toggleGrip() {
        this.audio.init();
        this.audio.playPneumatic();
        this.clawOpen = !this.clawOpen;

        this.endEffector.getWorldPosition(this.pool.v1);
        const dist = this.pool.v1.distanceTo(this.reactorCore.position);
        const dict = I18N[this.currentLang] || I18N.zh;

        if (!this.clawOpen && dist < 0.45 && !this.isDelivered) {
            this.isSecured = true;
            this._setStatus(dict.statusSecured, 'rgba(0, 229, 255, 0.25)', '#00e5ff');
        } else if (this.clawOpen && this.isSecured) {
            const socketDist = this.pool.v1.distanceTo(this.reactorSocket.position);
            if (socketDist < 0.38) {
                this.isDelivered = true;
                this.isSecured = false;
                this.reactorCore.position.set(0.85, 0.26, 0.85);
                this.audio.playSuccess();
                this._setStatus(dict.statusComplete, 'rgba(0, 255, 100, 0.2)', '#00ff66');
            } else {
                this.isSecured = false;
                this._setStatus(dict.statusReady, 'rgba(0, 229, 255, 0.12)', '#00e5ff');
            }
        }
    }

    _setStatus(text, bg, border) {
        const tag = document.getElementById('status-tag');
        if (tag) {
            tag.innerText = text;
            tag.style.background = bg;
            tag.style.borderColor = border;
        }
    }

    updateLanguage(lang) {
        const dict = I18N[lang] || I18N.zh;
        const titleEl = document.querySelector('.hud-title');
        const missionTitleEl = document.getElementById('mission-title');
        const viewHintEl = document.getElementById('view-hint');
        const gripBtnEl = document.getElementById('btn-grip');
        const langBtnEl = document.getElementById('lang-btn');

        if (titleEl) titleEl.innerText = dict.title;
        if (missionTitleEl) missionTitleEl.innerText = dict.missionHeader;
        if (viewHintEl) viewHintEl.innerText = dict.viewHint;
        if (gripBtnEl) gripBtnEl.innerText = dict.gripBtn;
        if (langBtnEl) langBtnEl.innerText = dict.langBtn;

        if (this.isDelivered) this._setStatus(dict.statusComplete, 'rgba(0, 255, 100, 0.2)', '#00ff66');
        else if (this.isSecured) this._setStatus(dict.statusSecured, 'rgba(0, 229, 255, 0.25)', '#00e5ff');
        else this._setStatus(dict.statusReady, 'rgba(0, 229, 255, 0.12)', '#00e5ff');
    }

    _solveIK(target) {
        for (let iter = 0; iter < 3; iter++) {
            for (let i = this.ikBones.length - 1; i >= 0; i--) {
                const bone = this.ikBones[i];
                bone.obj.getWorldPosition(this.pool.v1);
                this.endEffector.getWorldPosition(this.pool.v2);

                this.pool.toEnd.subVectors(this.pool.v2, this.pool.v1).normalize();
                this.pool.toTarget.subVectors(target, this.pool.v1).normalize();

                let angle = this.pool.toEnd.dot(this.pool.toTarget);
                angle = Math.acos(Math.max(-1, Math.min(1, angle)));

                if (angle > 0.001) {
                    this.pool.cross.crossVectors(this.pool.toEnd, this.pool.toTarget).normalize();
                    const currentRot = (bone.axis === 'Y') ? bone.obj.rotation.y : bone.obj.rotation.x;
                    let targetDelta = (bone.axis === 'Y' ? this.pool.cross.y : this.pool.cross.x) * angle * 0.7;
                    targetDelta = Math.max(-0.12, Math.min(0.12, targetDelta));
                    const nextRot = Math.max(bone.min, Math.min(bone.max, currentRot + targetDelta));

                    if (bone.axis === 'Y') bone.obj.rotation.y = nextRot;
                    else bone.obj.rotation.x = nextRot;
                    bone.obj.updateMatrixWorld(true);
                }
            }
        }
    }

    _bindResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.05);
        this.idleTime += dt;

        if (this.coreGlow) {
            const pulse = 1.0 + Math.sin(this.idleTime * 3.2) * 0.15;
            this.coreGlow.scale.set(pulse, pulse, pulse);
        }

        if (this.dustParticles) {
            this.dustParticles.rotation.y += 0.02 * dt;
        }

        for (const n of this.energyNodes) {
            n.angle += n.speed * dt;
            n.mesh.position.set(Math.cos(n.angle) * n.radius, 0.035, Math.sin(n.angle) * n.radius);
        }

        this.camera.getWorldDirection(this.pool.forward);
        this.pool.forward.y = 0;
        this.pool.forward.normalize();
        this.pool.right.crossVectors(this.pool.forward, this.camera.up).normalize().negate();

        const moveSpeed = 1.9 * dt;
        this.pool.v1.copy(this.pool.forward).multiplyScalar(-this.inputState.ly * moveSpeed);
        this.pool.v2.copy(this.pool.right).multiplyScalar(this.inputState.lx * moveSpeed);
        this.targetPos.add(this.pool.v1).add(this.pool.v2);
        this.targetPos.y -= this.inputState.ry * moveSpeed;

        if (this.targetPos.y < 0.32) this.targetPos.y = 0.32;
        if (this.targetPos.y > 2.6) this.targetPos.y = 2.6;
        const radius = Math.hypot(this.targetPos.x, this.targetPos.z);
        if (radius > 2.2) {
            this.targetPos.x = (this.targetPos.x / radius) * 2.2;
            this.targetPos.z = (this.targetPos.z / radius) * 2.2;
        }

        const intensity = Math.hypot(this.inputState.lx, this.inputState.ly, this.inputState.rx, this.inputState.ry);
        if (intensity < 0.01 && !this.isSecured) {
            this.targetPos.y += Math.sin(this.idleTime * 1.8) * 0.003;
        }

        this.endEffector.getWorldPosition(this.pool.v1);
        const guidanceEl = document.getElementById('mission-desc');
        const dict = I18N[this.currentLang] || I18N.zh;

        if (!this.isSecured && !this.isDelivered) {
            const distToCore = this.pool.v1.distanceTo(this.reactorCore.position);
            if (distToCore > 0.45) {
                if (guidanceEl) { guidanceEl.innerText = dict.step1; guidanceEl.style.color = '#00e5ff'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step2; guidanceEl.style.color = '#00ff66'; }
                this.targetPos.lerp(this.reactorCore.position, 6.0 * dt);
            }
        } else if (this.isSecured) {
            this.reactorCore.position.lerp(this.pool.v1, 14.0 * dt);
            const distToSocket = this.pool.v1.distanceTo(this.reactorSocket.position);
            if (distToSocket > 0.38) {
                if (guidanceEl) { guidanceEl.innerText = dict.step3; guidanceEl.style.color = '#ff9100'; }
            } else {
                if (guidanceEl) { guidanceEl.innerText = dict.step4; guidanceEl.style.color = '#00ff66'; }
            }
            if (distToSocket < 0.34) {
                this.targetPos.lerp(this.reactorSocket.position, 5.0 * dt);
            }
        }

        this._solveIK(this.targetPos);

        const targetOffset = this.clawOpen ? 0.08 : 0.01;
        this.clawLeft.position.x += (-0.06 - targetOffset - this.clawLeft.position.x) * 0.25;
        this.clawRight.position.x += (0.06 + targetOffset - this.clawRight.position.x) * 0.25;

        this.audio.setMotorPitch(intensity);
        if (this.controls) this.controls.update();

        this.renderer.render(this.scene, this.camera);
    }
}

// 啟動遊戲
const app = new AppController();
app.init();
window.__app = app;
