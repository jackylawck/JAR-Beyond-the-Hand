export class AtmosphereFX {
    constructor(scene) {
        this.scene = scene;

        // 1. 懸浮環境光塵微粒 (Floating Dust Motes) - 150 顆
        this.dustCount = 150;
        this.dustGeo = new THREE.BufferGeometry();
        this.dustPositions = new Float32Array(this.dustCount * 3);
        this.dustVelocities = [];

        for (let i = 0; i < this.dustCount; i++) {
            this.dustPositions[i * 3] = (Math.random() - 0.5) * 6.0;
            this.dustPositions[i * 3 + 1] = Math.random() * 3.5;
            this.dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 6.0;
            this.dustVelocities.push({
                x: (Math.random() - 0.5) * 0.05,
                y: 0.02 + Math.random() * 0.04,
                z: (Math.random() - 0.5) * 0.05
            });
        }

        this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0x00e5ff,
            size: 0.035,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending
        });

        this.dustParticles = new THREE.Points(this.dustGeo, dustMat);
        this.scene.add(this.dustParticles);

        // 2. 能量導流槽流動脈衝光點 (Flowing Energy Nodes)
        this.energyNodes = [];
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        for (let i = 0; i < 8; i++) {
            const node = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), nodeMat);
            this.scene.add(node);
            this.energyNodes.push({ mesh: node, angle: (i / 8) * Math.PI * 2, radius: 2.35, speed: 0.8 });
        }
    }

    update(dt) {
        // 浮塵微漂移
        const pos = this.dustGeo.attributes.position.array;
        for (let i = 0; i < this.dustCount; i++) {
            const idx = i * 3;
            pos[idx] += this.dustVelocities[i].x * dt;
            pos[idx + 1] += this.dustVelocities[i].y * dt;
            pos[idx + 2] += this.dustVelocities[i].z * dt;

            // 頂部邊界循環重置
            if (pos[idx + 1] > 3.8) {
                pos[idx + 1] = 0.1;
                pos[idx] = (Math.random() - 0.5) * 6.0;
                pos[idx + 2] = (Math.random() - 0.5) * 6.0;
            }
        }
        this.dustGeo.attributes.position.needsUpdate = true;

        // 能量環粒子旋轉流動
        for (const n of this.energyNodes) {
            n.angle += n.speed * dt;
            n.mesh.position.set(
                Math.cos(n.angle) * n.radius,
                0.04,
                Math.sin(n.angle) * n.radius
            );
        }
    }
}
