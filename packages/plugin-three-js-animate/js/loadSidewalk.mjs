import * as THREE from "three";

// Load sidewalk
export async function loadSidewalk(scene, sidewalk_type = "checker", odim, wdim) {
  // Load texture
  /*
    const loader = new THREE.TextureLoader();
    let diffuseMap = loader.load( 'assets/paving-blocks-4921-in-architextures.jpg' );
    diffuseMap.colorSpace = THREE.SRGBColorSpace;
    diffuseMap.minFilter = THREE.LinearFilter;
    diffuseMap.generateMipmaps = false;

    diffuseMap.wrapS = THREE.RepeatWrapping;
    diffuseMap.wrapT = THREE.RepeatWrapping;
    diffuseMap.repeat.set(16, 16);

    const mat = new THREE.MeshBasicMaterial( { map: diffuseMap } );
    */

  let uwidth = odim[0];
  let ulength = odim[1];

  // Loop
  for (let i = 0; i < wdim[0]; i++) {
    for (let j = 0; j < wdim[1]; j++) {
      let geometry = new THREE.BoxGeometry(uwidth, 0.45, ulength);

      // Set material
      let mat = new THREE.MeshBasicMaterial();
      let color;

      if (sidewalk_type == "checker") {
        if ((i % 2 == 0 && j % 2 == 0) || (i % 2 == 1 && j % 2 == 1)) {
          color = 0xa5a391;
        } else {
          color = 0x130a06;
        }
      } else {
        color = sidewalk_type;
      }

      mat.color.set(color);

      let model = new THREE.Mesh(geometry, mat);
      model.name = "sidewalk_" + i + j;
      model.userData.originalColor = color;

      model.position.x = i * uwidth - ((wdim[0] - 1) * uwidth) / 2;
      model.position.z = j * ulength - ((wdim[1] - 1) * ulength) / 2;

      model.position.y = 0;

      model.castShadow = true;
      model.receiveShadow = true;

      scene.add(model);
    }
  }
  //console.log(scene)
}
