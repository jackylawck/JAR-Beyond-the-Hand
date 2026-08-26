export class ImpactFXManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeTime = 0;

        // 靜態粒子池 (Zero-GC: 120 顆火花)
        this.particleCount = 120;
        this.pPositions = new Float32Array(this.particleCount * 3);
        this.pVelocities = new Float32Array(this.particleCount * 3);
        this.pLifetimes = new Float32Array(this.particleCount);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this.pPositions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x00e5ff,
            size: 0.04,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        this.particleSystem = new THREE.Points(geo, mat);
        this.particleSystem.frustumCulled = false;
        if (this.scene) {
            this.scene.add(this.particleSystem);
        }
    }

    triggerShake(intensity = 0.04, duration = 0.2) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = 0;
    }

    triggerBurst(pos, colorHex = 0x00e5ff) {
        if (!this.particleSystem || !pos) return;
        this.particleSystem.material.color.setHex(colorHex);

        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 3;
            this.pPositions[idx] = pos.x;
            this.pPositions[idx + 1] = pos.y;
            this.pPositions[idx + 2] = pos.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const speed = 1.2 + Math.random() * 2.0;

            this.pVelocities[idx] = Math.sin(phi) * Math.cos(theta) * speed;
            this.pVelocities[idx + 1] = Math.sin(phi) * Math.sin(theta) * speed;
            this.pVelocities[idx + 2] = Math.cos(phi) * speed;

            this.pLifetimes[i] = 0.4 + Math.random() * 0.3;
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    update(dt) {
        // 相機震動
        if (this.shakeTime < this.shakeDuration && this.camera) {
            this.shakeTime += dt;
            const progress = this.shakeTime / this.shakeDuration;
            const currentMag = (1 - progress) * this.shakeIntensity;
            this.camera.position.x += (Math.random() - 0.5) * currentMag;
            this.camera.position.y += (Math.random() - 0.5) * currentMag;
        }

        // 火花微重力粒子生命週期
        let hasActive = false;
        for (let i = 0; i < this.particleCount; i++) {
            if (this.pLifetimes[i] > 0) {
                this.pLifetimes[i] -= dt;
                const idx = i * 3;
                this.pPositions[idx] += this.pVelocities[idx] * dt;
                this.pPositions[idx + 1] += this.pVelocities[idx + 1] * dt - 1.5 * dt * dt;
                this.pPositions[idx + 2] += this.pVelocities[idx + 2] * dt;
                hasActive = true;
            }
        }
        if (hasActive && this.particleSystem) {
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    }

    dispose() {
        if (this.particleSystem && this.scene) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
    }
}
