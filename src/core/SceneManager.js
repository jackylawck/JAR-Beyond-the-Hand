import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { IBLGenerator } from './IBLGenerator.js';

export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        // 1. 場景大氣霧霾
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x060a12, 0.022);

        // 2. 透視相機
        this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.8, 5.5);

        // 3. WebGL 渲染器（啟用陰影與色調映射）
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. 動態 IBL 烘焙環境貼圖（消除死黑塑料感）
        this.scene.environment = IBLGenerator.generate(this.renderer);

        // 5. 後期處理 Bloom 管線
        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(pixelRatio);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.55, // Bloom Strength
            0.32, // Radius
            0.22  // Threshold
        );
        this.composer.addPass(this.bloomPass);

        this._bindResize();
    }

    _bindResize() {
        this._resizeHandler = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const pr = Math.min(window.devicePixelRatio, 2);

            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(w, h);
            this.renderer.setPixelRatio(pr);

            this.composer.setSize(w, h);
            this.composer.setPixelRatio(pr);
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    render() {
        this.composer.render();
    }

    dispose() {
        window.removeEventListener('resize', this._resizeHandler);

        this.composer.passes.forEach(pass => {
            if (pass.dispose) pass.dispose();
        });
        this.renderer.dispose();

        if (this.renderer.domElement && this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }

        while (this.scene.children.length > 0) {
            const child = this.scene.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            this.scene.remove(child);
        }
    }
}
