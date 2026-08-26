/**
 * 空間動態光塵與同心圓能量流動節點
 */
export class AtmosphereFX {
    constructor(scene) {
        this.scene = scene;

        // 1. 懸浮環境光塵微粒 (140 顆)
        this.dustCount = 140;
        this.dustGeo = new THREE.BufferGeometry();
        this.dustPositions = new Float32Array(this.dustCount * 3);
        this.dustVelocities = [];

        for (let i = 0; i < this.dustCount; i++) {
            this.dustPositions[i * 3] = (Math.random() - 0.5) * 8.0;
            this.dustPositions[i * 3 + 1] = Math.random() * 4.5;
            this.dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 8.0;
            this.dustVelocities.push({
                x: (Math.random() - 0.5) * 0.03,
                y: 0.02 + Math.random() * 0.03,
                z: (Math.random() - 0.5) * 0.03
            });
        }

        this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
        const dustMat = new THREE.PointsMaterial({
            color: 0x00e5ff,
            size: 0.035,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending
        });

        this.dustParticles = new THREE.Points(this.dustGeo, dustMat);
        this.scene.add(this.dustParticles);

        // 2. 能量導流槽循環旋轉光點 (8 顆光節點沿同心圓流動)
        this.energyNodes = [];
        const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        for (let i = 0; i < 8; i++) {
            const node = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), nodeMat);
            this.scene.add(node);
            this.energyNodes.push({
                mesh: node,
                angle: (i / 8) * Math.PI * 2,
                radius: 2.0,
                speed: 0.95
            });
        }
    }

    update(dt) {
        // 更新光塵漂移
        const pos = this.dustGeo.attributes.position.array;
        for (let i = 0; i < this.dustCount; i++) {
            const idx = i * 3;
            pos[idx] += this.dustVelocities[i].x * dt;
            pos[idx + 1] += this.dustVelocities[i].y * dt;
            pos[idx + 2] += this.dustVelocities[i].z * dt;

            if (pos[idx + 1] > 4.5) {
                pos[idx + 1] = 0.1;
                pos[idx] = (Math.random() - 0.5) * 8.0;
                pos[idx + 2] = (Math.random() - 0.5) * 8.0;
            }
        }
        this.dustGeo.attributes.position.needsUpdate = true;

        // 更新能量槽旋轉節點
        for (const n of this.energyNodes) {
            n.angle += n.speed * dt;
            n.mesh.position.set(
                Math.cos(n.angle) * n.radius,
                0.035,
                Math.sin(n.angle) * n.radius
            );
        }
    }
}
