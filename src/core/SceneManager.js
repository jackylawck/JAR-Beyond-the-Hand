export class SceneManager {
    constructor(containerId, mode = 'kid') {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.5, 4.8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this._buildLighting(mode);
        this._buildModernCleanroom(mode);
        this._bindResize();
    }

    _buildLighting(mode) {
        if (mode === 'kid') {
            // 兒童模式：溫暖陽光
            this.scene.background = new THREE.Color(0xeef5ff);
            this.scene.fog = new THREE.FogExp2(0xeef5ff, 0.02);
            this.scene.add(new THREE.AmbientLight(0xffeedd, 2.0));
            const warm = new THREE.DirectionalLight(0xffdd88, 3.0);
            warm.position.set(5, 8, 5);
            warm.castShadow = true;
            this.scene.add(warm);
        } 
        else if (mode === 'research') {
            // 科研模式：極冷白無塵室
            this.scene.background = new THREE.Color(0x0a1018);
            this.scene.fog = new THREE.FogExp2(0x0a1018, 0.035);
            this.scene.add(new THREE.AmbientLight(0x446688, 2.5));
            const cold = new THREE.DirectionalLight(0xffffff, 4.0);
            cold.position.set(0, 10, 0);
            cold.castShadow = true;
            this.scene.add(cold);
        } 
        else {
            // 進階模式：中性工業光
            this.scene.background = new THREE.Color(0xdde5ee);
            this.scene.fog = new THREE.FogExp2(0xdde5ee, 0.025);
            this.scene.add(new THREE.AmbientLight(0xffffff, 2.2));
            const topLight = new THREE.DirectionalLight(0xffffff, 2.5);
            topLight.position.set(2, 8, 3);
            topLight.castShadow = true;
            this.scene.add(topLight);
        }
    }

    _buildModernCleanroom(mode) {
        // 白色環氧樹脂無塵地板
        const floorColor = mode === 'research' ? 0x11151c : 0xedf1f5;
        const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, metalness: 0.1, roughness: 0.2 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 細緻網格
        const gridColor = mode === 'research' ? 0x00e5ff : 0x0099cc;
        const grid = new THREE.GridHelper(16, 32, gridColor, 0xc2d0dd);
        grid.position.y = 0.002;
        this.scene.add(grid);

        // 實驗室中央工作圓台
        const stationMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.25 });
        const station = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.12, 48), stationMat);
        station.position.y = 0.06;
        station.receiveShadow = true;
        this.scene.add(station);
    }

    _bindResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
