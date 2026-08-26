import * as THREE from 'three';

export class SceneManager {
    constructor(containerId, mode = 'kid') {
        this.container = document.getElementById(containerId);
        this.mode = mode;

        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this._resizeHandler = null;

        this._init();
    }

    _init() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // 🌟 1. 設定黃金透視相機 (45度俯角對準工作台)
        this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
        // 最佳觀察位置：正前方微偏右上方
        this.camera.position.set(0, 1.8, 2.6);
        this.camera.lookAt(0, 0.45, 0.1);

        // 🌟 2. 渲染器配置
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        // 🌟 3. 柔和環境光與定向光照 (兒童模式明亮溫室 / 科研模式深色實驗室)
        const isKid = (this.mode === 'kid');
        this.scene.background = new THREE.Color(isKid ? 0xd6eef8 : 0x050d18);

        const hemiLight = new THREE.HemisphereLight(0xffffff, isKid ? 0x88bbcc : 0x112233, isKid ? 0.85 : 0.6);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, isKid ? 1.1 : 1.3);
        dirLight.position.set(4, 8, 4);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        // 輔助補光
        const fillLight = new THREE.DirectionalLight(0x00e5ff, 0.35);
        fillLight.position.set(-4, 3, -2);
        this.scene.add(fillLight);

        // 🌟 4. 視窗大小改變自動重算 (防壓扁)
        this._resizeHandler = () => this.onWindowResize();
        window.addEventListener('resize', this._resizeHandler);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.onWindowResize(), 150);
        });
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
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
