/**
 * Inline HTML for BodyModel3DWebViewFallback — Three.js in WKWebView / Android WebView.
 * Loads three.module.js + OrbitControls from unpkg (needs network once, then cached).
 */

import type { BodySimulationParams } from '@/src/types';

export function buildBodyModelWebViewHtml(opts: {
    params: BodySimulationParams;
    gender: 'male' | 'female';
    accentColor: string;
    autoRotate: boolean;
}): string {
    const payload = JSON.stringify(opts);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
  canvas { display: block; width: 100%; height: 100%; outline: none; touch-action: none; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script type="module">
const OPT = ${payload};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.184.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070b14, 0.045);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0.35, 4.1);

const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableZoom = true;
controls.minDistance = 2.4;
controls.maxDistance = 8;
controls.minPolarAngle = Math.PI / 7;
controls.maxPolarAngle = Math.PI / 1.35;
controls.enableDamping = true;
controls.dampingFactor = 0.06;

function resize() {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', resize);
resize();

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
scene.add(new THREE.HemisphereLight(0xc8d4e8, 0x1a1410, 0.85));
const d1 = new THREE.DirectionalLight(0xffffff, 1.35);
d1.position.set(4, 8, 6);
scene.add(d1);
const d2 = new THREE.DirectionalLight(0x8090ff, 0.35);
d2.position.set(-6, 4, -4);
scene.add(d2);

const accentCol = new THREE.Color(OPT.accentColor);
const spot = new THREE.SpotLight(OPT.accentColor, 1.1, 200, 0.55, 0.85, 2);
spot.position.set(0, -0.5, 5);
scene.add(spot);
const pt = new THREE.PointLight(accentCol.getHex(), 0.55, 10, 2);
pt.position.set(0, 2.2, 2.8);
scene.add(pt);

function mat(color, emissive, emissiveIntensity, roughness) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    roughness,
    metalness: 0.1,
  });
}

function buildBody(params, gender, accentHex) {
  const isFemale = gender === 'female';
  const {
    shoulderWidth,
    chestWidth,
    waistWidth,
    hipWidth,
    armSize,
    legSize,
    muscleTone,
    bodyFatOverlay,
  } = params;
  const torsoWidthX = lerp(0.7, 1.3, chestWidth);
  const torsoWidthZ = lerp(0.6, 1.0, (chestWidth + waistWidth) / 2);
  const shoulderScale = lerp(0.8, 1.4, shoulderWidth);
  const waistScale = lerp(0.6, 1.2, waistWidth);
  const hipScale = lerp(isFemale ? 0.9 : 0.7, isFemale ? 1.5 : 1.1, hipWidth);
  const armScale = lerp(0.7, 1.5, armSize);
  const legScale = lerp(0.8, 1.4, legSize);
  const satFemale = lerp(0.14, 0.38, muscleTone);
  const satMale = lerp(0.3, 0.5, muscleTone);
  const bodyColor = new THREE.Color().setHSL(
    isFemale ? 0.56 : 0.08,
    isFemale ? satFemale : satMale,
    lerp(0.58, 0.4, bodyFatOverlay),
  );
  const emissiveColor = new THREE.Color(accentHex).multiplyScalar(0.3);
  const emissiveIntensity = lerp(0, 0.4, muscleTone);

  const g = new THREE.Group();

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 16),
    mat(bodyColor, emissiveColor, emissiveIntensity * 0.5, 0.5),
  );
  head.position.set(0, 1.9, 0);
  g.add(head);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 0.3, 12),
    mat(bodyColor, emissiveColor, emissiveIntensity, 0.6),
  );
  neck.position.set(0, 1.6, 0);
  neck.scale.set(0.6, 1, 0.6);
  g.add(neck);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.0, 8, 16),
    mat(bodyColor, emissiveColor, emissiveIntensity, 0.6),
  );
  torso.position.set(0, 1.1, 0);
  torso.scale.set(torsoWidthX * shoulderScale, 0.7, torsoWidthZ);
  g.add(torso);

  const waistMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.4, 6, 12),
    mat(bodyColor, emissiveColor, emissiveIntensity, 0.6),
  );
  waistMesh.position.set(0, 0.5, 0);
  waistMesh.scale.set(torsoWidthX * waistScale * 0.85, 1, torsoWidthZ * 0.9);
  g.add(waistMesh);

  const hips = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 12),
    mat(bodyColor, emissiveColor, emissiveIntensity, 0.6),
  );
  hips.position.set(0, 0.05, 0);
  hips.scale.set(hipScale, 0.35, torsoWidthZ * 0.95);
  g.add(hips);

  function addCapsule(px, py, pz, sx, sy, sz, rad, len, capSeg, radSeg) {
    const m = new THREE.Mesh(
      new THREE.CapsuleGeometry(rad, len, capSeg, radSeg),
      mat(bodyColor, emissiveColor, emissiveIntensity, 0.6),
    );
    m.position.set(px, py, pz);
    m.scale.set(sx, sy, sz);
    g.add(m);
  }

  addCapsule(-0.55 * shoulderScale, 1.15, 0, armScale, 1, armScale, 0.12, 0.6, 6, 12);
  addCapsule(-0.55 * shoulderScale, 0.55, 0, armScale * 0.85, 1, armScale * 0.85, 0.1, 0.5, 6, 12);
  addCapsule(0.55 * shoulderScale, 1.15, 0, armScale, 1, armScale, 0.12, 0.6, 6, 12);
  addCapsule(0.55 * shoulderScale, 0.55, 0, armScale * 0.85, 1, armScale * 0.85, 0.1, 0.5, 6, 12);

  addCapsule(-0.22 * hipScale, -0.45, 0, legScale, 1, legScale, 0.14, 0.55, 8, 12);
  addCapsule(-0.22 * hipScale, -1.15, 0, legScale * 0.8, 1, legScale * 0.8, 0.11, 0.5, 6, 12);
  addCapsule(0.22 * hipScale, -0.45, 0, legScale, 1, legScale, 0.14, 0.55, 8, 12);
  addCapsule(0.22 * hipScale, -1.15, 0, legScale * 0.8, 1, legScale * 0.8, 0.11, 0.5, 6, 12);

  const footMat = mat(bodyColor, new THREE.Color(0), 0, 0.7);
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.25), footMat);
  f1.position.set(-0.22 * hipScale, -1.55, 0.08);
  f1.scale.set(0.7, 0.3, 1);
  g.add(f1);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.25), footMat);
  f2.position.set(0.22 * hipScale, -1.55, 0.08);
  f2.scale.set(0.7, 0.3, 1);
  g.add(f2);

  return g;
}

const bodyGroup = buildBody(OPT.params, OPT.gender, OPT.accentColor);
scene.add(bodyGroup);

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.08);
  last = now;
  if (OPT.autoRotate) bodyGroup.rotation.y += dt * 0.3;
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
</script>
</body>
</html>`;
}
