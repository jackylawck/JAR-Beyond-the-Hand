import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

export class CCDIKSolver {
    static CONFIG = {
        maxIterations: 6,
        damping: 0.75,
        velocityLimit: 4.5,          // rad/s 最大角速度限幅
        singularityThreshold: 0.015  // DLS 奇異點平滑因子
    };

    static solve(ikBones, endEffector, targetPos, dt = 0.016, config = {}) {
        if (!ikBones || !endEffector || !targetPos) return;

        const cfg = { ...CCDIKSolver.CONFIG, ...config };
        const safeDt = Math.max(0.001, Math.min(0.04, dt));
        const maxStepAngle = cfg.velocityLimit * safeDt;

        for (let iter = 0; iter < cfg.maxIterations; iter++) {
            endEffector.getWorldPosition(POOL.v1);
            if (POOL.v1.distanceToSquared(targetPos) < 0.0001) break;

            for (let i = ikBones.length - 1; i >= 0; i--) {
                const bone = ikBones[i];
                const obj = bone.obj;
                const axis = bone.axis;

                obj.getWorldPosition(POOL.v2);
                endEffector.getWorldPosition(POOL.v1);

                POOL.toEnd.subVectors(POOL.v1, POOL.v2);
                POOL.toTarget.subVectors(targetPos, POOL.v2);

                const lenEnd = POOL.toEnd.length();
                const lenTarget = POOL.toTarget.length();
                if (lenEnd < 0.001 || lenTarget < 0.001) continue;

                POOL.toEnd.multiplyScalar(1.0 / lenEnd);
                POOL.toTarget.multiplyScalar(1.0 / lenTarget);

                // 奇異點檢測 + 向量積
                POOL.cross.crossVectors(POOL.toEnd, POOL.toTarget);
                const crossLen = POOL.cross.length();
                if (crossLen < 0.0005) continue;

                const dot = Math.max(-1, Math.min(1, POOL.toEnd.dot(POOL.toTarget)));
                const angle = Math.acos(dot);

                // 🌟 DLS (Damped Least Squares) 阻尼係數：防伸直時暴衝
                const dlsFactor = 1.0 / (crossLen + cfg.singularityThreshold);
                let delta = angle * cfg.damping * Math.min(1.0, dlsFactor);
                delta = Math.max(-maxStepAngle, Math.min(maxStepAngle, delta));

                if (axis === 'Y') {
                    const curAngle = Math.atan2(POOL.toEnd.x, POOL.toEnd.z);
                    const targetAngle = Math.atan2(POOL.toTarget.x, POOL.toTarget.z);
                    let rawDelta = targetAngle - curAngle;

                    while (rawDelta > Math.PI) rawDelta -= Math.PI * 2;
                    while (rawDelta < -Math.PI) rawDelta += Math.PI * 2;

                    delta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta) * cfg.damping, maxStepAngle);
                    let newAngle = obj.rotation.y + delta;

                    // 🌟 Y 軸基座軟限位保護 (防電纜過度絞合)
                    if (bone.min !== undefined && bone.max !== undefined) {
                        newAngle = Math.max(bone.min, Math.min(bone.max, newAngle));
                    }
                    obj.rotation.y = newAngle;

                } else if (axis === 'X') {
                    // 將旋轉軸投影至局部父級坐標系
                    const parentMatrix = obj.parent ? obj.parent.matrixWorld : obj.matrixWorld;
                    POOL.m1.copy(parentMatrix).invert();
                    const localCross = POOL.cross.transformDirection(POOL.m1);
                    const sign = localCross.x >= 0 ? 1 : -1;

                    delta = Math.min(delta, maxStepAngle) * sign;
                    let newAngle = obj.rotation.x + delta;

                    // 俯仰軟限位保護 (防關節反折穿模)
                    if (bone.min !== undefined && bone.max !== undefined) {
                        newAngle = Math.max(bone.min, Math.min(bone.max, newAngle));
                    }
                    obj.rotation.x = newAngle;
                }

                obj.updateMatrixWorld(true);
            }
        }
    }
}
