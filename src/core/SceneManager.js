export class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) throw new Error(`Container #${containerId} not found`);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050a14, 0.03);

        this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 3.8, 5.8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.4;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this._buildLighting();
        this._buildIndustrialFactoryScene();
        this._bindResize();
    }

    _buildLighting() {
        this.scene.add(new THREE.AmbientLight(0x223348, 1.8));

        const mainSpot = new THREE.SpotLight(0xffffff, 4.8, 22, Math.PI / 3.5, 0.4, 1.2);
        mainSpot.position.set(3.5, 8, 4.5);
        mainSpot.castShadow = true;
        mainSpot.shadow.mapSize.width = 1024;
        mainSpot.shadow.mapSize.height = 1024;
        this.scene.add(mainSpot);

        // 輪廓邊緣冷藍光 (Rim Light)
        const rimLight = new THREE.DirectionalLight(0x00e5ff, 3.6);
        rimLight.position.set(-6, 6, -5);
        this.scene.add(rimLight);

        // 底部回火暖橙補光
        const warmBounce = new THREE.DirectionalLight(0xff6600, 1.3);
        warmBounce.position.set(4, -1, 3);
        this.scene.add(warmBounce);
    }

    _buildIndustrialFactoryScene() {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0f16, metalness: 0.85, roughness: 0.4 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x16202c, metalness: 0.95, roughness: 0.2 });
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x242e3a, metalness: 0.9, roughness: 0.3 });
        const glowCyan = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        // 1. 後方巨型科技背牆
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(28, 14), wallMat);
        backWall.position.set(0, 5, -8);
        this.scene.add(backWall);

        // 2. 鋼結構立柱與散熱鰭片矩陣
        for (let x = -8; x <= 8; x += 4) {
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 14, 0.45), frameMat);
            pillar.position.set(x, 5, -7.8);
            this.scene.add(pillar);

            // 散熱鰭片組 (Fins)
            for (let y = 1; y < 9; y += 1.2) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.2), frameMat);
                fin.position.set(x, y, -7.6);
                this.scene.add(fin);
            }
        }

        // 3. 橫貫式工業能量冷卻管道 (Industrial Pipes)
        for (let y of [2.2, 4.8, 6.4]) {
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 24, 16), pipeMat);
            pipe.rotation.z = Math.PI / 2;
            pipe.position.set(0, y, -7.5);
            this.scene.add(pipe);
        }

        // 4. 全息發光掃描燈帶
        const wallStrip = new THREE.Mesh(new THREE.BoxGeometry(20, 0.08, 0.05), glowCyan);
        wallStrip.position.set(0, 3.5, -7.4);
        this.scene.add(wallStrip);

        // 5. 頂部工業照明燈槽
        for (let z = -4; z <= 4; z += 4) {
            const lightBar = new THREE.Mesh(
                new THREE.BoxGeometry(12, 0.15, 0.3),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            lightBar.position.set(0, 7.8, z);
            this.scene.add(lightBar);
        }

        // 6. 下沉式裝甲工作台
        const floorGeo = new THREE.CylinderGeometry(3.5, 3.7, 0.2, 48);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x141b24, metalness: 0.9, roughness: 0.3 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(18, 36, 0x00e5ff, 0x112233);
        grid.position.y = 0.01;
        this.scene.add(grid);

        // 7. 3 層同心圓導流槽底座
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.9 + i * 0.55, 0.015, 8, 64),
                new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 - i * 0.1 })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.02;
            this.scene.add(ring);
        }

        // 8. J.A.R. 專屬全息地台投影
        const labelSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: (() => {
                    const c = document.createElement('canvas');
                    c.width = 512; c.height = 128;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = 'transparent'; ctx.fillRect(0, 0, 512, 128);
                    ctx.font = '800 38px "Segoe UI", sans-serif';
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 18;
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillText('⚡ J.A.R. ROBOTICS // LAB-01', 256, 64);
                    return new THREE.CanvasTexture(c);
                })(),
                transparent: true, depthWrite: false
            })
        );
        labelSprite.position.set(0, 0.06, 1.7);
        labelSprite.scale.set(1.5, 0.38, 1);
        this.scene.add(labelSprite);
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
