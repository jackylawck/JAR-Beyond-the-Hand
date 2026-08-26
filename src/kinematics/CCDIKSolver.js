import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

export class CCDIKSolver {
    static solve(bones, endEffector, targetPosition, iterations = 4, damping = 0.8) {
        if (!bones || bones.length === 0 || !endEffector || !targetPosition) return;

        for (let iter = 0; iter < iterations; iter++) {
            for (let i = bones.length - 1; i >= 0; i--) {
                const bone = bones[i];
                const boneObj = bone.obj;

                // 1. 取得末端效應器、目標與當前關節的世界坐標
                endEffector.getWorldPosition(POOL.v1);
                const targetPos = targetPosition;
                boneObj.getWorldPosition(POOL.v2);

                // 2. 計算從當前關節指向「末端」與「目標」的方向向量
                POOL.v3.subVectors(POOL.v1, POOL.v2).normalize(); // 關節 -> 末端
                POOL.forward.subVectors(targetPos, POOL.v2).normalize(); // 關節 -> 目標

                if (bone.axis === 'Y') {
                    // 基座迴轉 (Yaw 軸)
                    const curAngle = Math.atan2(POOL.v3.x, POOL.v3.z);
                    const targetAngle = Math.atan2(POOL.forward.x, POOL.forward.z);
                    let delta = targetAngle - curAngle;

                    // 正規化角度差至 [-PI, PI]
                    while (delta > Math.PI) delta -= Math.PI * 2;
                    while (delta < -Math.PI) delta += Math.PI * 2;

                    boneObj.rotation.y += delta * damping;

                    if (bone.min !== undefined && bone.max !== undefined) {
                        boneObj.rotation.y = Math.max(bone.min, Math.min(bone.max, boneObj.rotation.y));
                    }
                } else if (bone.axis === 'X') {
                    // 關節俯仰 (Pitch 軸)
                    // 將世界坐標向量轉換至當前關節父節點的局部空間
                    const invMatrix = POOL.m1.copy(boneObj.parent ? boneObj.parent.matrixWorld : boneObj.matrixWorld).invert();
                    
                    const localEnd = POOL.v3.transformDirection(invMatrix);
                    const localTarget = POOL.forward.transformDirection(invMatrix);

                    const curAngle = Math.atan2(localEnd.y, localEnd.z);
                    const targetAngle = Math.atan2(localTarget.y, localTarget.z);
                    let delta = targetAngle - curAngle;

                    while (delta > Math.PI) delta -= Math.PI * 2;
                    while (delta < -Math.PI) delta += Math.PI * 2;

                    boneObj.rotation.x += delta * damping;

                    if (bone.min !== undefined && bone.max !== undefined) {
                        boneObj.rotation.x = Math.max(bone.min, Math.min(bone.max, boneObj.rotation.x));
                    }
                }

                boneObj.updateMatrixWorld(true);
            }
        }
    }
}
