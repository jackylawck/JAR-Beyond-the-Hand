export class ArmBuilder {
    static build(scene) {
        const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.2 });
        const matNavy = new THREE.MeshStandardMaterial({ color: 0x1b2838, metalness: 0.7, roughness: 0.3 });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, metalness: 0.95, roughness: 0.1 });
        const matOrange = new THREE.MeshStandardMaterial({ color: 0xff5500, metalness: 0.4, roughness: 0.3 });

        const ikBones = [];

        // 1. 基座 (Base Yaw)
        const baseGroup = new THREE.Group();
        baseGroup.position.set(0, 0.12, 0);
        scene.add(baseGroup);

        const baseArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.18, 32), matNavy);
        baseArmor.position.y = 0.09;
        baseArmor.castShadow = true;
        baseGroup.add(baseArmor);

        // 旋轉軸 (關節 0)
        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.18, 0);
        baseGroup.add(joint0);
        ikBones.push({ obj: joint0, axis: 'Y', min: -Math.PI, max: Math.PI });

        // 2. 肩部俯仰 (關節 1)
        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.22, 0);
        joint0.add(joint1);
        ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.45, max: Math.PI * 0.55 });

        // 大臂外筒 (Outer Boom)
        const boomOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 16), matWhite);
        boomOuter.position.set(0, 0.45, 0);
        boomOuter.castShadow = true;
        joint1.add(boomOuter);

        // 🌟 物理伸縮套筒桿 (Telescopic Extension Rod)
        const extensionRod = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.9, 16), matChrome);
        extensionRod.position.set(0, 0.65, 0); // 預設伸出位置
        joint1.add(extensionRod);

        // 3. 肘關節 (關節 2)
        const joint2 = new THREE.Group();
        joint2.position.set(0, 0.9, 0);
        joint1.add(joint2);
        ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.75, max: 0.2 });

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.8, 16), matNavy);
        forearm.position.set(0, 0.4, 0);
        forearm.castShadow = true;
        joint2.add(forearm);

        // 4. 腕部 (關節 3，朝下抓取配置)
        const joint3 = new THREE.Group();
        joint3.position.set(0, 0.8, 0);
        joint2.add(joint3);
        ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.6, max: Math.PI * 0.6 });

        // 手掌
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.15), matWhite);
        palm.position.set(0, 0.06, 0);
        joint3.add(palm);

        // 雙指夾爪
        const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.06), matOrange);
        clawLeft.position.set(-0.07, 0.16, 0);
        clawLeft.castShadow = true;
        joint3.add(clawLeft);

        const clawRight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.06), matOrange);
        clawRight.position.set(0.07, 0.16, 0);
        clawRight.castShadow = true;
        joint3.add(clawRight);

        // 末端基準點
        const endEffector = new THREE.Group();
        endEffector.position.set(0, 0.24, 0);
        joint3.add(endEffector);

        // 5. 量子核心與基座槽位
        const socketGroup = new THREE.Group();
        socketGroup.position.set(0.9, 0.12, 0.9);
        scene.add(socketGroup);

        const reactorSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.32, 0.12, 24),
            new THREE.MeshStandardMaterial({ color: 0xff7700, metalness: 0.5, roughness: 0.3 })
        );
        reactorSocket.position.y = 0.06;
        reactorSocket.castShadow = true;
        socketGroup.add(reactorSocket);

        const reactorCore = new THREE.Group();
        const coreBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16),
            new THREE.MeshStandardMaterial({ color: 0x0099ff, metalness: 0.3, roughness: 0.1 })
        );
        const coreGlow = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.025, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0x00e5ff })
        );
        coreGlow.rotation.x = Math.PI / 2;

        reactorCore.add(coreBody);
        reactorCore.add(coreGlow);
        reactorCore.position.set(-0.9, 0.2, 0.9);
        reactorCore.castShadow = true;
        scene.add(reactorCore);

        return {
            ikBones,
            endEffector,
            clawLeft,
            clawRight,
            reactorCore,
            reactorSocket: socketGroup,
            coreGlow,
            extensionRod, // 導出伸縮桿
            joint2
        };
    }
}
