export class TargetSpawner {
    static spawnTarget(mode, scene) {
        const targetGroup = new THREE.Group();

        if (mode === 'kid') {
            // 🍓 兒童模式：草莓
            const berry = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 16, 16),
                new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.6, metalness: 0.1 })
            );
            berry.scale.set(1, 0.85, 1);
            const leaf = new THREE.Mesh(
                new THREE.ConeGeometry(0.05, 0.04, 6),
                new THREE.MeshStandardMaterial({ color: 0x33aa44, roughness: 0.8 })
            );
            leaf.position.y = 0.09;
            leaf.rotation.x = Math.PI / 6;
            targetGroup.add(berry, leaf);
            targetGroup.position.set(-0.85, 0.25, 0.85);
            // 高容錯：0.65m
            targetGroup.userData = { type: 'fruit', tolerance: 0.65, label: '🍓 農業採摘任務' };
        } 
        else if (mode === 'advanced') {
            // 📱 進階模式：晶片
            const chip = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.015, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.8 })
            );
            for (let i = -2; i <= 2; i++) {
                const pin = new THREE.Mesh(
                    new THREE.BoxGeometry(0.005, 0.03, 0.005),
                    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 })
                );
                pin.position.set(i * 0.02, -0.02, 0.055);
                chip.add(pin);
                const pin2 = pin.clone();
                pin2.position.set(i * 0.02, -0.02, -0.055);
                chip.add(pin2);
            }
            targetGroup.add(chip);
            targetGroup.position.set(-0.85, 0.25, 0.85);
            // 中度容錯：0.35m
            targetGroup.userData = { type: 'chip', tolerance: 0.35, label: '📱 3C 組裝任務' };
        } 
        else {
            // 🧪 科研模式：發光試管
            const tube = new THREE.Mesh(
                new THREE.CylinderGeometry(0.025, 0.03, 0.12, 12),
                new THREE.MeshPhysicalMaterial({
                    color: 0x88ccff, transparent: true, opacity: 0.3, roughness: 0.02, clearcoat: 0.5
                })
            );
            const liquid = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.022, 0.06, 12),
                new THREE.MeshStandardMaterial({ color: 0x0066ff, emissive: 0x0044ff, emissiveIntensity: 0.4 })
            );
            liquid.position.y = -0.02;
            targetGroup.add(tube, liquid);
            targetGroup.position.set(-0.85, 0.25, 0.85);
            // 極限容錯：0.20m (需要極精準)
            targetGroup.userData = { type: 'tube', tolerance: 0.20, label: '🧪 實驗室抽樣任務' };
        }

        scene.add(targetGroup);
        return targetGroup;
    }
}
