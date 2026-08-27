import * as THREE from 'three';

export const POOL = {
    // 視角與位移計算向量
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    v1: new THREE.Vector3(),
    v2: new THREE.Vector3(),
    
    // 🌟 CCD-IK 解算專用空間向量 (補齊缺失實例)
    endPos: new THREE.Vector3(),
    bonePos: new THREE.Vector3(),
    targetVec: new THREE.Vector3(),

    // 矩陣與四元數
    q1: new THREE.Quaternion(),
    m1: new THREE.Matrix4()
};
