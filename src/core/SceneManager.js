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
        const w = window.innerWidth || document.documentElement.clientWidth || 375;
        const h = window.innerHeight || document.documentElement.clientHeight || 667;

        // 🌟 1. 經典立體 35° 俯瞰相機視角 (重現工作台深邃空間感)
        this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
        this.camera.position.set(0, 2.4, 3.2); // 拉高視角，由上向下俯視
        this.camera.lookAt(0, 0.2, 0);

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

        // 🌟 3. 柔和雙色天空與地面反射光
        const isKid = (this.mode === 'kid');
        this.scene.background = new THREE.Color(isKid ? 0xddeef8 : 0x050d1a);

        // 天空光（明亮白）+ 地面反射光（溫潤淺灰藍）
        const hemiLight = new THREE.HemisphereLight(0xffffff, isKid ? 0xaaccdd : 0x1a2b3c, isKid ? 1.1 : 0.8);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        // 🌟 4. 主聚光燈（正前上方 45° 照射，徹底消除正面死黑）
        const mainLight = new THREE.DirectionalLight(0xffffff, isKid ? 1.3 : 1.5);
        mainLight.position.set(2.5, 6.0, 4.0); // 移至鏡頭同側前上方順光
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

        // 背部輪廓邊緣光（Rim Light，勾勒機械臂金屬輪廓）
        const rimLight = new THREE.DirectionalLight(0x00e5ff, isKid ? 0.45 : 0.7);
        rimLight.position.set(-3.5, 4.0, -3.0);
        this.scene.add(rimLight);

        // 視窗自適應
        this._resizeHandler = () => this.onWindowResize();
        window.addEventListener('resize', this._resizeHandler);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.onWindowResize(), 150);
        });
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
