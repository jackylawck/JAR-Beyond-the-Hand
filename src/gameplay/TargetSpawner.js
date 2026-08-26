import * as THREE from 'three';

export class TargetSpawner {
    static getStageConfig(mode, step) {
        // 🌟 刀法 1：層級挑戰 (Scalable Difficulty)
        const configs = {
            kid: [
                { pos: [-0.85, 0.25, 0.85], tol: 0.65, scale: 1.0, label: '🍓 初熟草莓' },
                { pos: [-0.40, 0.25, 1.20], tol: 0.55, scale: 0.8, label: '🍓 中型草莓' },
                { pos: [-1.10, 0.25, 0.60], tol: 0.45, scale: 0.6, label: '🍓 迷你草莓' }
            ],
            advanced: [
                { pos: [-0.85, 0.21, 1.0], tol: 0.35, scale: 1.0, label: '📱 主機板晶片' },
                { pos: [-0.60, 0.21, 1.3], tol: 0.28, scale: 0.8, label: '📱 記憶體模組' },
                { pos: [-1.20, 0.21, 0.8], tol: 0.22, scale: 0.6, label: '📱 微型處理器' }
            ],
            research: [
                { pos: [-0.7, 0.25, 0.9], tol: 0.20, scale: 1.0, label: '🧪 Alpha 樣本' },
                { pos: [-1.1, 0.25, 0.7], tol: 0.15, scale: 0.8, label: '🧪 Beta 樣本' },
                { pos: [-0.5, 0.25, 1.1], tol: 0.10, scale: 0.7, label: '🧪 Omega 樣本 (極危險)' }
            ]
        };
        return configs[mode][step % 3];
    }

    static spawnTarget(mode, scene, stepIndex = 0) {
        const targetGroup = new THREE.Group();
        const conf = this.getStageConfig(mode, stepIndex);

        if (mode === 'kid') {
            const berry = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.6 })
            );
            berry.scale.set(1, 0.85, 1);
            const leaf = new THREE.Mesh(
                new THREE.ConeGeometry(0.05, 0.04, 6),
                new THREE.MeshStandardMaterial({ color: 0x33aa44, roughness: 0.8 })
            );
            leaf.position.y = 0.09;
            targetGroup.add(berry, leaf);
            
            targetGroup.userData.animate = (time) => {
                targetGroup.rotation.z = Math.sin(time * 2.5 + stepIndex) * 0.15;
            };
        } 
        else if (mode === 'advanced') {
            const chip = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.8, emissive: 0x00aaff, emissiveIntensity: 0.2 })
            );
            for (let i = -2; i <= 2; i++) {
                const pin = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.03, 0.005), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
                pin.position.set(i * 0.02, -0.02, 0.055);
                chip.add(pin);
                const pin2 = pin.clone(); pin2.position.set(i * 0.02, -0.02, -0.055);
                chip.add(pin2);
            }
            targetGroup.add(chip);
            
            targetGroup.userData.animate = (time) => {
                chip.material.emissiveIntensity = 0.2 + Math.sin(time * 6.0) * 0.4;
            };
        } 
        else {
            const tube = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.03, 0.12, 12),
                new THREE.MeshPhysicalMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, roughness: 0.02 })
            );
            const liquid = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.022, 0.06, 12),
                new THREE.MeshStandardMaterial({ color: 0x0066ff, emissive: 0x0044ff, emissiveIntensity: 0.4 })
            );
            liquid.position.y = -0.02;
            targetGroup.add(tube, liquid);

            targetGroup.userData.animate = (time) => {
                liquid.position.y = -0.02 + Math.sin(time * 4.0) * 0.008;
                liquid.scale.set(1.0 + Math.sin(time * 8.0)*0.02, 1, 1.0 + Math.cos(time * 8.0)*0.02);
            };
        }

        // 應用層級難度
        targetGroup.scale.setScalar(conf.scale);
        targetGroup.position.set(conf.pos[0], conf.pos[1], conf.pos[2]);
        targetGroup.userData.tolerance = conf.tol;
        targetGroup.userData.label = conf.label;

        scene.add(targetGroup);
        return targetGroup;
    }
}
