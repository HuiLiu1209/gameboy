import { wireConsole } from './game-menu.js';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.querySelector('main');
const status = document.querySelector('#status');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
root.prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-label', 'Game Boy. Click OFF-ON or press P for power. Use the D-pad or arrow keys to select a game. Drag to rotate.');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
controls.minPolarAngle = Math.PI * 0.18;
controls.maxPolarAngle = Math.PI * 0.74;
controls.addEventListener('change', render);

const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.75;
room.dispose();
pmrem.dispose();
const key = new THREE.DirectionalLight(0xfff1dd, 2.2);
key.position.set(4, 6, 3);
scene.add(key);
const fill = new THREE.DirectionalLight(0xf2fff7, 1);
fill.position.set(-3, 3, -4);
scene.add(fill);

const shade = document.createElement('canvas');
shade.width = shade.height = 128;
const ctx = shade.getContext('2d');
const fade = ctx.createRadialGradient(64,64,0,64,64,64);
fade.addColorStop(0,'rgba(40,49,39,.42)');
fade.addColorStop(.46,'rgba(40,49,39,.18)');
fade.addColorStop(1,'rgba(40,49,39,0)');
ctx.fillStyle = fade;
ctx.fillRect(0,0,128,128);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.7), new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(shade), transparent:true, depthWrite:false, toneMapped:false }));
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = -1.54;

function render() { renderer.render(scene,camera); }
function resize() {
  const {clientWidth:w, clientHeight:h} = root;
  camera.aspect = w/h;
  const distance = Math.max(7.6, 4.45 / camera.aspect);
  camera.position.sub(controls.target).setLength(distance).add(controls.target);
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
  controls.update();
  render();
}
camera.position.set(9, 1.65, 2.35);
window.addEventListener('resize',resize);
resize();
async function load() {
  const folder = '/assets/y_gameboy/';
  const loader = new THREE.TextureLoader();
  const maps = ['BaseColor','Normal','Metallic','Roughness','AO'].map(name => loader.loadAsync(folder+'textures/Gameboy_low_Gameboy_'+name+'.png'));
  const [model, map, normalMap, metalnessMap, roughnessMap, aoMap] = await Promise.all([new FBXLoader().loadAsync(folder+'Gameboy.fbx'), ...maps]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.MeshStandardMaterial({ map, normalMap, metalnessMap, roughnessMap, aoMap, metalness:1, roughness:1 });
  model.traverse(part => { if (part.isMesh) part.material = material; });
  const box = new THREE.Box3().setFromObject(model);
  const scale = 3 / box.getSize(new THREE.Vector3()).y;
  model.scale.setScalar(scale);
  model.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
  scene.add(model,shadow);
  wireConsole(model,renderer,camera,render,document.querySelector('#console-state'));
  status.remove();
  render();
}
load().catch(error => { console.error(error); status.textContent = 'The Game Boy could not be loaded. Reload to try again.'; });
