import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Three.js 場景生命週期與後期處理管理器 (Zero-GC / 3A Post-Processing)
 */
export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        // 1. 場景初始化與大氣霧霾 (Atmospheric Fog)
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x040810, 0.018);

        // 2. 透視相機配置
        this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.8, 5.2);

        // 3. WebGL 高效能渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.35;
        this.container.appendChild(this.renderer.domElement);

        // 4. 後期處理管線 (Unreal Bloom)
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.65, // 泛光強度 (Bloom Strength)
            0.35, // 擴散半徑 (Bloom Radius)
            0.20  // 發光閾值 (Bloom Threshold)
        );
        this.composer.addPass(this.bloomPass);

        this._bindResize();
    }

    _bindResize() {
        this._resizeHandler = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            this.composer.setSize(w, h);
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    render() {
        this.composer.render();
    }

    dispose() {
        window.removeEventListener('resize', this._resizeHandler);

        // 釋放後期處理緩衝區與渲染器
        this.composer.passes.forEach(pass => {
            if (pass.dispose) pass.dispose();
        });
        this.renderer.dispose();

        if (this.renderer.domElement && this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }

        // 清理場景物件與材質
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
