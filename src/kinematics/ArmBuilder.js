export class ArmBuilder {
    static build(scene) {
        const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });
        const matRed = new THREE.MeshStandardMaterial({ color: 0x8a0f0f, metalness: 0.85, roughness: 0.25 });
        const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1a212b, metalness: 0.95, roughness: 0.3 });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 1.0, roughness: 0.1 });
        const matGlow = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

        const ikBones = [];

        // Base
        const baseGroup = new THREE.Group();
        scene.add(baseGroup);

        const baseHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.24, 32), matRed);
        baseHousing.position.y = 0.12;
        baseHousing.castShadow = true;
        baseGroup.add(baseHousing);

        // Joint 0 (Yaw 旋轉)
        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.26, 0);
        baseGroup.add(joint0);
        ikBones.push({ obj: joint0, axis: 'Y', min: -Math.PI, max: Math.PI });

        const fork = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.25), matDarkSteel);
        fork.position.y = 0.15;
        joint0.add(fork);

        // Joint 1 (Shoulder Pitch - 支援大幅度前後伸展)
        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.3, 0);
        joint0.add(joint1);
        ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.7, max: Math.PI * 0.7 });

        const shoulderPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.36, 16), matChrome);
        shoulderPivot.rotation.z = Math.PI / 2;
        joint1.add(shoulderPivot);

        const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), matGold);
        upperArm.position.set(0, 0.6, 0);
        upperArm.castShadow = true;
        joint1.add(upperArm);

        // Joint 2 (Elbow Pitch - 支援深度伸縮曲折)
        const joint2 = new THREE.Group();
        joint2.position.set(0, 1.2, 0);
        joint1.add(joint2);
        ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.85, max: Math.PI * 0.2 });

        const elbowGear = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 16), matDarkSteel);
        elbowGear.rotation.z = Math.PI / 2;
        joint2.add(elbowGear);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.0, 8), matRed);
        forearm.position.set(0, 0.5, 0);
        forearm.castShadow = true;
        joint2.add(forearm);

        // Joint 3 (Wrist Pitch)
        const joint3 = new THREE.Group();
        joint3.position.set(0, 1.0, 0);
        joint2.add(joint3);
        ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.6, max: Math.PI * 0.6 });

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.18), matGold);
        palm.position.set(0, 0.06, 0);
        joint3.add(palm);

        const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), matChrome);
        clawLeft.position.set(-0.09, 0.18, 0);
        joint3.add(clawLeft);

        const clawRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), matChrome);
        clawRight.position.set(0.09, 0.18, 0);
        joint3.add(clawRight);

        const endEffector = new THREE.Group();
        endEffector.position.set(0, 0.28, 0);
        joint3.add(endEffector);

        // 核心與槽位
        const socketGroup = new THREE.Group();
        socketGroup.position.set(0.9, 0.02, 0.9);
        scene.add(socketGroup);

        const reactorSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 24), matDarkSteel);
        reactorSocket.position.y = 0.07;
        socketGroup.add(reactorSocket);

        const socketRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
        socketRing.rotation.x = Math.PI / 2;
        socketRing.position.y = 0.145;
        socketGroup.add(socketRing);

        const reactorCore = new THREE.Group();
        const coreBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 16), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 }));
        const coreGlow = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 12, 32), matGlow);
        coreGlow.rotation.x = Math.PI / 2;
        reactorCore.add(coreBody);
        reactorCore.add(coreGlow);
        reactorCore.position.set(-0.9, 0.22, 0.9);
        scene.add(reactorCore);

        return { ikBones, endEffector, clawLeft, clawRight, reactorCore, reactorSocket: socketGroup, coreGlow };
    }
}
