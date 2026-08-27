import * as THREE from 'three';

export class ArmBuilder {
    static build(scene, mode = 'kid') {
        const isKid = (mode === 'kid');

        // ============================================================
        // 🌟 1. 頂級 PBR 材質調校（金屬感、消光漆面、高光鍍鉻）
        // ============================================================
        const matBodyWhite = new THREE.MeshStandardMaterial({
            color: isKid ? 0xf8fafc : 0x0f172a,
            roughness: 0.25,
            metalness: 0.15,
            envMapIntensity: 1.2
        });

        const matDarkSteel = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.45,
            metalness: 0.85,
            envMapIntensity: 1.0
        });

        const matChrome = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.08,
            metalness: 0.98,
            envMapIntensity: 1.8
        });

        const matGoldAccent = new THREE.MeshStandardMaterial({
            color: isKid ? 0xf59e0b : 0x00e5ff,
            roughness: 0.2,
            metalness: 0.8,
            emissive: isKid ? 0x78350f : 0x004466,
            emissiveIntensity: 0.3
        });

        const matCable = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.65,
            metalness: 0.35
        });

        // ============================================================
        // 🌟 2. 基座系統 (Base & Flange & Brand Laser Engraving)
        // ============================================================
        const baseGroup = new THREE.Group();
        baseGroup.position.set(0, 0.08, 0);

        // 主底座圓盤
        const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.08, 48), matDarkSteel);
        baseDisc.position.y = 0.04;
        baseDisc.receiveShadow = true;
        baseDisc.castShadow = true;
        baseGroup.add(baseDisc);

        // 鍍鉻底座定位法蘭盤
        const baseFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.40, 0.04, 48), matChrome);
        baseFlange.position.y = 0.09;
        baseFlange.castShadow = true;
        baseGroup.add(baseFlange);

        // 底座固定螺栓 (12 顆高精度六角螺栓)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 6), matChrome);
            bolt.position.set(Math.cos(angle) * 0.40, 0.11, Math.sin(angle) * 0.40);
            baseGroup.add(bolt);
        }

        // 🌟【細節 4】：基座正面 J.A.R. 品牌全息雷射標記
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 512;
        labelCanvas.height = 128;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 512, 128);
        ctx.font = 'bold 44px "Segoe UI", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 14;
        ctx.fillText('⚡ J.A.R. ARM-01', 256, 64);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true,
            depthWrite: false
        });
        const labelSprite = new THREE.Sprite(labelMat);
        labelSprite.position.set(0, 0.06, 0.46);
        labelSprite.scale.set(0.55, 0.14, 1);
        baseGroup.add(labelSprite);

        scene.add(baseGroup);

        // ============================================================
        // 🌟 3. Joint 0: 基座 Y 軸迴轉台 (Base Turntable)
        // ============================================================
        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.11, 0);
        baseGroup.add(joint0);

        // 旋轉台主體
        const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.14, 36), matBodyWhite);
        turntable.position.y = 0.07;
        turntable.castShadow = true;
        joint0.add(turntable);

        // 🌟【細節 3】：雙層高光軸承環 (Bearing Rings)
        const bearingRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 12, 36), matChrome);
        bearingRing1.position.y = 0.14;
        bearingRing1.rotation.x = Math.PI / 2;
        joint0.add(bearingRing1);

        const bearingRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 12, 36), matDarkSteel);
        bearingRing2.position.y = 0.145;
        bearingRing2.rotation.x = Math.PI / 2;
        joint0.add(bearingRing2);

        // 肩部雙側支承臂 (Shoulder U-Bracket)
        const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.16), matDarkSteel);
        forkL.position.set(-0.14, 0.22, 0);
        forkL.castShadow = true;
        joint0.add(forkL);

        const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.16), matDarkSteel);
        forkR.position.set(0.14, 0.22, 0);
        forkR.castShadow = true;
        joint0.add(forkR);

        // ============================================================
        // 🌟 4. Joint 1: 肩關節 X 軸俯仰 + 大臂主體 (Shoulder & Upper Arm)
        // ============================================================
        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.32, 0);
        joint0.add(joint1);

        // 肩部轉軸主伺服 (Shoulder Servo Core)
        const shoulderPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.34, 32), matDarkSteel);
        shoulderPivot.rotation.z = Math.PI / 2;
        shoulderPivot.castShadow = true;
        joint1.add(shoulderPivot);

        // 🌟【細節 1】：肩部環形散熱鰭片 (8 組 Heat Sink Fins)
        for (let f = 0; f < 8; f++) {
            const angle = (f / 8) * Math.PI * 2;
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.035), matDarkSteel);
            fin.position.set(Math.cos(angle) * 0.17, Math.sin(angle) * 0.17, 0);
            fin.rotation.z = angle;
            joint1.add(fin);
        }

        // 大臂骨架套管 (Upper Arm Structural Hull)
        const upperArmHull = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.14), matBodyWhite);
        upperArmHull.position.set(0, 0.35, 0);
        upperArmHull.castShadow = true;
        joint1.add(upperArmHull);

        // 裝飾金色銘牌與通風格柵
        const grill = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.15), matGoldAccent);
        grill.position.set(0, 0.35, 0);
        joint1.add(grill);

        // 🌟【細節 4】：大臂側面型號雕刻 (Model Specification Mark)
        const modelCanvas = document.createElement('canvas');
        modelCanvas.width = 256;
        modelCanvas.height = 64;
        const mctx = modelCanvas.getContext('2d');
        mctx.fillStyle = 'rgba(0,0,0,0)';
        mctx.fillRect(0, 0, 256, 64);
        mctx.font = 'bold 22px monospace';
        mctx.textAlign = 'center';
        mctx.textBaseline = 'middle';
        mctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        mctx.fillText('MODEL DUM-E // MK-3', 128, 32);
        const modelTexture = new THREE.CanvasTexture(modelCanvas);
        const modelSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: modelTexture,
            transparent: true,
            depthWrite: false
        }));
        modelSprite.position.set(0.10, 0.40, 0.08);
        modelSprite.scale.set(0.32, 0.08, 1);
        joint1.add(modelSprite);

        // 🌟【細節 2】：大臂雙側高壓動力電纜線束 (Cable Harness)
        const cablePointsLeft = [
            new THREE.Vector3(-0.11, 0.05, 0.05),
            new THREE.Vector3(-0.14, 0.30, 0.08),
            new THREE.Vector3(-0.13, 0.52, 0.06),
            new THREE.Vector3(-0.09, 0.70, 0.02)
        ];
        const cableCurveL = new THREE.CatmullRomCurve3(cablePointsLeft);
        const cableGeoL = new THREE.TubeGeometry(cableCurveL, 16, 0.012, 8, false);
        const cableMeshL = new THREE.Mesh(cableGeoL, matCable);
        cableMeshL.castShadow = true;
        joint1.add(cableMeshL);

        const cablePointsRight = cablePointsLeft.map(p => new THREE.Vector3(-p.x, p.y, p.z));
        const cableCurveR = new THREE.CatmullRomCurve3(cablePointsRight);
        const cableGeoR = new THREE.TubeGeometry(cableCurveR, 16, 0.012, 8, false);
        const cableMeshR = new THREE.Mesh(cableGeoR, matCable);
        cableMeshR.castShadow = true;
        joint1.add(cableMeshR);

        // 伸縮液壓桿 (Telescopic Extension Cylinder)
        const extensionRod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.40, 24), matChrome);
        extensionRod.position.set(0, 0.65, 0);
        extensionRod.castShadow = true;
        joint1.add(extensionRod);

        // ============================================================
        // 🌟 5. Joint 2: 肘關節 X 軸俯仰 + 前臂 (Elbow & Forearm)
        // ============================================================
        const joint2 = new THREE.Group();
        joint2.position.set(0, 0.70, 0);
        joint1.add(joint2);

        // 肘部關節伺服摩打
        const elbowPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.24, 32), matDarkSteel);
        elbowPivot.rotation.z = Math.PI / 2;
        elbowPivot.castShadow = true;
        joint2.add(elbowPivot);

        // 🌟【細節 3】：肘部鍍鉻同軸軸承環
        const elbowBearing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 12, 32), matChrome);
        elbowBearing.position.set(0.125, 0, 0);
        elbowBearing.rotation.y = Math.PI / 2;
        joint2.add(elbowBearing);

        const elbowBearingL = elbowBearing.clone();
        elbowBearingL.position.set(-0.125, 0, 0);
        joint2.add(elbowBearingL);

        // 前臂本體 (Forearm Carbon/Steel Arm)
        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.10), matBodyWhite);
        forearm.position.set(0, 0.26, 0);
        forearm.castShadow = true;
        joint2.add(forearm);

        // 前臂管線槽
        const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 12), matChrome);
        conduit.position.set(0, 0.26, 0.06);
        joint2.add(conduit);

        // ============================================================
        // 🌟 6. Joint 3: 腕部 X 軸微調 (Wrist Pitch)
        // ============================================================
        const joint3 = new THREE.Group();
        joint3.position.set(0, 0.50, 0);
        joint2.add(joint3);

        const wristPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 24), matDarkSteel);
        wristPivot.rotation.z = Math.PI / 2;
        wristPivot.castShadow = true;
        joint3.add(wristPivot);

        // ============================================================
        // 🌟 7. Joint 4: 腕部 Z 軸末端自旋 (Wrist Roll)
        // ============================================================
        const joint4 = new THREE.Group();
        joint4.position.set(0, 0.08, 0);
        joint3.add(joint4);

        const wristRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 24), matChrome);
        wristRoll.castShadow = true;
        joint4.add(wristRoll);

        // ============================================================
        // 🌟 8. 末端夾爪機構 (End Effector Gripper & Pneumatics)
        // ============================================================
        const endEffector = new THREE.Group();
        endEffector.position.set(0, 0.06, 0);
        joint4.add(endEffector);

        // 夾爪基座法蘭
        const clawBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.08), matDarkSteel);
        clawBase.castShadow = true;
        endEffector.add(clawBase);

        // 氣動指爪 Left
        const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.04), matChrome);
        clawLeft.position.set(-0.06, 0.06, 0);
        clawLeft.castShadow = true;
        endEffector.add(clawLeft);

        // 氣動指爪 Right
        const clawRight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.04), matChrome);
        clawRight.position.set(0.06, 0.06, 0);
        clawRight.castShadow = true;
        endEffector.add(clawRight);

        // 指尖橡膠防滑襯墊 (Rubber Gripper Pads)
        const padMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
        const padL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.08, 0.035), padMat);
        padL.position.set(0.014, 0.01, 0);
        clawLeft.add(padL);

        const padR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.08, 0.035), padMat);
        padR.position.set(-0.014, 0.01, 0);
        clawRight.add(padR);

        // 狀態指示燈 LED (Status Optical Indicator)
        const statusLed = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff7700 })
        );
        statusLed.position.set(0, 0.02, 0.045);
        endEffector.add(statusLed);

        // 任務目標卡槽 (Reactor / Strawberry Socket Base)
        const reactorSocket = new THREE.Group();
        reactorSocket.position.set(-0.6, 0.12, 0.6);
        const socketRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.14, 0.02, 16, 32),
            new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.2 })
        );
        socketRing.rotation.x = Math.PI / 2;
        reactorSocket.add(socketRing);
        scene.add(reactorSocket);

        // ============================================================
        // 🌟 9. 運動學鏈構建 (IK Bones Binding)
        // ============================================================
        const ikBones = [
            { obj: joint0, axis: 'Y' },                                        // 基座旋轉
            { obj: joint1, axis: 'X', min: -Math.PI / 2.5, max: Math.PI / 2.2 }, // 肩部俯仰
            { obj: joint2, axis: 'X', min: -Math.PI / 1.8, max: Math.PI / 3.0 }, // 肘部俯仰
            { obj: joint3, axis: 'X', min: -Math.PI / 2,   max: Math.PI / 2 }   // 腕部俯仰
        ];

        return {
            baseGroup,
            joint0,
            joint1,
            joint2,
            joint3,
            joint4,
            extensionRod,
            endEffector,
            clawLeft,
            clawRight,
            statusLed,
            reactorSocket,
            ikBones
        };
    }
}
