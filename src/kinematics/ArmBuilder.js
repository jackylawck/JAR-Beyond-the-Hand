export class ArmBuilder {
    static build(scene, mode = 'kid') {
        const scratchTex = (() => {
            const c = document.createElement('canvas');
            c.width = 512;
            c.height = 512;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#666666';
            ctx.fillRect(0, 0, 512, 512);

            for (let i = 0; i < 400; i++) {
                ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.15})`;
                ctx.lineWidth = 0.8 + Math.random() * 1.5;
                ctx.beginPath();
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 45, y + (Math.random() - 0.5) * 45);
                ctx.stroke();
            }
            const t = new THREE.CanvasTexture(c);
            t.wrapS = THREE.RepeatWrapping;
            t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(2, 2);
            return t;
        })();

        let theme = {
            armor: 0xf1f5f9,
            secondary: 0x1e293b,
            accent: 0xe05600,
            hose: 0xdc2626,
            led: 0x00e5ff
        };

        if (mode === 'kid') {
            theme = {
                armor: 0xffffff,
                secondary: 0x334155,
                accent: 0xf97316,
                hose: 0x16a34a,
                led: 0x4ade80
            };
        } else if (mode === 'advanced') {
            theme = {
                armor: 0x334155,
                secondary: 0x0f172a,
                accent: 0xeab308,
                hose: 0xef4444,
                led: 0x38bdf8
            };
        } else {
            theme = {
                armor: 0x0f172a,
                secondary: 0x1e293b,
                accent: 0x00e5ff,
                hose: 0x6366f1,
                led: 0x00ffff
            };
        }

        const matArmor = new THREE.MeshStandardMaterial({
            color: theme.armor,
            metalness: mode === 'research' ? 0.95 : 0.82,
            roughness: mode === 'research' ? 0.18 : 0.28,
            roughnessMap: scratchTex,
            envMapIntensity: 1.4
        });

        const matSecondary = new THREE.MeshStandardMaterial({
            color: theme.secondary,
            metalness: 0.9,
            roughness: 0.25,
            roughnessMap: scratchTex,
            envMapIntensity: 1.3
        });

        const matDarkSteel = new THREE.MeshStandardMaterial({
            color: 0x0b0f19,
            metalness: 0.98,
            roughness: 0.35,
            roughnessMap: scratchTex,
            envMapIntensity: 1.2
        });

        const matChrome = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            metalness: 1.0,
            roughness: 0.06,
            envMapIntensity: 2.2
        });

        // 🌟 微調 1：強化夾爪 PBR 陽極氧化金屬質感 (高金屬度 + 微粗糙拉絲)
        const matAccent = new THREE.MeshStandardMaterial({
            color: theme.accent,
            metalness: 0.88,
            roughness: 0.22,
            roughnessMap: scratchTex,
            envMapIntensity: 1.8
        });

        const matHose = new THREE.MeshStandardMaterial({
            color: theme.hose,
            roughness: 0.6,
            metalness: 0.2
        });

        const matRubberGrip = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.95,
            metalness: 0.05
        });

        const matLed = new THREE.MeshBasicMaterial({ color: theme.led });
        const matStatusLed = new THREE.MeshBasicMaterial({ color: 0xff7700 });

        const ikBones = [];

        // 1. 基座
        const baseGroup = new THREE.Group();
        baseGroup.position.set(0, 0.12, 0);
        scene.add(baseGroup);

        const baseArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.72, 0.22, 32), matSecondary);
        baseArmor.position.y = 0.11;
        baseArmor.castShadow = true;
        baseArmor.receiveShadow = true;
        baseGroup.add(baseArmor);

        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 32), matDarkSteel);
        flange.position.y = 0.24;
        baseGroup.add(flange);

        for (let i = 0; i < 8; i++) {
            const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), matChrome);
            const angle = (i / 8) * Math.PI * 2;
            bolt.position.set(Math.cos(angle) * 0.44, 0.26, Math.sin(angle) * 0.44);
            baseGroup.add(bolt);
        }

        // 2. Joint 0 (Yaw)
        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.26, 0);
        baseGroup.add(joint0);
        ikBones.push({ obj: joint0, axis: 'Y', min: -Math.PI, max: Math.PI });

        const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.34), matDarkSteel);
        forkL.position.set(-0.24, 0.2, 0);
        forkL.castShadow = true;
        joint0.add(forkL);

        const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.34), matDarkSteel);
        forkR.position.set(0.24, 0.2, 0);
        forkR.castShadow = true;
        joint0.add(forkR);

        for (let f = 0; f < 4; f++) {
            const finL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.26), matChrome);
            finL.position.set(-0.31, 0.12 + f * 0.06, 0);
            joint0.add(finL);

            const finR = finL.clone();
            finR.position.x = 0.31;
            joint0.add(finR);
        }

        // 3. Joint 1 (Shoulder)
        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.34, 0);
        joint0.add(joint1);
        ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.5, max: Math.PI * 0.55 });

        const shoulderPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.52, 24), matChrome);
        shoulderPivot.rotation.z = Math.PI / 2;
        joint1.add(shoulderPivot);

        const boomOuterL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.18), matArmor);
        boomOuterL.position.set(-0.14, 0.58, 0);
        boomOuterL.castShadow = true;
        joint1.add(boomOuterL);

        const boomOuterR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.18), matArmor);
        boomOuterR.position.set(0.14, 0.58, 0);
        boomOuterR.castShadow = true;
        joint1.add(boomOuterR);

        const ledStripL = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.03), matLed);
        ledStripL.position.set(-0.19, 0.58, 0.06);
        joint1.add(ledStripL);

        const ledStripR = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.9, 0.03), matLed);
        ledStripR.position.set(0.19, 0.58, 0.06);
        joint1.add(ledStripR);

        const pistonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.75, 16), matDarkSteel);
        pistonBase.position.set(0, 0.42, -0.11);
        pistonBase.castShadow = true;
        joint1.add(pistonBase);

        const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.7, 16), matChrome);
        pistonRod.position.set(0, 0.78, -0.11);
        joint1.add(pistonRod);

        const extensionRod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 16), matChrome);
        extensionRod.position.set(0, 0.65, 0);
        joint1.add(extensionRod);

        // 4. Joint 2 (Elbow)
        const joint2 = new THREE.Group();
        joint2.position.set(0, 1.05, 0);
        joint1.add(joint2);
        ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.8, max: 0.15 });

        const driveGear = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.38, 24), matDarkSteel);
        driveGear.rotation.z = Math.PI / 2;
        driveGear.castShadow = true;
        joint2.add(driveGear);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.85, 8), matSecondary);
        forearm.position.set(0, 0.42, 0);
        forearm.castShadow = true;
        joint2.add(forearm);

        const hoseCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.14, 0.05, 0.08),
            new THREE.Vector3(0.18, 0.42, 0.14),
            new THREE.Vector3(0.12, 0.8, 0.06)
        ]);
        const hoseGeo = new THREE.TubeGeometry(hoseCurve, 16, 0.018, 8, false);
        const hoseMesh = new THREE.Mesh(hoseGeo, matHose);
        joint2.add(hoseMesh);

        // 5. Joint 3 (Wrist & Claws)
        const joint3 = new THREE.Group();
        joint3.position.set(0, 0.85, 0);
        joint2.add(joint3);
        ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.65, max: Math.PI * 0.65 });

        const wristHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), matDarkSteel);
        joint3.add(wristHousing);

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.18), matArmor);
        palm.position.set(0, 0.07, 0);
        palm.castShadow = true;
        joint3.add(palm);

        const statusLed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), matStatusLed);
        statusLed.rotation.x = Math.PI / 2;
        statusLed.position.set(0, 0.07, 0.095);
        joint3.add(statusLed);

        const clawLeft = new THREE.Group();
        const clawBodyL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.1), matAccent);
        clawBodyL.position.set(-0.09, 0.18, 0);
        clawBodyL.castShadow = true;
        clawLeft.add(clawBodyL);

        const rubberPadL = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.08), matRubberGrip);
        rubberPadL.position.set(-0.066, 0.18, 0);
        clawLeft.add(rubberPadL);
        joint3.add(clawLeft);

        const clawRight = new THREE.Group();
        const clawBodyR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.1), matAccent);
        clawBodyR.position.set(0.09, 0.18, 0);
        clawBodyR.castShadow = true;
        clawRight.add(clawBodyR);

        const rubberPadR = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.08), matRubberGrip);
        rubberPadR.position.set(0.066, 0.18, 0);
        clawRight.add(rubberPadR);
        joint3.add(clawRight);

        const endEffector = new THREE.Group();
        endEffector.position.set(0, 0.3, 0);
        joint3.add(endEffector);

        // 6. 基座槽位
        const socketGroup = new THREE.Group();
        socketGroup.position.set(0.9, 0.12, 0.9);
        scene.add(socketGroup);

        const reactorSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.36, 0.14, 24),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 })
        );
        reactorSocket.position.y = 0.07;
        reactorSocket.castShadow = true;
        socketGroup.add(reactorSocket);

        const socketGlowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.24, 0.018, 8, 32),
            new THREE.MeshBasicMaterial({ color: theme.accent })
        );
        socketGlowRing.rotation.x = Math.PI / 2;
        socketGlowRing.position.y = 0.145;
        socketGroup.add(socketGlowRing);

        // 7. 能量核心組裝
        const coreGroup = new THREE.Group();
        coreGroup.position.set(-0.85, 0.25, 0.85);
        scene.add(coreGroup);

        const coreBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16),
            new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.1 })
        );
        coreBody.castShadow = true;
        coreGroup.add(coreBody);

        const coreGlowMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.1, 0.025, 12, 32),
            new THREE.MeshBasicMaterial({ color: theme.led })
        );
        coreGlowMesh.rotation.x = Math.PI / 2;
        coreGroup.add(coreGlowMesh);

        // 🌟 微調 2：48 顆雙層立體交叉粒子軌道 (雙向環繞自旋)
        const pCountInner = 24;
        const pGeoInner = new THREE.BufferGeometry();
        const pPosInner = new Float32Array(pCountInner * 3);
        for (let i = 0; i < pCountInner; i++) {
            const th = (i / pCountInner) * Math.PI * 2;
            pPosInner[i * 3] = Math.cos(th) * 0.18;
            pPosInner[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
            pPosInner[i * 3 + 2] = Math.sin(th) * 0.18;
        }
        pGeoInner.setAttribute('position', new THREE.BufferAttribute(pPosInner, 3));
        const pMatInner = new THREE.PointsMaterial({
            color: theme.led,
            size: 0.024,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const coreParticlesInner = new THREE.Points(pGeoInner, pMatInner);
        coreGroup.add(coreParticlesInner);

        const pCountOuter = 24;
        const pGeoOuter = new THREE.BufferGeometry();
        const pPosOuter = new Float32Array(pCountOuter * 3);
        for (let i = 0; i < pCountOuter; i++) {
            const th = (i / pCountOuter) * Math.PI * 2;
            pPosOuter[i * 3] = Math.cos(th) * 0.24;
            pPosOuter[i * 3 + 1] = Math.sin(th) * 0.08;
            pPosOuter[i * 3 + 2] = Math.sin(th) * 0.24;
        }
        pGeoOuter.setAttribute('position', new THREE.BufferAttribute(pPosOuter, 3));
        const pMatOuter = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.018,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending
        });
        const coreParticlesOuter = new THREE.Points(pGeoOuter, pMatOuter);
        coreGroup.add(coreParticlesOuter);

        return {
            ikBones,
            endEffector,
            clawLeft,
            clawRight,
            reactorSocket: socketGroup,
            coreGroup,
            coreGlowMesh,
            coreParticlesInner,
            coreParticlesOuter,
            extensionRod,
            pistonRod,
            joint2,
            statusLed
        };
    }
}
