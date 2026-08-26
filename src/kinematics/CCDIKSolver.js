import { POOL } from '../core/Pool.js';

export class CCDIKSolver {
    static solve(ikBones, endEffector, target, iterations = 3, damping = 0.4) {
        const maxDelta = 0.12;

        for (let iter = 0; iter < iterations; iter++) {
            for (let i = ikBones.length - 1; i >= 0; i--) {
                const bone = ikBones[i];
                bone.obj.getWorldPosition(POOL.v1);
                endEffector.getWorldPosition(POOL.v2);

                POOL.toEnd.subVectors(POOL.v2, POOL.v1).normalize();
                POOL.toTarget.subVectors(target, POOL.v1).normalize();

                let angle = POOL.toEnd.dot(POOL.toTarget);
                angle = Math.acos(Math.max(-1, Math.min(1, angle)));

                if (angle > 0.001) {
                    POOL.cross.crossVectors(POOL.toEnd, POOL.toTarget).normalize();
                    const currentRot = (bone.axis === 'Y') ? bone.obj.rotation.y : bone.obj.rotation.x;
                    let targetDelta = (bone.axis === 'Y' ? POOL.cross.y : POOL.cross.x) * angle * (1.0 - damping * 0.5);
                    targetDelta = Math.max(-maxDelta, Math.min(maxDelta, targetDelta));
                    const nextRot = Math.max(bone.min, Math.min(bone.max, currentRot + targetDelta));

                    if (bone.axis === 'Y') bone.obj.rotation.y = nextRot;
                    else bone.obj.rotation.x = nextRot;

                    bone.obj.updateMatrixWorld(true);
                }
            }
        }
    }
}
