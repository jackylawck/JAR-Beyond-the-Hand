export class ArmBuilder {
    static build(scene) {
        // 燈光與環境
        scene.add(new THREE.AmbientLight(0x406080, 0.9));
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(4, 8, 4);
        scene.add(dir);

        scene.add(new THREE.GridHelper(14, 28, 0x00e5ff, 0x112233));
        const table = new THREE.Mesh(
            new THREE.CylinderGeometry(2.4, 2.5, 0.2, 32),
            new THREE.MeshStandardMaterial({ color: 0x121720, roughness: 0.3, metalness: 0.8 })
        );
        table.position.y = 0.1;
        scene.add(table);

        // 材質
        const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
        const matRed = new THREE.MeshStandardMaterial({ color: 0x8b0000, metalness: 0.75, roughness: 0.3 });
        const matJoint = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.4 });
        const matArc = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const ikBones = [];

        // 基座
        const baseGroup = new THREE.Group();
        baseGroup.position.set(0, 0.2, 0);
        scene.add(baseGroup);

        const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 0.3, 24), matRed);
        baseMesh.position.y = 0.15;
        baseGroup.add(baseMesh);

        // 關節 0: Base Yaw
        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.3, 0);
        baseGroup.add(joint0);
        ikBones.push({ obj: joint0, axis: 'Y', min: -Math.PI, max: Math.PI });
        joint0.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), matJoint));

        // 關節 1: Shoulder Pitch
        const joint1 = new THREE.Group();
        joint0.add(joint1);
        ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.45, max: Math.PI * 0.45 });

        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 1.2, 16), matGold);
        upperArm.position.set(0, 0.6, 0);
        joint1.add(upperArm);

        // 關節 2: Elbow Pitch
        const elbowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), matJoint);
        elbowMesh.position.set(0, 1.2, 0);
        joint1.add(elbowMesh);

        const joint2 = new THREE.Group();
        joint2.position.set(0, 1.2, 0);
        joint1.add(joint2);
        ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.75, max: 0.05 });

        const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.0, 16), matRed);
        foreArm.position.set(0, 0.5, 0);
        joint2.add(foreArm);

        // 關節 3: Wrist Pitch
        const wristMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 16), matJoint);
        wristMesh.position.set(0, 1.0, 0);
        joint2.add(wristMesh);

        const joint3 = new THREE.Group();
        joint3.position.set(0, 1.0, 0);
        joint2.add(joint3);
        ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.5, max: Math.PI * 0.5 });

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.18), matGold);
        palm.position.set(0, 0.08, 0);
        joint3.add(palm);

        const palmArc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), matArc);
        palmArc.rotation.x = Math.PI / 2;
        palmArc.position.set(0, 0.08, 0.09);
        joint3.add(palmArc);

        const fingerGeo = new THREE.BoxGeometry(0.035, 0.26, 0.07);
        const clawLeft = new THREE.Mesh(fingerGeo, matGold);
        clawLeft.position.set(-0.08, 0.2, 0);
        joint3.add(clawLeft);

        const clawRight = new THREE.Mesh(fingerGeo, matGold);
        clawRight.position.set(0.08, 0.2, 0);
        joint3.add(clawRight);

        const endEffector = new THREE.Group();
        endEffector.position.set(0, 0.32, 0);
        joint3.add(endEffector);

        // 任務物件：方舟反應爐與槽位
        const reactorSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.3, 0.1, 24),
            new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.9 })
        );
        reactorSocket.position.set(0.75, 0.25, 0.75);
        scene.add(reactorSocket);

        const socketHole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16),
            new THREE.MeshBasicMaterial({ color: 0x001122 })
        );
        socketHole.position.set(0.75, 0.26, 0.75);
        scene.add(socketHole);

        const reactorCore = new THREE.Group();
        const coreMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.16, 16),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9 })
        );
        const coreGlow = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.025, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        coreGlow.rotation.x = Math.PI / 2;
        reactorCore.add(coreMesh);
        reactorCore.add(coreGlow);
        reactorCore.position.set(-0.75, 0.3, 0.85);
        scene.add(reactorCore);

        return { ikBones, endEffector, clawLeft, clawRight, reactorCore, reactorSocket };
    }
}
