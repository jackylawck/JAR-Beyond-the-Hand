import * as THREE from 'three';

export const POOL = {
    // 視角與位移計算向量
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    
    // 🌟 CCD-IK DLS 專用零 GC 向量緩存
    toEnd: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    cross: new THREE.Vector3(),

    // 矩陣與四元數
    q1: new THREE.Quaternion(),
    m1: new THREE.Matrix4()
};
