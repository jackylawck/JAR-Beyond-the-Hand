export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.025);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.2, 5.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this._buildLighting();
        this._buildMinimalLab();
        this._bindResize();
    }

    _buildLighting() {
        this.scene.add(new THREE.AmbientLight(0x222d3d, 1.5));

        const mainSpot = new THREE.SpotLight(0xffffff, 4.0, 20, Math.PI / 3, 0.3, 1.2);
        mainSpot.position.set(3, 7, 4);
        mainSpot.castShadow = true;
        this.scene.add(mainSpot);

        const rimLight = new THREE.DirectionalLight(0x00e5ff, 2.0);
        rimLight.position.set(-5, 5, -4);
        this.scene.add(rimLight);
    }

    _buildMinimalLab() {
        // 沉穩啞光工業地台
        const floorGeo = new THREE.CylinderGeometry(3.5, 3.6, 0.15, 48);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x141820, metalness: 0.8, roughness: 0.3 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.075;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 簡約細網格
        const grid = new THREE.GridHelper(12, 24, 0x00e5ff, 0x1a2636);
        grid.position.y = 0.005;
        this.scene.add(grid);
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
