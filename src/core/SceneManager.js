/**
 * Three.js 場景管理器：負責建立、渲染、尺寸調整同資源釋放
 * 確保 Memory Leak 零發生
 */
export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x040810, 0.04);

        this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.5, 4.8);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        this._bindResize();
    }

    _bindResize() {
        this._resizeHandler = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    dispose() {
        window.removeEventListener('resize', this._resizeHandler);
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
        // 清理場景中所有物件
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

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
