import * as THREE from 'three';

export class SceneManager {
    constructor(containerId, mode = 'kid') {
        this.container = document.getElementById(containerId);
        this.mode = mode;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this._resizeHandler = null;
        this._scanLine = null;

        this._init();
    }

    _init() {
        const w = window.innerWidth || document.documentElement.clientWidth || 375;
        const h = window.innerHeight || document.documentElement.clientHeight || 667;

        // 🌟 1. 經典立體 35° 俯瞰相機視角 (重現工作台深邃空間感)
        this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
        this.camera.position.set(0, 2.4, 3.2);
        this.camera.lookAt(0, 0.25, 0);

        // 🌟 2. 頂級抗鋸齒與色調映射渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        // 🌟 3. 程序化生成 IBL 環境貼圖 (令金屬材質擁有極致反射與高光)
        this._buildEnvironmentMap();

        // 🌟 4. 頂級順光照明與輪廓邊緣光
        this._buildLighting();

        // 🌟 5. 構建三大模式專屬 3D 場景
        this._buildSceneByMode();

        // 視窗自適應
        this._resizeHandler = () => this.onWindowResize();
        window.addEventListener('resize', this._resizeHandler);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.onWindowResize(), 150);
        });
    }

    // ============================================================
    // 🌟 核心：程序化環境貼圖（IBL）- 令金屬外殼與連桿產生真實反射
    // ============================================================
    _buildEnvironmentMap() {
        try {
            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            pmremGenerator.compileEquirectangularShader();

            const envScene = new THREE.Scene();
            envScene.background = new THREE.Color(0x112233);

            // 頂部主反射光源
            const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const lightBox = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 12), lightMat);
            lightBox.position.set(0, 7, 0);
            envScene.add(lightBox);

            // 側向冷藍天光
            const sideMat = new THREE.MeshBasicMaterial({ color: 0x66aacc });
            const sideBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 12), sideMat);
            sideBox.position.set(6, 4, 0);
            envScene.add(sideBox);

            const envTexture = pmremGenerator.fromScene(envScene).texture;
            this.scene.environment = envTexture;
            pmremGenerator.dispose();
        } catch (e) {
            console.warn('環境貼圖生成失敗，使用基本光照方案', e);
        }
    }

    // ============================================================
    // 🌟 燈光系統（順光 45° 主光 + 柔和天光 + 輪廓邊緣光）
    // ============================================================
    _buildLighting() {
        const isKid = (this.mode === 'kid');

        this.scene.background = new THREE.Color(isKid ? 0xddeef8 : 0x050d1a);

        // 天空光與地面反射光
        const hemiLight = new THREE.HemisphereLight(
            0xffffff,
            isKid ? 0xaaccdd : 0x1a2b3c,
            isKid ? 1.1 : 0.8
        );
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        // 主聚光燈 (前上方順光，徹底消除正面死黑)
        const mainLight = new THREE.DirectionalLight(0xffffff, isKid ? 1.3 : 1.5);
        mainLight.position.set(2.5, 6.0, 4.0);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 15;
        mainLight.shadow.camera.left = -2.5;
        mainLight.shadow.camera.right = 2.5;
        mainLight.shadow.camera.top = 2.5;
        mainLight.shadow.camera.bottom = -2.5;
        mainLight.shadow.bias = -0.0003;
        this.scene.add(mainLight);

        // 輪廓邊緣光（Rim Light，勾勒機械臂金屬輪廓）
        const rimLight = new THREE.DirectionalLight(0x00e5ff, isKid ? 0.45 : 0.7);
        rimLight.position.set(-3.5, 4.0, -3.0);
        this.scene.add(rimLight);
    }

    // ============================================================
    // 🌟 構建三大模式專屬 3D 場景與地台
    // ============================================================
    _buildSceneByMode() {
        // 1. 共用：金屬質感工作圓台
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x1a2430,
            metalness: 0.6,
            roughness: 0.3
        });
        const table = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.12, 48), tableMat);
        table.position.y = 0.06;
        table.receiveShadow = true;
        table.castShadow = true;
        this.scene.add(table);

        // 2. 共用：全息座標網格
        const grid = new THREE.GridHelper(12, 24, 0x00e5ff, 0x1a2a3a);
        grid.position.y = 0.01;
        this.scene.add(grid);

        // 3. 共用：全息能量環
        const ringColors = {
            kid: 0x4ade80,
            advanced: 0x38bdf8,
            research: 0x00ffff
        };
        const color = ringColors[this.mode] || 0x00e5ff;
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.8 + i * 0.5, 0.012, 8, 48),
                new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.45 - i * 0.12
                })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.02;
            this.scene.add(ring);
        }

        // 4. 模式專屬佈置
        if (this.mode === 'kid') {
            this._buildKidScene();
        } else if (this.mode === 'advanced') {
            this._buildAdvancedScene();
        } else {
            this._buildResearchScene();
        }
    }

    _buildKidScene() {
        // 綠色農場草皮
        const grassMat = new THREE.MeshStandardMaterial({
            color: 0x86efac,
            roughness: 0.85
        });
        const grass = new THREE.Mesh(new THREE.CircleGeometry(2.0, 32), grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 0.125;
        grass.receiveShadow = true;
        this.scene.add(grass);

        // 環形裝飾植物盆栽
        for (let i = 0; i < 6; i++) {
            const pot = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.06, 0.1, 8),
                new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 })
            );
            const plant = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
            );
            plant.position.y = 0.08;
            plant.castShadow = true;
            pot.add(plant);
            pot.castShadow = true;

            const angle = (i / 6) * Math.PI * 2;
            pot.position.set(Math.cos(angle) * 1.8, 0.17, Math.sin(angle) * 1.8);
            this.scene.add(pot);
        }
    }

    _buildAdvancedScene() {
        // 工業輸送帶
        const beltMat = new THREE.MeshStandardMaterial({
            color: 0x1a2a3a,
            metalness: 0.5,
            roughness: 0.4
        });
        const belt = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.06, 0.4), beltMat);
        belt.position.set(0, 0.1, 1.6);
        belt.receiveShadow = true;
        this.scene.add(belt);

        // 警示黃條
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(4.0, 0.02, 0.03),
            new THREE.MeshBasicMaterial({ color: 0xeab308 })
        );
        stripe.position.set(0, 0.14, 1.4);
        this.scene.add(stripe);

        // 工業物料架
        const rackMat = new THREE.MeshStandardMaterial({
            color: 0x334455,
            metalness: 0.8,
            roughness: 0.2
        });
        for (let i = -1; i <= 1; i += 2) {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.3), rackMat);
            rack.position.set(i * 2.0, 0.4, -1.8);
            rack.castShadow = true;
            rack.receiveShadow = true;
            this.scene.add(rack);
        }
    }

    _buildResearchScene() {
        // 科研艙金屬牆面
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x0a121e,
            metalness: 0.8,
            roughness: 0.2
        });
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), wallMat);
        wall.position.set(0, 1.0, -2.5);
        wall.receiveShadow = true;
        this.scene.add(wall);

        // 全息動態掃描線
        const scanLine = new THREE.Mesh(
            new THREE.BoxGeometry(6, 0.02, 0.02),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff })
        );
        scanLine.position.set(0, 0.5, -2.4);
        this.scene.add(scanLine);
        this._scanLine = scanLine;

        // 數據方格矩陣
        for (let i = 0; i < 6; i++) {
            const cell = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.04, 0.4),
                new THREE.MeshBasicMaterial({
                    color: 0x00e5ff,
                    transparent: true,
                    opacity: 0.1 + Math.random() * 0.2
                })
            );
            cell.position.set(-1.5 + i * 0.6, 0.8 + Math.random() * 0.8, -2.4);
            this.scene.add(cell);
        }
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
        // 科研模式：全息掃描線動態巡航
        if (this.mode === 'research' && this._scanLine) {
            const time = Date.now() / 2000;
            this._scanLine.position.y = 0.3 + Math.sin(time) * 1.2;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
    }
}
