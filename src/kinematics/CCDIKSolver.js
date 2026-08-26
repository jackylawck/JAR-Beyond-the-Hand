import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

export class CCDIKSolver {
    /**
     * 3A 級平滑阻尼 CCD-IK 解算器 (抗奇異點 + 最大角速度限幅)
     */
    static solve(ikBones, endEffector, targetPos, dt) {
        if (!ikBones || !endEffector || !targetPos) return;

        const maxIterations = 6;
        const thresholdSq = 0.0001; // 1cm 精度
        const safeDt = Math.max(0.001, Math.min(0.05, dt));

        // 🌟 核心防發癲：限制每幀最大旋轉角速度 (Rad/s)
        const maxAngularSpeed = 4.5; // rad/s
        const maxStepAngle = maxAngularSpeed * safeDt;

        for (let iter = 0; iter < maxIterations; iter++) {
            endEffector.getWorldPosition(POOL.endPos);
            if (POOL.endPos.distanceToSquared(targetPos) < thresholdSq) break;

            for (let i = ikBones.length - 1; i >= 0; i--) {
                const bone = ikBones[i];
                const obj = bone.obj;
                const axis = bone.axis;

                obj.getWorldPosition(POOL.bonePos);
                endEffector.getWorldPosition(POOL.endPos);

                POOL.v1.subVectors(POOL.endPos, POOL.bonePos);
                POOL.v2.subVectors(targetPos, POOL.bonePos);

                // 投影到對應旋轉平面
                let deltaAngle = 0;

                if (axis === 'Y') {
                    const currentAngle = Math.atan2(POOL.v1.x, POOL.v1.z);
                    const targetAngle = Math.atan2(POOL.v2.x, POOL.v2.z);
                    deltaAngle = targetAngle - currentAngle;

                    // 正規化到 [-PI, PI]
                    while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                    while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

                    // 阻尼限幅
                    deltaAngle = Math.max(-maxStepAngle, Math.min(maxStepAngle, deltaAngle * 0.65));
                    obj.rotation.y += deltaAngle;

                } else if (axis === 'X') {
                    // 水平距離與垂直高度角度
                    const len1 = Math.hypot(POOL.v1.x, POOL.v1.z);
                    const len2 = Math.hypot(POOL.v2.x, POOL.v2.z);
                    const curA = Math.atan2(POOL.v1.y, len1);
                    const tarA = Math.atan2(POOL.v2.y, len2);
                    deltaAngle = tarA - curA;

                    while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                    while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

                    deltaAngle = Math.max(-maxStepAngle, Math.min(maxStepAngle, deltaAngle * 0.65));
                    obj.rotation.x += deltaAngle;

                    // 軟關節限制 (防止關節反折翻轉)
                    if (bone.min !== undefined && bone.max !== undefined) {
                        obj.rotation.x = Math.max(bone.min, Math.min(bone.max, obj.rotation.x));
                    }
                }

                obj.updateMatrixWorld(true);
            }
        }
    }
}
