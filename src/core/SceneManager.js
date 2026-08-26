export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.scene = new THREE.Scene();
        // 1. 明亮清爽的實驗室漫反射霧
        this.scene.background = new THREE.Color(0xdde5ee);
        this.scene.fog = new THREE.FogExp2(0xdde5ee, 0.025);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.5, 4.8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this._buildBrightLighting();
        this._buildModernCleanroom();
        this._bindResize();
    }

    _buildBrightLighting() {
        // 全域通透漫射光
        this.scene.add(new THREE.AmbientLight(0xffffff, 2.2));

        // 頂部主陣列泛光燈 (提供柔和落地陰影)
        const topLight = new THREE.DirectionalLight(0xffffff, 2.5);
        topLight.position.set(2, 8, 3);
        topLight.castShadow = true;
        topLight.shadow.mapSize.width = 1024;
        topLight.shadow.mapSize.height = 1024;
        topLight.shadow.bias = -0.001;
        this.scene.add(topLight);

        // 側向天藍色冷光補光
        const fillLight = new THREE.DirectionalLight(0xaad5ff, 1.2);
        fillLight.position.set(-5, 4, -3);
        this.scene.add(fillLight);
    }

    _buildModernCleanroom() {
        // 1. 白色環氧樹脂無塵地板
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xedf1f5,
            metalness: 0.1,
            roughness: 0.2
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 細緻灰色科研網格
        const grid = new THREE.GridHelper(16, 32, 0x0099cc, 0xc2d0dd);
        grid.position.y = 0.002;
        this.scene.add(grid);

        // 2. 實驗室中央工作圓台
        const stationMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.25 });
        const station = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.12, 48), stationMat);
        station.position.y = 0.06;
        station.receiveShadow = true;
        this.scene.add(station);

        // 工作圓台邊緣科技藍飾條
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(2.62, 0.015, 8, 48),
            new THREE.MeshBasicMaterial({ color: 0x00aaff })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.12;
        this.scene.add(rim);

        // 3. 後方半透明磨砂科研背景牆
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xd0dae5, roughness: 0.4 });
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), wallMat);
        wall.position.set(0, 5, -6);
        this.scene.add(wall);

        // 頂部科技天幕發光燈板
        const ceilingPanel = new THREE.Mesh(
            new THREE.BoxGeometry(10, 0.1, 4),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        ceilingPanel.position.set(0, 6.5, 0);
        this.scene.add(ceilingPanel);
    }

    _bindResize() {
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
