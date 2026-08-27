import * as THREE from 'three';
import { POOL } from '../core/Pool.js';

// 備用獨立緩存向量（防止 Pool 未初始化）
const _localEndPos = new THREE.Vector3();
const _localBonePos = new THREE.Vector3();
const _localV1 = new THREE.Vector3();
const _localV2 = new THREE.Vector3();

export class CCDIKSolver {
    static solve(ikBones, endEffector, targetPos, dt) {
        if (!ikBones || !endEffector || !targetPos) return;

        const maxIterations = 6;
        const thresholdSq = 0.0001;
        const safeDt = Math.max(0.001, Math.min(0.04, dt || 0.016));

        // 限制每幀最大角速度 (rad/s)，防止關節瞬間抽搐
        const maxAngularSpeed = 4.5;
        const maxStepAngle = maxAngularSpeed * safeDt;

        const endPos = POOL.endPos || _localEndPos;
        const bonePos = POOL.bonePos || _localBonePos;
        const v1 = POOL.v1 || _localV1;
        const v2 = POOL.v2 || _localV2;

        for (let iter = 0; iter < maxIterations; iter++) {
            endEffector.getWorldPosition(endPos);
            if (endPos.distanceToSquared(targetPos) < thresholdSq) break;

            for (let i = ikBones.length - 1; i >= 0; i--) {
                const bone = ikBones[i];
                const obj = bone.obj;
                const axis = bone.axis;

                obj.getWorldPosition(bonePos);
                endEffector.getWorldPosition(endPos);

                v1.subVectors(endPos, bonePos);
                v2.subVectors(targetPos, bonePos);

                let deltaAngle = 0;

                if (axis === 'Y') {
                    const curA = Math.atan2(v1.x, v1.z);
                    const tarA = Math.atan2(v2.x, v2.z);
                    deltaAngle = tarA - curA;

                    while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                    while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

                    deltaAngle = Math.max(-maxStepAngle, Math.min(maxStepAngle, deltaAngle * 0.65));
                    obj.rotation.y += deltaAngle;

                } else if (axis === 'X') {
                    const len1 = Math.hypot(v1.x, v1.z);
                    const len2 = Math.hypot(v2.x, v2.z);
                    const curA = Math.atan2(v1.y, len1);
                    const tarA = Math.atan2(v2.y, len2);
                    deltaAngle = tarA - curA;

                    while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
                    while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

                    deltaAngle = Math.max(-maxStepAngle, Math.min(maxStepAngle, deltaAngle * 0.65));
                    obj.rotation.x += deltaAngle;

                    if (bone.min !== undefined && bone.max !== undefined) {
                        obj.rotation.x = Math.max(bone.min, Math.min(bone.max, obj.rotation.x));
                    }
                }

                obj.updateMatrixWorld(true);
            }
        }
    }
}
