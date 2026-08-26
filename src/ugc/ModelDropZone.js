export class ModelDropZone {
    constructor(onModelLoaded) {
        this.onModelLoaded = onModelLoaded;
        this.dropOverlay = null;
        this._initOverlay();
    }

    _initOverlay() {
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.toLowerCase().endsWith('.stl')) {
                    this._loadSTL(file);
                }
            }
        });
    }

    _loadSTL(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (typeof THREE.STLLoader !== 'undefined') {
                const loader = new THREE.STLLoader();
                const geometry = loader.parse(event.target.result);
                geometry.computeVertexNormals();
                geometry.center();
                geometry.scale(0.001, 0.001, 0.001);

                if (this.onModelLoaded) {
                    this.onModelLoaded({
                        slot: 'claw',
                        geometry: geometry,
                        physics: { mass: 0.8 }
                    });
                }
            }
        };
        reader.readAsArrayBuffer(file);
    }

    dispose() {}
}
