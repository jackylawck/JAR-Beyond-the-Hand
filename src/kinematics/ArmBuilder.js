export class ArmBuilder {
    static build(scene) {
        const scratchTex = (() => {
            const c = document.createElement('canvas');
            c.width = 256;
            c.height = 256;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#555555';
            ctx.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 200; i++) {
                ctx.strokeStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.2})`;
                ctx.lineWidth = 1 + Math.random();
                ctx.beginPath();
                const x = Math.random() * 256;
                const y = Math.random() * 256;
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
                ctx.stroke();
            }
            const t = new THREE.CanvasTexture(c);
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(2, 2);
            return t;
        })();

        const matGold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.92, roughness: 0.22, roughnessMap: scratchTex });
        const matRed = new THREE.MeshStandardMaterial({ color: 0x8a0f0f, metalness: 0.88, roughness: 0.24, roughnessMap: scratchTex });
        const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1c222b, metalness: 0.96, roughness: 0.28, roughnessMap: scratchTex });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 1.0, roughness: 0.08 });
        const matCyanGlow = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        const ikBones = [];

        const baseGroup = new THREE.Group();
        scene.add(baseGroup);

        const baseArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.28, 32), matRed);
        baseArmor.position.y = 0.14;
        baseArmor.castShadow = true;
        baseArmor.receiveShadow = true;
        baseGroup.add(baseArmor);

        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.06, 32), matDarkSteel);
        flange.position.y = 0.31;
        baseGroup.add(flange);

        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.34, 0);
        baseGroup.add(joint0);
        ikBones.push({ obj: joint0, axis: 'Y', min: -Math.PI, max: Math.PI });

        const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.32), matDarkSteel);
        forkL.position.set(-0.25, 0.18, 0);
        forkL.castShadow = true;
        joint0.add(forkL);

        const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.32), matDarkSteel);
        forkR.position.set(0.25, 0.18, 0);
        forkR.castShadow = true;
        joint0.add(forkR);

        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.35, 0);
        joint0.add(joint1);
        ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.45, max: Math.PI * 0.45 });

        const shoulderAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.5, 24), matChrome);
        shoulderAxis.rotation.z = Math.PI / 2;
        joint1.add(shoulderAxis);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.16), matGold);
        armL.position.set(-0.14, 0.58, 0);
        armL.castShadow = true;
        joint1.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.16), matGold);
        armR.position.set(0.14, 0.58, 0);
        armR.castShadow = true;
        joint1.add(armR);

        const pistonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.75, 16), matDarkSteel);
        pistonBase.position.set(0, 0.42, -0.09);
        pistonBase.castShadow = true;
        joint1.add(pistonBase);

        const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.7, 16), matChrome);
        pistonRod.position.set(0, 0.8, -0.09);
        joint1.add(pistonRod);

        const joint2 = new THREE.Group();
        joint2.position.set(0, 1.15, 0);
        joint1.add(joint2);
        ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.75, max: 0.05 });

        const elbowGear = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.4, 24), matDarkSteel);
        elbowGear.rotation.z = Math.PI / 2;
        joint2.add(elbowGear);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.92, 8), matRed);
        forearm.position.set(0, 0.46, 0);
        forearm.castShadow = true;
        joint2.add(forearm);

        const joint3 = new THREE.Group();
        joint3.position.set(0, 0.92, 0);
        joint2.add(joint3);
        ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.5, max: Math.PI * 0.5 });

        const wristServo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.13, 16), matDarkSteel);
        joint3.add(wristServo);

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.2), matGold);
        palm.position.set(0, 0.08, 0);
        palm.castShadow = true;
        joint3.add(palm);

        const palmArc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), matCyanGlow);
        palmArc.rotation.x = Math.PI / 2;
        palmArc.position.set(0, 0.08, 0.1);
        joint3.add(palmArc);

        const clawBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.12), matDarkSteel);
        clawBase.position.set(0, 0.12, 0);
        joint3.add(clawBase);

        const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.09), matChrome);
        clawLeft.position.set(-0.1, 0.23, 0);
        clawLeft.castShadow = true;
        joint3.add(clawLeft);

        const padL = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.07), matRed);
        padL.position.set(-0.08, 0.23, 0.02);
        joint3.add(padL);

        const clawRight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.09), matChrome);
        clawRight.position.set(0.1, 0.23, 0);
        clawRight.castShadow = true;
        joint3.add(clawRight);

        const padR = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.07), matRed);
        padR.position.set(0.08, 0.23, 0.02);
        joint3.add(padR);

        const endEffector = new THREE.Group();
        endEffector.position.set(0, 0.36, 0);
        joint3.add(endEffector);

        // 槽位與核心
        const socketGroup = new THREE.Group();
        socketGroup.position.set(0.85, 0.02, 0.85);
        scene.add(socketGroup);

        const reactorSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.38, 0.16, 24),
            new THREE.MeshStandardMaterial({ color: 0x1c222b, metalness: 0.95, roughness: 0.25 })
        );
        reactorSocket.position.y = 0.08;
        reactorSocket.castShadow = true;
        socketGroup.add(reactorSocket);

        const glowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.016, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        glowRing.rotation.x = Math.PI / 2;
        glowRing.position.y = 0.165;
        socketGroup.add(glowRing);

        const reactorCore = new THREE.Group();
        const coreBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 })
        );
        const coreGlow = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.035, 12, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        coreGlow.rotation.x = Math.PI / 2;

        const coreCaps = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.035, 16),
            new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 1.0, roughness: 0.1 })
        );
        coreCaps.position.y = 0.1;

        reactorCore.add(coreBody);
        reactorCore.add(coreGlow);
        reactorCore.add(coreCaps);
        reactorCore.position.set(-0.85, 0.25, 0.85);
        reactorCore.castShadow = true;
        scene.add(reactorCore);

        return { ikBones, endEffector, clawLeft, clawRight, reactorCore, reactorSocket: socketGroup, coreGlow };
    }
}
