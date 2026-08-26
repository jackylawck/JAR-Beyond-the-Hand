export class SceneManager {
    constructor(containerId, mode = 'kid') {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.mode = mode;
        this.scene = new THREE.Scene();
        
        // 初始相機位置（高位俯瞰準備進入過渡）
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 5.5, 7.5);
        this.targetCamPos = new THREE.Vector3(0, 3.2, 5.0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = mode === 'kid' ? 1.15 : (mode === 'research' ? 1.35 : 1.25);

        // 柔和陰影設置
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.dynamicElements = [];
        this.composer = null;

        // 1. 程序化 IBL
        this._buildProceduralIBL(mode);

        // 2. 燈光與陰影
        this._buildLighting(mode);

        // 3. 場景細節
        if (mode === 'kid') {
            this._buildGreenhouseFarmScene();
        } else if (mode === 'advanced') {
            this._buildFactoryConveyorScene();
        } else {
            this._buildHighTechResearchScene();
        }

        // 4. 動態元素升級（花粉100顆/多彩分類盒/多重掃描雷射）
        this._buildDynamicAtmosphere(mode);

        // 5. 後期處理 Bloom 合成器
        this._setupPostProcessing(mode);

        this._bindResize();
    }

    _setupPostProcessing(mode) {
        if (typeof THREE.EffectComposer !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined') {
            this.composer = new THREE.EffectComposer(this.renderer);
            this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));

            const bloomStrength = mode === 'research' ? 0.35 : (mode === 'advanced' ? 0.22 : 0.12);
            const bloomRadius = mode === 'research' ? 0.45 : 0.25;
            const bloomThreshold = mode === 'research' ? 0.2 : 0.35;

            const bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                bloomStrength,
                bloomRadius,
                bloomThreshold
            );
            this.composer.addPass(bloomPass);
        }
    }

    _buildProceduralIBL(mode) {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        const envScene = new THREE.Scene();

        if (mode === 'kid') {
            envScene.background = new THREE.Color(0xf0fdf4);
            const skyLight = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0xfffbe8 }));
            skyLight.position.set(0, 8, 0);
            envScene.add(skyLight);
        } else if (mode === 'advanced') {
            envScene.background = new THREE.Color(0x1e293b);
            const stripGeo = new THREE.BoxGeometry(1.5, 0.2, 16);
            const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const s1 = new THREE.Mesh(stripGeo, stripMat); s1.position.set(3, 7, 0);
            const s2 = new THREE.Mesh(stripGeo, stripMat); s2.position.set(-3, 7, 0);
            envScene.add(s1, s2);
        } else {
            envScene.background = new THREE.Color(0x060c18);
            const coldLight = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 12), new THREE.MeshBasicMaterial({ color: 0x88ccff }));
            coldLight.position.set(0, 8, 0);
            envScene.add(coldLight);
        }

        const cubeRenderTarget = pmremGenerator.fromScene(envScene);
        this.scene.environment = cubeRenderTarget.texture;
        pmremGenerator.dispose();
    }

    _buildLighting(mode) {
        if (mode === 'kid') {
            this.scene.background = new THREE.Color(0xdcfce7);
            this.scene.fog = new THREE.FogExp2(0xdcfce7, 0.02);
            this.scene.add(new THREE.AmbientLight(0xfef9c3, 1.8));

            const sun = new THREE.DirectionalLight(0xffedd5, 2.8);
            sun.position.set(4, 9, 4);
            sun.castShadow = true;
            sun.shadow.mapSize.set(2048, 2048);
            sun.shadow.radius = 4.5;
            sun.shadow.bias = -0.0005;
            this.scene.add(sun);
        } else if (mode === 'advanced') {
            this.scene.background = new THREE.Color(0x0f172a);
            this.scene.fog = new THREE.FogExp2(0x0f172a, 0.025);
            this.scene.add(new THREE.AmbientLight(0x334155, 1.5));

            const topSpot = new THREE.SpotLight(0xffffff, 4.0, 25, Math.PI / 3.5, 0.4);
            topSpot.position.set(0, 8, 3);
            topSpot.castShadow = true;
            topSpot.shadow.mapSize.set(2048, 2048);
            topSpot.shadow.radius = 3.5;
            topSpot.shadow.bias = -0.0005;
            this.scene.add(topSpot);

            const rim = new THREE.DirectionalLight(0x38bdf8, 2.0);
            rim.position.set(-6, 4, -4);
            this.scene.add(rim);
        } else {
            this.scene.background = new THREE.Color(0x030712);
            this.scene.fog = new THREE.FogExp2(0x030712, 0.03);
            this.scene.add(new THREE.AmbientLight(0x1e293b, 1.6));

            const labCold = new THREE.DirectionalLight(0xe0f2fe, 3.5);
            labCold.position.set(2, 9, 2);
            labCold.castShadow = true;
            labCold.shadow.mapSize.set(2048, 2048);
            labCold.shadow.radius = 3.0;
            labCold.shadow.bias = -0.0005;
            this.scene.add(labCold);

            const cyanRim = new THREE.DirectionalLight(0x00e5ff, 3.0);
            cyanRim.position.set(-5, 5, -5);
            this.scene.add(cyanRim);
        }
    }

    _addBaseAmbientOcclusion(colorHex, radius = 3.0) {
        const aoRing = new THREE.Mesh(
            new THREE.RingGeometry(radius * 0.88, radius * 1.15, 64),
            new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.18,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            })
        );
        aoRing.rotation.x = -Math.PI / 2;
        aoRing.position.y = 0.003;
        this.scene.add(aoRing);
    }

    _buildGreenhouseFarmScene() {
        const station = new THREE.Mesh(
            new THREE.CylinderGeometry(2.8, 3.0, 0.16, 48),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.1 })
        );
        station.position.y = 0.08;
        station.receiveShadow = true;
        this.scene.add(station);

        this._addBaseAmbientOcclusion(0x22c55e, 3.0);

        const grassMat = new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.8 });
        const grass = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 0.165;
        this.scene.add(grass);

        const frameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
        for (let x = -6; x <= 6; x += 4) {
            const arch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6.0, 0.12), frameMat);
            arch.position.set(x, 3.0, -4.5);
            this.scene.add(arch);
        }

        for (let i = 0; i < 6; i++) {
            const pot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.09, 0.14, 12),
                new THREE.MeshStandardMaterial({ color: 0xfde047 })
            );
            const plant = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
            );
            plant.position.y = 0.12;
            pot.add(plant);

            const angle = (i / 6) * Math.PI * 2;
            pot.position.set(Math.cos(angle) * 2.1, 0.23, Math.sin(angle) * 2.1);
            this.scene.add(pot);
        }
    }

    _buildFactoryConveyorScene() {
        const station = new THREE.Mesh(
            new THREE.CylinderGeometry(2.8, 3.0, 0.16, 48),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.85 })
        );
        station.position.y = 0.08;
        station.receiveShadow = true;
        this.scene.add(station);

        this._addBaseAmbientOcclusion(0x38bdf8, 3.0);

        const grid = new THREE.GridHelper(16, 32, 0x38bdf8, 0x334155);
        grid.position.y = 0.005;
        this.scene.add(grid);

        const beltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
        const belt = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.1, 0.55), beltMat);
        belt.position.set(0, 0.12, 1.55);
        this.scene.add(belt);

        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.02, 0.04), stripeMat);
        stripe.position.set(0, 0.18, 1.28);
        this.scene.add(stripe);

        const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
        for (let i = -1; i <= 1; i += 2) {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.4), frameMat);
            rack.position.set(i * 2.6, 1.1, -2.5);
            this.scene.add(rack);
        }
    }

    _buildHighTechResearchScene() {
        const station = new THREE.Mesh(
            new THREE.CylinderGeometry(2.8, 3.0, 0.16, 48),
            new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.1, metalness: 0.95 })
        );
        station.position.y = 0.08;
        station.receiveShadow = true;
        this.scene.add(station);

        this._addBaseAmbientOcclusion(0x00e5ff, 3.0);

        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1.0 + i * 0.65, 0.012, 8, 64),
                new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 - i * 0.15 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.17;
            this.scene.add(ring);
        }

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.3, metalness: 0.9 });
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), wallMat);
        backWall.position.set(0, 5, -5.5);
        this.scene.add(backWall);
    }

    _buildDynamicAtmosphere(mode) {
        if (mode === 'kid') {
            // 🌟 100 顆隨機大小微粒花粉
            const count = 100;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vels = [];
            for (let i = 0; i < count; i++) {
                pos[i * 3] = (Math.random() - 0.5) * 7;
                pos[i * 3 + 1] = 0.2 + Math.random() * 4.0;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
                vels.push({ x: (Math.random() - 0.5) * 0.06, y: -0.06 - Math.random() * 0.08, z: (Math.random() - 0.5) * 0.06 });
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({ color: 0xfef08a, size: 0.038, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
            const pollen = new THREE.Points(geo, mat);
            this.scene.add(pollen);

            this.dynamicElements.push({
                update: (dt) => {
                    const arr = geo.attributes.position.array;
                    for (let i = 0; i < count; i++) {
                        const idx = i * 3;
                        arr[idx] += vels[i].x * dt;
                        arr[idx + 1] += vels[i].y * dt;
                        arr[idx + 2] += vels[i].z * dt;
                        if (arr[idx + 1] < 0.1) {
                            arr[idx + 1] = 4.0;
                            arr[idx] = (Math.random() - 0.5) * 7;
                            arr[idx + 2] = (Math.random() - 0.5) * 7;
                        }
                    }
                    geo.attributes.position.needsUpdate = true;
                }
            });
        } else if (mode === 'advanced') {
            // 🌟 5 個彩色分類零件盒 (紅/藍/綠/黃/紫)
            const boxColors = [0x38bdf8, 0xef4444, 0x22c55e, 0xeab308, 0xa855f7];
            const boxGeo = new THREE.BoxGeometry(0.12, 0.08, 0.12);
            const boxes = [];
            for (let i = 0; i < 5; i++) {
                const boxMat = new THREE.MeshStandardMaterial({ color: boxColors[i], metalness: 0.6, roughness: 0.3 });
                const box = new THREE.Mesh(boxGeo, boxMat);
                box.position.set(-3.5 + i * 1.5, 0.21, 1.55);
                box.castShadow = true;
                this.scene.add(box);
                boxes.push(box);
            }

            this.dynamicElements.push({
                update: (dt) => {
                    boxes.forEach(b => {
                        b.position.x += 0.85 * dt;
                        if (b.position.x > 3.5) b.position.x = -3.5;
                    });
                }
            });
        } else {
            // 🌟 3 條不同頻率呼吸掃描的平行雷射線
            const lasers = [];
            const laserColors = [0x00e5ff, 0x38bdf8, 0x818cf8];
            for (let i = 0; i < 3; i++) {
                const laser = new THREE.Mesh(
                    new THREE.BoxGeometry(18, 0.03, 0.02),
                    new THREE.MeshBasicMaterial({ color: laserColors[i] })
                );
                laser.position.set(0, 1.5 + i * 1.2, -5.4);
                this.scene.add(laser);
                lasers.push({ mesh: laser, base: 1.5 + i * 1.2, speed: 1.2 + i * 0.5 });
            }

            let laserTime = 0;
            this.dynamicElements.push({
                update: (dt) => {
                    laserTime += dt;
                    lasers.forEach(l => {
                        l.mesh.position.y = l.base + Math.sin(laserTime * l.speed) * 0.8;
                    });
                }
            });
        }
    }

    _bindResize() {
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            if (this.composer) this.composer.setSize(w, h);
        });
    }

    render() {
        const dt = 0.016;

        // 🌟 鏡頭平滑切換推移 (Camera Transition)
        this.camera.position.lerp(this.targetCamPos, 2.5 * dt);

        // 更新動態物件
        this.dynamicElements.forEach(el => el.update(dt));

        // 🌟 Bloom 後期渲染
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        this.renderer.dispose();
    }
}
