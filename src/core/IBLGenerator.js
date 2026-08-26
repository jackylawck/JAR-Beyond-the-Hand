/**
 * Zero-Asset 實驗室 HDR 環境貼圖生成器 (IBL)
 * 利用 PMREMGenerator 動態烘焙科技天花板燈管與全息冷光反射
 */
export class IBLGenerator {
    static generate(renderer) {
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        const envScene = new THREE.Scene();

        // 頂部科技冷白燈帶 (頂部強反射條)
        const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const stripGeo = new THREE.BoxGeometry(2.5, 0.2, 12);

        const strip1 = new THREE.Mesh(stripGeo, stripMat);
        strip1.position.set(4, 7, 0);
        envScene.add(strip1);

        const strip2 = new THREE.Mesh(stripGeo, stripMat);
        strip2.position.set(-4, 7, 0);
        envScene.add(strip2);

        // 兩側全息藍色與暖橙色輔助光牆
        const blueWall = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 8),
            new THREE.MeshBasicMaterial({ color: 0x003366 })
        );
        blueWall.position.set(0, 4, -8);
        envScene.add(blueWall);

        const orangeWall = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 8),
            new THREE.MeshBasicMaterial({ color: 0x442200 })
        );
        orangeWall.position.set(0, 4, 8);
        orangeWall.rotation.y = Math.PI;
        envScene.add(orangeWall);

        const cubeRenderTarget = pmremGenerator.fromScene(envScene);
        pmremGenerator.dispose();

        return cubeRenderTarget.texture;
    }
}
