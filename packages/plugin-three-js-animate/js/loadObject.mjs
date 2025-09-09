import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Load object
export async function loadObject(scene, name, position, filename, mixers = null) {
  //const loader = new GLTFLoader().setPath( 'assets/' );
  const loader = new GLTFLoader();

  // Load model with animations
  const gltf = await loader.loadAsync(filename);

  const model = gltf.scene;
  model.name = name;
  console.log("Model Name:", model.name);

  // Position
  console.log("Position", position);
  model.position.x = position[0];
  model.position.z = position[1];
  model.position.y = 0.2;

  for (const child of model.children) {
    console.log("Child Name:", child.name);

    if (child.name == "Armature") {
      console.log(child);
      console.log(model);
    }

    if (child.isMesh) {
      // Appearance
      child.castShadow = true;
      child.receiveShadow = true;

      // Using PhongMaterial instead of LambertMaterial for shininess
      let mat;
      console.log(child.name);

      if (child.name == "Beddy") {
        let box = child.geometry.boundingBox.max.sub(child.geometry.boundingBox.min);
        let scale = child.scale;
        console.log(box.multiply(scale));

        const loader = new THREE.TextureLoader();
        let diffuseMap = loader.load("assets/granite-8858-in-architextures.jpg");
        diffuseMap.colorSpace = THREE.SRGBColorSpace;
        diffuseMap.minFilter = THREE.LinearFilter;
        diffuseMap.generateMipmaps = false;

        diffuseMap.wrapS = THREE.RepeatWrapping;
        diffuseMap.wrapT = THREE.RepeatWrapping;
        diffuseMap.repeat.set(32, 32);

        mat = new THREE.MeshBasicMaterial({ map: diffuseMap });
      } else {
        mat = new THREE.MeshPhongMaterial({
          color: new THREE.Color("hsl(0, 0%, 50%)"),
          shininess: 0,
        });
      }

      if (child.name.startsWith("Bush")) {
        mat.color = new THREE.Color("hsl(120, 30%, 30%)");
      } else if (child.name == "coneA") {
        mat.color = new THREE.Color("hsl(0, 100%, 50%)");
      } else if (child.name == "coneB") {
        mat.color = new THREE.Color("hsl(240, 100%, 50%)");
      }

      // Preserve original textures if they exist
      if (child.material && child.material.map) {
        mat.map = child.material.map;
        mat.map.anisotropy = 4;
      }

      if (child.material && child.material.aoMap) {
        mat.aoMap = child.material.aoMap;
      }

      if (child.material && child.material.transparent) {
        mat.transparent = child.material.transparent;
      }

      child.material = mat;
    }

    console.log("Processed child:", child.name);
    console.log(child.position);
  }

  scene.add(model);

  if (gltf.animations.length > 0) {
    model.animations = gltf.animations;
    mixers[model.name] = {};

    // Get all animation names
    let animation_names = model.animations.map((clip) => clip.name);

    // use the following once the loader has loaded the model
    for (var i = 0; i < animation_names.length; ++i) {
      let mixer = new THREE.AnimationMixer(model);
      var clip = THREE.AnimationClip.findByName(model.animations, animation_names[i]);
      clip.optimize();

      if (mixer && clip) {
        let action = mixer.clipAction(clip, model);
        action.play();
      } else {
        console.error("Mixer or animation clip is undefined.");
      }

      // Add mixer
      mixers[model.name][clip.name] = mixer;
    }
  }
}
