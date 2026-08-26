import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

export class CCDIKSolver {
    static CONFIG = {
        maxIterations: 5,
        damping: 0.75,
        velocityLimit: 3.2,          // rad/s 最大角速度
        accelerationLimit: 9.5,      // rad/s² 最大角加速度 (Jerk/Inertia 控制)
        singularityThreshold: 0.015  // DLS 防抖閾值
    };

    static solve(bones, endEffector, targetPosition, dt = 0.016) {
        if (!bones || bones.length === 0 || !endEffector || !targetPosition) return;

        const config = CCDIKSolver.CONFIG;
        const safeDt = Math.max(0.001, Math.min(0.05, dt));
        const maxDeltaV = config.velocityLimit * safeDt;
        const maxDeltaA = config.accelerationLimit * safeDt * safeDt;

        for (let iter = 0; iter < config.maxIterations; iter++) {
            for (let i = bones.length - 1; i >= 0; i--) {
                const bone = bones[i];
                const boneObj = bone.obj;

                // 1. 取得空間坐標與向量 (Zero-GC 靜態緩存)
                endEffector.getWorldPosition(POOL.v1);
                boneObj.getWorldPosition(POOL.v2);

                POOL.toEnd.subVectors(POOL.v1, POOL.v2);
                POOL.toTarget.subVectors(targetPosition, POOL.v2);

                const lenEnd = POOL.toEnd.length();
                const lenTarget = POOL.toTarget.length();

                if (lenEnd < 0.001 || lenTarget < 0.001) continue;

                POOL.toEnd.multiplyScalar(1.0 / lenEnd);
                POOL.toTarget.multiplyScalar(1.0 / lenTarget);

                // 2. 計算旋轉軸與夾角
                POOL.cross.crossVectors(POOL.toEnd, POOL.toTarget);
                const crossLen = POOL.cross.length();
                if (crossLen < 0.0005) continue;

                const dot = Math.max(-1.0, Math.min(1.0, POOL.toEnd.dot(POOL.toTarget)));
                const angle = Math.acos(dot);

                // 3. 阻尼最小二乘 (DLS) 奇異點防護
                const dlsFactor = 1.0 / (crossLen + config.singularityThreshold);
                let targetDelta = angle * config.damping * Math.min(1.0, dlsFactor);

                // 4. 軸向映射與肩部翻轉引導 (Shoulder Flip & Routing)
                if (bone.axis === 'Y') {
                    const curAngle = Math.atan2(POOL.toEnd.x, POOL.toEnd.z);
                    const targetAngle = Math.atan2(POOL.toTarget.x, POOL.toTarget.z);
                    let rawDelta = targetAngle - curAngle;

                    while (rawDelta > Math.PI) rawDelta -= Math.PI * 2;
                    while (rawDelta < -Math.PI) rawDelta += Math.PI * 2;

                    targetDelta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta) * config.damping, maxDeltaV);

                    // 5. 加速度濾波 (Jerk Limiting / Inertia Smoothing)
                    const lastDelta = bone._lastDelta || 0;
                    const deltaDiff = targetDelta - lastDelta;
                    const clampedDiff = Math.max(-maxDeltaA, Math.min(maxDeltaA, deltaDiff));
                    let finalDelta = lastDelta + clampedDiff;
                    bone._lastDelta = finalDelta;

                    let newAngle = boneObj.rotation.y + finalDelta;

                    // 6. 柔性邊界減速 (Soft Clamping)
                    if (bone.min !== undefined && bone.max !== undefined) {
                        const range = bone.max - bone.min;
                        const margin = range * 0.12;
                        const lowerSoft = bone.min + margin;
                        const upperSoft = bone.max - margin;

                        if (newAngle < lowerSoft && finalDelta < 0) {
                            const factor = Math.max(0.05, (newAngle - bone.min) / margin);
                            newAngle = boneObj.rotation.y + finalDelta * factor;
                        } else if (newAngle > upperSoft && finalDelta > 0) {
                            const factor = Math.max(0.05, (bone.max - newAngle) / margin);
                            newAngle = boneObj.rotation.y + finalDelta * factor;
                        }
                        newAngle = Math.max(bone.min, Math.min(bone.max, newAngle));
                    }

                    boneObj.rotation.y = newAngle;
                } else {
                    // 關節俯仰 (Pitch 軸)
                    const parentMatrix = boneObj.parent ? boneObj.parent.matrixWorld : boneObj.matrixWorld;
                    POOL.m1.copy(parentMatrix).invert();
                    const localCross = POOL.cross.transformDirection(POOL.m1);

                    const sign = localCross.x >= 0 ? 1 : -1;
                    targetDelta = Math.min(targetDelta, maxDeltaV) * sign;

                    // 加速度濾波
                    const lastDelta = bone._lastDelta || 0;
                    const deltaDiff = targetDelta - lastDelta;
                    const clampedDiff = Math.max(-maxDeltaA, Math.min(maxDeltaA, deltaDiff));
                    let finalDelta = lastDelta + clampedDiff;
                    bone._lastDelta = finalDelta;

                    let newAngle = boneObj.rotation.x + finalDelta;

                    // 柔性邊界減速
                    if (bone.min !== undefined && bone.max !== undefined) {
                        const range = bone.max - bone.min;
                        const margin = range * 0.12;
                        const lowerSoft = bone.min + margin;
                        const upperSoft = bone.max - margin;

                        if (newAngle < lowerSoft && finalDelta < 0) {
                            const factor = Math.max(0.05, (newAngle - bone.min) / margin);
                            newAngle = boneObj.rotation.x + finalDelta * factor;
                        } else if (newAngle > upperSoft && finalDelta > 0) {
                            const factor = Math.max(0.05, (bone.max - newAngle) / margin);
                            newAngle = boneObj.rotation.x + finalDelta * factor;
                        }
                        newAngle = Math.max(bone.min, Math.min(bone.max, newAngle));
                    }

                    boneObj.rotation.x = newAngle;
                }

                boneObj.updateMatrixWorld(true);
            }
        }
    }
}
