export class AtmosphereFX {
    constructor(scene) {
        this.scene = scene;
        // 僅保留極微弱環境浮塵
        const count = 60;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i += 3) {
            pos[i] = (Math.random() - 0.5) * 6;
            pos[i + 1] = Math.random() * 3.5;
            pos[i + 2] = (Math.random() - 0.5) * 6;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.025, transparent: true, opacity: 0.3 });
        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);
    }

    update(dt) {
        if (this.particles) this.particles.rotation.y += 0.01 * dt;
    }
}
