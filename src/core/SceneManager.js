import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class SceneManager {
    constructor(containerId, mode = 'kid') {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.mode = mode;
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.4, 4.8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.dynamicElements = [];
        this.composer = null;

        this._buildProceduralIBL(mode);
        this._buildLighting(mode);

        if (mode === 'kid') {
            this._buildGreenhouseFarmScene();
        } else if (mode === 'advanced') {
            this._buildFactoryConveyorScene();
        } else {
            this._buildHighTechResearchScene();
        }

        this._buildDynamicAtmosphere(mode);
        this._setupPostProcessing(mode);
        this._bindResize();
    }

    _setupPostProcessing(mode) {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        const bloomStrength = mode === 'research' ? 0.35 : (mode === 'advanced' ? 0.22 : 0.12);
        const bloomRadius = mode === 'research' ? 0.45 : 0.25;
        const bloomThreshold = mode === 'research' ? 0.2 : 0.35;

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            bloomStrength,
            bloomRadius,
            bloomThreshold
        );
        this.composer.addPass(bloomPass);
    }

    _buildProceduralIBL(mode) {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        const envScene = new THREE.Scene();

        if (mode === 'kid') {
            envScene.background = new THREE.Color(0xbae6fd);
            const skyLight = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
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
            this.scene.background = new THREE.Color(0x7dd3fc);
            this.scene.fog = new THREE.FogExp2(0x7dd3fc, 0.015);
            this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

            const sun = new THREE.DirectionalLight(0xfff7ed, 2.2);
            sun.position.set(4, 9, 4);
            sun.castShadow = true;
            sun.shadow.mapSize.set(2048, 2048);
            sun.shadow.radius = 3.5;
            sun.shadow.bias = -0.0005;
            this.scene.add(sun);

            const skyFill = new THREE.DirectionalLight(0x38bdf8, 0.6);
            skyFill.position.set(-4, 4, -4);
            this.scene.add(skyFill);
        } else if (mode === 'advanced') {
            this.scene.background = new THREE.Color(0x0f172a);
            this.scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
            this.scene.add(new THREE.AmbientLight(0x334155, 0.9));

            const topSpot = new THREE.SpotLight(0xffffff, 3.5, 25, Math.PI / 3.5, 0.4);
            topSpot.position.set(0, 8, 3);
            topSpot.castShadow = true;
            topSpot.shadow.mapSize.set(2048, 2048);
            this.scene.add(topSpot);
        } else {
            this.scene.background = new THREE.Color(0x030712);
            this.scene.fog = new THREE.FogExp2(0x030712, 0.025);
            this.scene.add(new THREE.AmbientLight(0x1e293b, 1.0));

            const labCold = new THREE.DirectionalLight(0xe0f2fe, 3.0);
            labCold.position.set(2, 9, 2);
            labCold.castShadow = true;
            this.scene.add(labCold);
        }
    }

    _buildGreenhouseFarmScene() {
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85, metalness: 0.05 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const stationMat = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b, 
            roughness: 0.4, 
            metalness: 0.2 
        });
        const station = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.8, 0.16, 48), stationMat);
        station.position.y = 0.08;
        station.receiveShadow = true;
        this.scene.add(station);

        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(2.72, 0.02, 8, 48),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.5 })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.16;
        this.scene.add(rim);

        const padMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.7 });
        const pad = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = 0.162;
        pad.receiveShadow = true;
        this.scene.add(pad);

        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
        for (let x = -6; x <= 6; x += 4) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 7.0, 0.15), frameMat);
            pillar.position.set(x, 3.5, -4.5);
            this.scene.add(pillar);
        }

        for (let i = 0; i < 6; i++) {
            const potGroup = new THREE.Group();
            
            const pot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.14, 0.1, 0.16, 12),
                new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.9 })
            );
            pot.position.y = 0.08;
            potGroup.add(pot);

            const foliage = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 })
            );
            foliage.position.y = 0.22;
            potGroup.add(foliage);

            const berry = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 })
            );
            berry.position.set(0.08, 0.22, 0.06);
            potGroup.add(berry);

            const angle = (i / 6) * Math.PI * 2;
            potGroup.position.set(Math.cos(angle) * 2.1, 0.16, Math.sin(angle) * 2.1);
            this.scene.add(potGroup);
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

        const grid = new THREE.GridHelper(16, 32, 0x38bdf8, 0x334155);
        grid.position.y = 0.005;
        this.scene.add(grid);

        const belt = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.1, 0.55), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        belt.position.set(0, 0.12, 1.55);
        this.scene.add(belt);
    }

    _buildHighTechResearchScene() {
        const station = new THREE.Mesh(
            new THREE.CylinderGeometry(2.8, 3.0, 0.16, 48),
            new THREE.MeshStandardMaterial({ color: 0x0b0f19, roughness: 0.1, metalness: 0.95 })
        );
        station.position.y = 0.08;
        station.receiveShadow = true;
        this.scene.add(station);

        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(1.0 + i * 0.65, 0.012, 8, 64),
                new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 - i * 0.15 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.17;
            this.scene.add(ring);
        }
    }

    _buildDynamicAtmosphere(mode) {
        if (mode === 'kid') {
            const count = 40;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vels = [];
            for (let i = 0; i < count; i++) {
                pos[i * 3] = (Math.random() - 0.5) * 6;
                pos[i * 3 + 1] = 0.2 + Math.random() * 3.5;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
                vels.push({ x: (Math.random() - 0.5) * 0.04, y: -0.05 - Math.random() * 0.05, z: (Math.random() - 0.5) * 0.04 });
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({ color: 0xfef08a, size: 0.035, transparent: true, opacity: 0.8 });
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
                            arr[idx + 1] = 3.5;
                        }
                    }
                    geo.attributes.position.needsUpdate = true;
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
        this.dynamicElements.forEach(el => el.update(dt));
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
