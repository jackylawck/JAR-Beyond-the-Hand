export class AtmosphereFX {
    constructor(scene) {
        this.scene = scene;

        // 1. 140 顆大氣懸浮光塵
        this.dustCount = 140;
        this.dustGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(this.dustCount * 3);
        for (let i = 0; i < this.dustCount * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 8;
            pos[i + 1] = Math.random() * 4;
            pos[i + 2] = (Math.random() - 0.5) * 8;
        }
        this.dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0x00e5ff,
            size: 0.035,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        this.dustParticles = new THREE.Points(this.dustGeo, dustMat);
        this.scene.add(this.dustParticles);

        // 2. 8 顆同心圓能量流動光節點
        this.energyNodes = [];
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        for (let i = 0; i < 8; i++) {
            const node = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), nodeMat);
            this.scene.add(node);
            this.energyNodes.push({ mesh: node, angle: (i / 8) * Math.PI * 2, radius: 2.0, speed: 0.95 });
        }
    }

    update(dt) {
        if (this.dustParticles) {
            this.dustParticles.rotation.y += 0.02 * dt;
        }

        for (const n of this.energyNodes) {
            n.angle += n.speed * dt;
            n.mesh.position.set(Math.cos(n.angle) * n.radius, 0.035, Math.sin(n.angle) * n.radius);
        }
    }
}
