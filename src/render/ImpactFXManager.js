import { POOL } from '../core/Pool.js';

export class ImpactFXManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // 相機震動狀態
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeTime = 0;

        // 靜態粒子池 (Zero-GC Particle Pool: 120 顆)
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
        this.scene.add(this.particleSystem);
    }

    triggerShake(intensity = 0.05, duration = 0.2) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = 0;
    }

    triggerBurst(pos, colorHex = 0x00e5ff) {
        this.particleSystem.material.color.setHex(colorHex);
        for (let i = 0; i < this.particleCount; i++) {
            const idx = i * 3;
            this.pPositions[idx] = pos.x;
            this.pPositions[idx + 1] = pos.y;
            this.pPositions[idx + 2] = pos.z;

            // 隨機球形初速度
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const speed = 1.2 + Math.random() * 2.0;

            this.pVelocities[idx] = Math.sin(phi) * Math.cos(theta) * speed;
            this.pVelocities[idx + 1] = Math.sin(phi) * Math.sin(theta) * speed;
            this.pVelocities[idx + 2] = Math.cos(phi) * speed;

            this.pLifetimes[i] = 0.4 + Math.random() * 0.3; // 壽命 (s)
        }
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    update(dt) {
        // 1. 更新相機震動
        if (this.shakeTime < this.shakeDuration) {
            this.shakeTime += dt;
            const progress = this.shakeTime / this.shakeDuration;
            const currentMag = (1 - progress) * this.shakeIntensity;
            this.camera.position.x += (Math.random() - 0.5) * currentMag;
            this.camera.position.y += (Math.random() - 0.5) * currentMag;
        }

        // 2. 更新粒子生命週期與重力
        let hasActive = false;
        for (let i = 0; i < this.particleCount; i++) {
            if (this.pLifetimes[i] > 0) {
                this.pLifetimes[i] -= dt;
                const idx = i * 3;
                this.pPositions[idx] += this.pVelocities[idx] * dt;
                this.pPositions[idx + 1] += this.pVelocities[idx + 1] * dt - 1.5 * dt * dt; // 微重力
                this.pPositions[idx + 2] += this.pVelocities[idx + 2] * dt;
                hasActive = true;
            }
        }
        if (hasActive) {
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}
