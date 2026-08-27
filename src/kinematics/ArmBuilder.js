import * as THREE from 'three';

export class ArmBuilder {
    static build(scene, mode = 'kid') {
        // 1. 程序化微刮痕貼圖
        const scratchTex = (() => {
            const c = document.createElement('canvas');
            c.width = 512; c.height = 512;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#666666';
            ctx.fillRect(0, 0, 512, 512);
            for (let i = 0; i < 300; i++) {
                ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const x = Math.random() * 512, y = Math.random() * 512;
                ctx.moveTo(x, y);
                ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
                ctx.stroke();
            }
            const t = new THREE.CanvasTexture(c);
            t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(2, 2);
            return t;
        })();

        // 2. 主題配色
        let theme = { armor: 0xf8fafc, secondary: 0x1e293b, accent: 0x00e5ff, hose: 0x38bdf8, led: 0x00e5ff };
        if (mode === 'kid') theme = { armor: 0xffffff, secondary: 0x334155, accent: 0xf97316, hose: 0x16a34a, led: 0x4ade80 };
        else if (mode === 'advanced') theme = { armor: 0x334155, secondary: 0x0f172a, accent: 0xeab308, hose: 0xef4444, led: 0x38bdf8 };

        // 3. PBR 材質庫
        const matArmor = new THREE.MeshStandardMaterial({ color: theme.armor, metalness: 0.8, roughness: 0.25, roughnessMap: scratchTex, envMapIntensity: 1.5 });
        const matSecondary = new THREE.MeshStandardMaterial({ color: theme.secondary, metalness: 0.9, roughness: 0.3, roughnessMap: scratchTex, envMapIntensity: 1.2 });
        const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x0b0f19, metalness: 0.98, roughness: 0.35, roughnessMap: scratchTex });
        const matChrome = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.08, envMapIntensity: 2.0 });
        const matAccent = new THREE.MeshStandardMaterial({ color: theme.accent, metalness: 0.85, roughness: 0.2 });
        const matHose = new THREE.MeshStandardMaterial({ color: theme.hose, roughness: 0.6, metalness: 0.2 });
        const matRubberGrip = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
        const matStatusLed = new THREE.MeshBasicMaterial({ color: 0xff7700 });

        const ikBones = [];

        // -------------------------------------------------------------
        // 🌟 基座 (Base Group)
        // -------------------------------------------------------------
        const baseGroup = new THREE.Group();
        baseGroup.position.set(0, 0.08, 0);
        scene.add(baseGroup);

        const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.64, 0.16, 36), matSecondary);
        baseDisc.position.y = 0.08;
        baseDisc.castShadow = true;
        baseDisc.receiveShadow = true;
        baseGroup.add(baseDisc);

        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 36), matDarkSteel);
        flange.position.y = 0.18;
        baseGroup.add(flange);

        // -------------------------------------------------------------
        // 🌟 Joint 0: 基座 Y 軸迴轉台 (Turntable)
        // -------------------------------------------------------------
        const joint0 = new THREE.Group();
        joint0.position.set(0, 0.20, 0);
        baseGroup.add(joint0);
        ikBones.push({ obj: joint0, axis: 'Y' });

        const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.16, 32), matDarkSteel);
        turntable.position.y = 0.08;
        turntable.castShadow = true;
        joint0.add(turntable);

        const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.36, 0.26), matDarkSteel);
        forkL.position.set(-0.20, 0.22, 0);
        forkL.castShadow = true;
        joint0.add(forkL);

        const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.36, 0.26), matDarkSteel);
        forkR.position.set(0.20, 0.22, 0);
        forkR.castShadow = true;
        joint0.add(forkR);

        // -------------------------------------------------------------
        // 🌟 Joint 1: 肩關節 (大臂長度最佳化為 0.65m，大幅增加近身折疊性)
        // -------------------------------------------------------------
        const joint1 = new THREE.Group();
        joint1.position.set(0, 0.32, 0);
        joint0.add(joint1);
        // 肩部全向俯仰角度範圍 (-75° ~ +85°)
        ikBones.push({ obj: joint1, axis: 'X', min: -Math.PI * 0.42, max: Math.PI * 0.48 });

        const shoulderPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.44, 24), matChrome);
        shoulderPivot.rotation.z = Math.PI / 2;
        shoulderPivot.castShadow = true;
        joint1.add(shoulderPivot);

        const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.16), matArmor);
        upperArm.position.set(0, 0.325, 0);
        upperArm.castShadow = true;
        joint1.add(upperArm);

        // 伸縮導軌
        const extensionRod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 16), matChrome);
        extensionRod.position.set(0, 0.35, 0);
        joint1.add(extensionRod);

        // -------------------------------------------------------------
        // 🌟 Joint 2: 肘關節 (前臂長度最佳化為 0.55m，可大幅向後/向前收折)
        // -------------------------------------------------------------
        const joint2 = new THREE.Group();
        joint2.position.set(0, 0.65, 0);
        joint1.add(joint2);
        // 肘部大範圍折疊角度 (-140° ~ +45°)，徹底解決埋身夾唔到
        ikBones.push({ obj: joint2, axis: 'X', min: -Math.PI * 0.80, max: Math.PI * 0.25 });

        const elbowPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.32, 24), matDarkSteel);
        elbowPivot.rotation.z = Math.PI / 2;
        elbowPivot.castShadow = true;
        joint2.add(elbowPivot);

        const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.55, 0.12), matSecondary);
        forearm.position.set(0, 0.275, 0);
        forearm.castShadow = true;
        joint2.add(forearm);

        // -------------------------------------------------------------
        // 🌟 Joint 3: 腕部關節 (垂直朝下下壓補償)
        // -------------------------------------------------------------
        const joint3 = new THREE.Group();
        joint3.position.set(0, 0.55, 0);
        joint2.add(joint3);
        ikBones.push({ obj: joint3, axis: 'X', min: -Math.PI * 0.7, max: Math.PI * 0.7 });

        const wristPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.20, 20), matChrome);
        wristPivot.rotation.z = Math.PI / 2;
        wristPivot.castShadow = true;
        joint3.add(wristPivot);

        // -------------------------------------------------------------
        // 🌟 垂直朝下的末端夾爪機構 (Top-Down Gripper System)
        // -------------------------------------------------------------
        const gripperHead = new THREE.Group();
        gripperHead.position.set(0, 0.10, 0);
        // 🌟 關鍵：夾爪法蘭盤橫向展開，指尖朝向正下方 (-Y)
        joint3.add(gripperHead);

        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.10), matDarkSteel);
        palm.castShadow = true;
        gripperHead.add(palm);

        // 狀態指示燈
        const statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), matStatusLed);
        statusLed.position.set(0, 0.03, 0.05);
        gripperHead.add(statusLed);

        // 氣動手指 Left (垂直朝下)
        const clawLeft = new THREE.Group();
        clawLeft.position.set(-0.08, -0.02, 0);
        const clawBodyL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.06), matAccent);
        clawBodyL.position.y = -0.07;
        clawBodyL.castShadow = true;
        clawLeft.add(clawBodyL);
        const rubberL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.10, 0.05), matRubberGrip);
        rubberL.position.set(0.015, -0.07, 0);
        clawLeft.add(rubberL);
        gripperHead.add(clawLeft);

        // 氣動手指 Right (垂直朝下)
        const clawRight = new THREE.Group();
        clawRight.position.set(0.08, -0.02, 0);
        const clawBodyR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.06), matAccent);
        clawBodyR.position.y = -0.07;
        clawBodyR.castShadow = true;
        clawRight.add(clawBodyR);
        const rubberR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.10, 0.05), matRubberGrip);
        rubberR.position.set(-0.015, -0.07, 0);
        clawRight.add(rubberR);
        gripperHead.add(clawRight);

        // 🌟 IK 求解終點：設於兩指夾具中心點下方
        const endEffector = new THREE.Group();
        endEffector.position.set(0, -0.15, 0);
        gripperHead.add(endEffector);

        // -------------------------------------------------------------
        // 🌟 任務目標卡槽基座
        // -------------------------------------------------------------
        const socketGroup = new THREE.Group();
        socketGroup.position.set(0.8, 0.08, 0.8);
        scene.add(socketGroup);

        const reactorSocket = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.28, 0.10, 24),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.3 })
        );
        reactorSocket.position.y = 0.05;
        reactorSocket.castShadow = true;
        socketGroup.add(reactorSocket);

        const glowRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.18, 0.014, 8, 32),
            new THREE.MeshBasicMaterial({ color: theme.accent })
        );
        glowRing.rotation.x = Math.PI / 2;
        glowRing.position.y = 0.105;
        socketGroup.add(glowRing);

        return {
            ikBones,
            endEffector,
            clawLeft,
            clawRight,
            reactorSocket: socketGroup,
            extensionRod,
            joint2,
            statusLed
        };
    }
}
