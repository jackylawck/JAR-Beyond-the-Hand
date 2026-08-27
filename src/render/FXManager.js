import * as THREE from 'three';

export class FXManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // 鏡頭微震狀態
        this._shakeTime = 0;
        this._shakeDuration = 0;
        this._shakeIntensity = 0;
        this._originalCamPos = new THREE.Vector3();

        // 🌟 Zero-GC 粒子池 (預先建立 60 顆物理粒子)
        this.particleCount = 60;
        const geo = new THREE.BufferGeometry();
        this._positions = new Float32Array(this.particleCount * 3);
        this._velocities = [];
        this._lifetimes = new Float32Array(this.particleCount);

        for (let i = 0; i < this.particleCount; i++) {
            this._velocities.push(new THREE.Vector3());
            this._lifetimes[i] = 0;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3));
        this.particleMat = new THREE.PointsMaterial({
            size: 0.04,
            color: 0x00ff66,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geo, this.particleMat);
        this.particles.visible = false;
        this.scene.add(this.particles);
    }

    // 觸發鏡頭微震
    triggerShake(intensity = 0.04, duration = 0.25) {
        this._shakeIntensity = intensity;
        this._shakeDuration = duration;
        this._shakeTime = duration;
        if (this.camera) this._originalCamPos.copy(this.camera.position);
    }

    // 觸發能量粒子爆發 (綠色抓取 / 金色通關)
    triggerBurst(worldPos, colorHex = 0x00ff66) {
        this.particleMat.color.setHex(colorHex);
        this.particles.visible = true;
        const posAttr = this.particles.geometry.attributes.position;

        for (let i = 0; i < this.particleCount; i++) {
            this._positions[i * 3] = worldPos.x;
            this._positions[i * 3 + 1] = worldPos.y;
            this._positions[i * 3 + 2] = worldPos.z;

            // 隨機向外擴散的初速度向量
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 0.8 + Math.random() * 1.6;
            this._velocities[i].set(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed + 0.6,
                Math.sin(phi) * Math.sin(theta) * speed
            );
            this._lifetimes[i] = 0.6 + Math.random() * 0.4;
        }
        posAttr.needsUpdate = true;
    }

    update(dt) {
        const safeDt = Math.min(0.04, dt);

        // 1. 鏡頭震動衰減計算
        if (this._shakeTime > 0 && this.camera) {
            this._shakeTime -= safeDt;
            const progress = this._shakeTime / this._shakeDuration;
            const factor = this._shakeIntensity * progress;
            this.camera.position.x = this._originalCamPos.x + (Math.random() - 0.5) * factor;
            this.camera.position.y = this._originalCamPos.y + (Math.random() - 0.5) * factor;
            this.camera.position.z = this._originalCamPos.z + (Math.random() - 0.5) * factor;

            if (this._shakeTime <= 0) {
                this.camera.position.copy(this._originalCamPos);
            }
        }

        // 2. 粒子物理軌跡演算
        if (this.particles.visible) {
            let activeCount = 0;
            const posAttr = this.particles.geometry.attributes.position;

            for (let i = 0; i < this.particleCount; i++) {
                if (this._lifetimes[i] > 0) {
                    this._lifetimes[i] -= safeDt;
                    activeCount++;

                    // 物理重力與阻力
                    this._velocities[i].y -= 2.8 * safeDt;
                    this._velocities[i].multiplyScalar(0.96);

                    this._positions[i * 3] += this._velocities[i].x * safeDt;
                    this._positions[i * 3 + 1] += this._velocities[i].y * safeDt;
                    this._positions[i * 3 + 2] += this._velocities[i].z * safeDt;
                }
            }

            posAttr.needsUpdate = true;
            if (activeCount === 0) this.particles.visible = false;
        }
    }
}
