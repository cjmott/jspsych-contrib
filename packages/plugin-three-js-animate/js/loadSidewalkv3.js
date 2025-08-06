import { GLTFLoader } from "../../../../../three.js/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "../../../../three.js/build/three.module.js";

// Load sidewalk
export async function loadSidewalkv3(scene, dim) {
  const gltfloader = new GLTFLoader().setPath("assets/");

  // Load obstacle model to get dimensions
  const filename = "bush.glb";
  const gltf = await gltfloader.loadAsync(filename);

  let uwidth = 0;
  let ulength = 0;

  gltf.scene.traverse((child) => {
    if (child.geometry != null) {
      let x =
        child.scale.x *
        Math.abs(child.geometry.boundingBox.max.x - child.geometry.boundingBox.min.x);
      let z =
        child.scale.z *
        Math.abs(child.geometry.boundingBox.max.z - child.geometry.boundingBox.min.z);
      if (x > uwidth) uwidth = x;
      if (z > ulength) ulength = z;
    }
  });

  console.log(uwidth, ulength);

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

  // Loop
  for (let i = 0; i < dim[0]; i++) {
    for (let j = 0; j < dim[1]; j++) {
      let geometry = new THREE.BoxGeometry(uwidth, 0.45, ulength);

      // Set material
      let mat = new THREE.MeshBasicMaterial();
      let color;

      if ((i % 2 == 0 && j % 2 == 0) || (i % 2 == 1 && j % 2 == 1)) {
        color = 0xa5a391;
      } else {
        color = 0x130a06;
      }

      mat.color.set(color);

      let model = new THREE.Mesh(geometry, mat);
      model.name = "sidewalk_" + i + j;
      model.userData.originalColor = color;

      model.position.x = i * uwidth - ((dim[0] - 1) * uwidth) / 2;
      model.position.z = j * ulength - ((dim[1] - 1) * ulength) / 2;

      model.position.y = 0;

      model.castShadow = true;
      model.receiveShadow = true;

      scene.add(model);
    }
  }
  //console.log(scene)
}
