export class ArmBuilder {
    static build(scene) {
        // =========================================================================
        // 1. 程序化微刮痕與粗糙度貼圖 (Zero-Asset Procedural Roughness Map)
        // =========================================================================
        const scratchTexture = (() => {
            const c = document.createElement('canvas');
            c.width = 512;
            c.height = 512;
            const ctx = c.getContext('2d');

            // 灰色底 (基礎粗糙度 0.3)
            ctx.fillStyle = '#4d4d4d';
            ctx.fillRect(0, 0, 512, 512);

            // 繪製 300 條隨機細微工業刮痕與磨損
            for (let i = 0; i < 300; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 + Math.random() * 0.35})`;
                ctx.lineWidth = 1 + Math.random() * 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(
                    x + (Math.random() - 0.5) * 45,
                    y + (Math.random() - 0.5) * 45
                );
                ctx.stroke();
            }

            // 邊緣微氧化噪點 (Micro-stippling)
            for (let i = 0; i < 1500; i++) {
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08})`;
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
            }

            const tex = new THREE.CanvasTexture(c);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(2, 2);
            return tex;
        })();

        // =========================================================================
        // 2. 影院級三點式動態打光系統 (Cinematic Lighting)
        // =========================================================================
        scene.add(new THREE.AmbientLight(0x16222f, 1.8));

        // 主聚光燈 (頂部冷白光)
        const mainSpot = new THREE.SpotLight(0xffffff, 4.5, 16, Math.PI / 3, 0.4, 1.2);
        mainSpot.position.set(2.5, 6.5, 3.5);
        scene.add(mainSpot);

        // 輪廓邊緣光 (冷藍色，勾勒金屬幾何外觀)
        const rimLight = new THREE.DirectionalLight(0x00e5ff, 3.0);
        rimLight.position.set(-5, 4.5, -4);
        scene.add(rimLight);

        // 底部高溫回火補光 (強化暗部金屬光澤)
        const bounceLight = new THREE.DirectionalLight(0xff6600, 1.0);
        bounceLight.position.set(3, -1.5, 2);
        scene.add(bounceLight);

        const labLight = new THREE.PointLight(0x00ffff, 2.5, 9);
        labLight.position.set(0, 2.8, 0);
        scene.add(labLight);

        // =========================================================================
        // 3. 次世代 PBR 金屬材質庫 (帶真實微磨損)
        // =========================================================================
        const matGold = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            metalness: 0.92,
            roughness: 0.22,
            roughnessMap: scratchTexture,
            envMapIntensity: 1.6
        });

        const matRed = new THREE.MeshStandardMaterial({
            color: 0x8a0f0f,
            metalness: 0.85,
            roughness: 0.25,
            roughnessMap: scratchTexture,
            envMapIntensity: 1.3
        });

        const matDarkSteel = new THREE.MeshStandardMaterial({
            color: 0x1a1f26,
            metalness: 0.95,
            roughness: 0.32,
            roughnessMap: scratchTexture
        });

        const matChrome = new THREE.MeshStandardMaterial({
            color: 0xf5f5f5,
            metalness: 1.0,
            roughness: 0.12,
            roughnessMap: scratchTexture
        });

        const matGlowCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const matGlowOrange = new THREE.MeshBasicMaterial({ color: 0xff6600 });

        // =========================================================================
        // 4. 下沉式全息實驗室地台 (Depth & Scale)
        // =========================================================================
        const tableGroup = new THREE.Group();
        scene.add(tableGroup);

        // 底層多角形重裝甲地台
        const baseFloor = new THREE.Mesh(
            new THREE.CylinderGeometry(2.8, 3.1, 0.18, 48),
            matDarkSteel
        );
        baseFloor.position.y = -0.06;
        tableGroup.add(baseFloor);

        // 中層發光能量圈 (外環)
        const energyRing = new THREE.Mesh(
            new THREE.TorusGeometry(2.35, 0.02, 16, 64),
            matGlowCyan
        );
        energyRing.rotation.x = Math.PI / 2;
        energyRing.position.y = 0.035;
        tableGroup.add(energyRing);

        // 下沉式同心圓能量導流槽 (3 組階梯式能量環)
        for (let i = 0; i < 3; i++) {
            const subRing = new THREE.Mesh(
                new THREE.TorusGeometry(0.75 + i * 0.48, 0.012, 8, 48),
                new THREE.MeshBasicMaterial({
                    color: 0x00e5ff,
                    transparent: true,
                    opacity: 0.45 - i * 0.1
                })
            );
            subRing.rotation.x = Math.PI / 2;
            subRing.position.y = 0.045;
            tableGroup.add(subRing);
        }

        // 頂層拉絲工作台面 (下陷設計)
        const topTable = new THREE.Mesh(
            new THREE.CylinderGeometry(2.2, 2.2, 0.08, 48),
            new THREE.MeshStandardMaterial({ color: 0x1d242e, metalness: 0.85, roughness: 0.35 })
        );
        topTable.position.y = 0.04;
        tableGroup.add(topTable);

        // 原創 J.A.R. ROBOTICS 全息地台文字標記 (避免商標侵權)
        const jarLabel = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: (() => {
                    const c = document.createElement('canvas');
                    c.width = 512;
                    c.height = 128;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = 'transparent';
                    ctx.fillRect(0, 0, 512, 128);

                    ctx.font = '800 36px "Segoe UI", -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = 18;
                    ctx.fillStyle = '#00e5ff';
                    ctx.fillText('⚡ J.A.R. ROBOTICS // ARM-01', 256, 64);
                    return new THREE.CanvasTexture(c);
                })(),
                transparent: true,
                depthWrite: false
            })
        );
        jarLabel.position.set(0, 0.1, 1.45);
        jarLabel.scale.set(1.2, 0.3, 1);
        tableGroup.add(jarLabel);

        // =========================================================================
        // 5. 高精度機械臂構建 (帶液壓傳動桿與重裝夾爪)
        // =========================================================================
        const ikBones = [];

        // ===== Base Yaw (基座總成) =====
        const baseGroup = new THREE.Group();
        baseGroup.position.set(0, 0.08, 0);
        scene.add(baseGroup);

        const baseHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 0.24, 32), matRed);
        baseHousing.position.y = 0.12;
        baseGroup.add(baseHousing);

        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 32), matDarkSteel);
        flange.position.y = 0.25;
        baseGroup.add(flange);

        // 關節 0 旋轉軸
        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.27, 0);
        baseGroup.add(joint0);
        ikBones.push({ obj: joint0, axis: 'Y', min: -Math.PI, max: Math.PI });

        // 肩部雙側鉸鏈支架 (雙立柱碳化結構)
        const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.3), matDarkSteel);
        forkL.position.set(-0.24, 0.16, 0);
        joint0.add(forkL);

        const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.3), matDarkSteel);
        forkR.position.set(0.24, 0.16, 0);
        joint0.add(forkR);

        // ===== Joint 1 (Shoulder Pitch) =====
        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.3, 0);
        joint0.add(joint1);
        ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.45, max: Math.PI * 0.45 });

        const shoulderPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.46, 24), matChrome);
        shoulderPivot.rotation.z = Math.PI / 2;
        joint1.add(shoulderPivot);

        // 大臂 (Upper Arm) - 雙骨架金黃裝甲
        const armBoneL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.1, 0.15), matGold);
        armBoneL.position.set(-0.13, 0.55, 0);
        joint1.add(armBoneL);

        const armBoneR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.1, 0.15), matGold);
        armBoneR.position.set(0.13, 0.55, 0);
        joint1.add(armBoneR);

        // 中置金屬液壓伸縮活塞 (Hydraulic Ram)
        const pistonBase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.7, 16), matDarkSteel);
        pistonBase.position.set(0, 0.4, -0.09);
        joint1.add(pistonBase);

        const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.65, 16), matChrome);
        pistonRod.position.set(0, 0.78, -0.09);
        joint1.add(pistonRod);

        // ===== Joint 2 (Elbow Pitch) =====
        const joint2 = new THREE.Group();
        joint2.position.set(0, 1.1, 0);
        joint1.add(joint2);
        ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.75, max: 0.05 });

        const elbowGear = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.38, 24), matDarkSteel);
        elbowGear.rotation.z = Math.PI / 2;
        joint2.add(elbowGear);

        // 小臂 (Forearm) - 八角型裝甲板
        const forearmArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.9, 8), matRed);
        forearmArmor.position.set(0, 0.45, 0);
        joint2.add(forearmArmor);

        // ===== Joint 3 (Wrist Pitch) =====
        const joint3 = new THREE.Group();
        joint3.position.set(0, 0.9, 0);
        joint2.add(joint3);
        ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.5, max: Math.PI * 0.5 });

        const wristServo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.13, 16), matDarkSteel);
        joint3.add(wristServo);

        // 掌心基座與微型量子光暈
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.2), matGold);
        palm.position.set(0, 0.08, 0);
        joint3.add(palm);

        const palmReactor = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), matGlowCyan);
        palmReactor.rotation.x = Math.PI / 2;
        palmReactor.position.set(0, 0.08, 0.1);
        joint3.add(palmReactor);

        // ===== 升級版：重裝工業防滑夾爪總成 (Visual Weight) =====
        const clawBase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.12), matDarkSteel);
        clawBase.position.set(0, 0.12, 0);
        joint3.add(clawBase);

        // 左夾爪（加厚主爪 + 橡膠防滑塊）
        const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.09), matChrome);
        clawLeft.position.set(-0.1, 0.23, 0);
        joint3.add(clawLeft);

        const gripPadL = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.07), matRed);
        gripPadL.position.set(-0.08, 0.23, 0.02);
        joint3.add(gripPadL);

        // 右夾爪（加厚主爪 + 橡膠防滑塊）
        const clawRight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.09), matChrome);
        clawRight.position.set(0.1, 0.23, 0);
        joint3.add(clawRight);

        const gripPadR = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.12, 0.07), matRed);
        gripPadR.position.set(0.08, 0.23, 0.02);
        joint3.add(gripPadR);

        // 末端基準群組
        const endEffector = new THREE.Group();
        endEffector.position.set(0, 0.35, 0);
        joint3.add(endEffector);

        // =========================================================================
        // 6. 量子能量核心與高科技基座槽位
        // =========================================================================
        const socketGroup = new THREE.Group();
        socketGroup.position.set(0.8, 0.08, 0.8);
        scene.add(socketGroup);

        const reactorSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.38, 0.15, 24),
            matDarkSteel
        );
        reactorSocket.position.y = 0.075;
        socketGroup.add(reactorSocket);

        const socketGlowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.016, 8, 32),
            matGlowOrange
        );
        socketGlowRing.rotation.x = Math.PI / 2;
        socketGlowRing.position.y = 0.155;
        socketGroup.add(socketGlowRing);

        // 量子核心總成 (發光圓環 + 晶體外殼)
        const reactorCore = new THREE.Group();
        const coreChamber = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.2, 16),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 })
        );
        const coreGlow = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.035, 12, 32),
            matGlowCyan
        );
        coreGlow.rotation.x = Math.PI / 2;

        const coreCaps = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 16), matChrome);
        coreCaps.position.y = 0.1;

        reactorCore.add(coreChamber);
        reactorCore.add(coreGlow);
        reactorCore.add(coreCaps);
        reactorCore.position.set(-0.8, 0.26, 0.8);
        scene.add(reactorCore);

        return {
            ikBones,
            endEffector,
            clawLeft,
            clawRight,
            reactorCore,
            reactorSocket: socketGroup,
            coreGlow,
            labLight
        };
    }
}
