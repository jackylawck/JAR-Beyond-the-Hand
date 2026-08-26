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

        // 1. 相機配置（黃金視角）
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 50);
        this.camera.position.set(0, 1.6, 2.4);
        this.camera.lookAt(0, 0.45, 0.1);

        // 2. 渲染器配置
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        // 3. 場景背景與光照
        const isKid = (this.mode === 'kid');
        this.scene.background = new THREE.Color(isKid ? 0xd6eef8 : 0x050d18);

        const hemiLight = new THREE.HemisphereLight(0xffffff, isKid ? 0x88bbcc : 0x112233, isKid ? 0.9 : 0.6);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, isKid ? 1.2 : 1.4);
        dirLight.position.set(4, 8, 4);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x00e5ff, 0.35);
        fillLight.position.set(-4, 3, -2);
        this.scene.add(fillLight);

        // 4. 視窗適配
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
