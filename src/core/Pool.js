/**
 * 全域靜態向量池，杜絕主迴圈內 new / clone 造成的垃圾回收卡頓
 */
export const POOL = {
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    toEnd: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    cross: new THREE.Vector3(),
    camLook: new THREE.Vector3(),
    camTargetPos: new THREE.Vector3()
};
