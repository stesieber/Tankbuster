// Preview-Banner anzeigen wenn IS_PREVIEW gesetzt
if (window.IS_PREVIEW) {
  document.getElementById('preview-banner').style.display = 'block';
  document.getElementById('branch-name').textContent = window.BRANCH_NAME;
}

// ── Scene ──────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color('#87CEEB');
scene.fog = new THREE.Fog('#87CEEB', 100, 400);

// ── Renderer ───────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Camera ─────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// ── Lights ─────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// ── Ground ─────────────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshLambertMaterial({ color: '#4a5e23' })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Houses ─────────────────────────────────────────────────────────────────
function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomPositionFarFrom(minDist, range) {
  let x, z;
  do {
    x = randomBetween(-range, range);
    z = randomBetween(-range, range);
  } while (Math.sqrt(x * x + z * z) < minDist);
  return { x, z };
}

function buildHouse(w, h, d) {
  const group = new THREE.Group();

  // Wände
  const bodyMat = new THREE.MeshLambertMaterial({ color: '#8c8070' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Dachüberstand
  const roofMat = new THREE.MeshLambertMaterial({ color: '#6b3a2a' });
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), roofMat);
  roofSlab.position.y = h / 2 + 0.15;
  group.add(roofSlab);

  const frameMat = new THREE.MeshLambertMaterial({ color: '#d4c4a0' });
  const glassMat = new THREE.MeshLambertMaterial({ color: '#2a3a55' });
  const doorMat  = new THREE.MeshLambertMaterial({ color: '#4a2e18' });

  const winW = 1.2, winH = 1.4;
  const winY = h * 0.1; // leicht über Gebäudemitte

  // Fenster vorne + hinten (±Z)
  const nFront = Math.max(1, Math.floor(w / 4));
  const frontSpacing = w / (nFront + 1);
  for (const fz of [1, -1]) {
    const zPos = fz * (d / 2 + 0.04);
    for (let i = 1; i <= nFront; i++) {
      const xPos = -w / 2 + frontSpacing * i;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.2, winH + 0.2, 0.06), frameMat);
      frame.position.set(xPos, winY, zPos);
      group.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.08), glassMat);
      glass.position.set(xPos, winY, zPos + fz * 0.02);
      group.add(glass);
    }
  }

  // Fenster links + rechts (±X)
  const nSide = Math.max(1, Math.floor(d / 5));
  const sideSpacing = d / (nSide + 1);
  for (const fx of [1, -1]) {
    const xPos = fx * (w / 2 + 0.04);
    for (let i = 1; i <= nSide; i++) {
      const zPos = -d / 2 + sideSpacing * i;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, winH + 0.2, winW + 0.2), frameMat);
      frame.position.set(xPos, winY, zPos);
      group.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, winH, winW), glassMat);
      glass.position.set(xPos + fx * 0.02, winY, zPos);
      group.add(glass);
    }
  }

  // Tür (Vorderseite +Z, zentriert, am Boden)
  const doorW = Math.min(1.6, w * 0.22);
  const doorH = Math.min(h * 0.38, 3.2);
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.1), doorMat);
  door.position.set(0, -h / 2 + doorH / 2, d / 2 + 0.05);
  group.add(door);

  return group;
}

const houses = [];
for (let i = 0; i < 10; i++) {
  const w = randomBetween(8, 15);
  const h = randomBetween(8, 20);
  const d = randomBetween(8, 15);
  const group = buildHouse(w, h, d);
  const pos = randomPositionFarFrom(30, 180);
  group.position.set(pos.x, h / 2, pos.z);
  scene.add(group);
  houses.push({ mesh: group, hp: 3, destroyed: false });
}

// ── Trees ──────────────────────────────────────────────────────────────────
const trees = [];

for (let i = 0; i < 15; i++) {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 3, 8),
    new THREE.MeshLambertMaterial({ color: '#5a3a1a' })
  );
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  group.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 8, 8),
    new THREE.MeshLambertMaterial({ color: '#2d7a2d' })
  );
  crown.position.y = 4.5;
  crown.castShadow = true;
  group.add(crown);

  const pos = randomPositionFarFrom(15, 190);
  group.position.set(pos.x, 0, pos.z);
  scene.add(group);
  trees.push({ group, falling: false, fallen: false, fallAngle: 0, fallSpeed: 0, axis: new THREE.Vector3(1, 0, 0) });
}

function updateFallingTrees(dt) {
  for (const t of trees) {
    if (!t.falling || t.fallen) continue;
    t.fallSpeed = Math.min(t.fallSpeed + dt * 2.5, 4.0);
    t.fallAngle += t.fallSpeed * dt;
    if (t.fallAngle >= Math.PI / 2) {
      t.fallAngle = Math.PI / 2;
      t.fallen = true;
    }
    t.group.quaternion.setFromAxisAngle(t.axis, t.fallAngle);
  }
}

// ── Tank ───────────────────────────────────────────────────────────────────
const tankColor = new THREE.MeshLambertMaterial({ color: '#3a5a2a' });

const tank = new THREE.Group();

const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), tankColor);
body.position.y = 1.0;
body.castShadow = true;
body.receiveShadow = true;
tank.add(body);

const trackMat = new THREE.MeshLambertMaterial({ color: '#222222' });
[-2.3, 2.3].forEach(xOffset => {
  const track = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), trackMat);
  track.position.set(xOffset, 0.85, 0);
  track.castShadow = true;
  tank.add(track);
});

const turret = new THREE.Group();
turret.position.set(0, 1.3, 0);
body.add(turret);

const turretBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5), tankColor);
turretBox.castShadow = true;
turret.add(turretBox);

const cannon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
  new THREE.MeshLambertMaterial({ color: '#2a4a1a' })
);
cannon.rotation.x = Math.PI / 2;
cannon.position.set(0, 0, -2.5); // -Z = Vorderseite (Tank fährt in -Z)
cannon.castShadow = true;
turret.add(cannon);

tank.position.set(0, 0, 0);
scene.add(tank);

// ── Dummy-Ziele ─────────────────────────────────────────────────────────────
const dummyMat = new THREE.MeshLambertMaterial({ color: '#8b0000' });

const dummyTargetDefs = [
  { position: new THREE.Vector3(50, 0, 50),  hp: 100 },
  { position: new THREE.Vector3(-60, 0, 80), hp: 100 },
  { position: new THREE.Vector3(30, 0, -70), hp: 100 },
];

function buildDummyTank(pos) {
  const group = new THREE.Group();

  const dBody = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), dummyMat.clone());
  dBody.position.y = 1.0;
  dBody.castShadow = true;
  group.add(dBody);

  [-2.3, 2.3].forEach(xOffset => {
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), new THREE.MeshLambertMaterial({ color: '#222' }));
    tr.position.set(xOffset, 0.85, 0);
    group.add(tr);
  });

  const dTurret = new THREE.Group();
  dTurret.position.set(0, 1.3, 0);
  dBody.add(dTurret);

  const dTurretBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5), dummyMat.clone());
  dTurret.add(dTurretBox);

  const dCannon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
    new THREE.MeshLambertMaterial({ color: '#550000' })
  );
  dCannon.rotation.x = Math.PI / 2;
  dCannon.position.set(0, 0, -2.5);
  dTurret.add(dCannon);

  group.position.copy(pos);
  scene.add(group);
  return group;
}

const dummyTargets = dummyTargetDefs.map(def => ({
  mesh: buildDummyTank(def.position),
  hp: def.hp,
  maxHp: def.hp,
  destroyed: false,
  position: def.position.clone(),
}));

// ── Target HP Bars (DOM) ───────────────────────────────────────────────────
const targetHud = document.getElementById('target-hud');

dummyTargets.forEach((t, i) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'target-hp-wrapper';
  wrapper.id = `target-hp-${i}`;

  const bg = document.createElement('div');
  bg.className = 'target-hp-bar-bg';

  const bar = document.createElement('div');
  bar.className = 'target-hp-bar';
  bar.id = `target-bar-${i}`;

  const label = document.createElement('div');
  label.className = 'target-hp-label';
  label.id = `target-label-${i}`;
  label.textContent = `${t.hp}/${t.maxHp}`;

  bg.appendChild(bar);
  wrapper.appendChild(bg);
  wrapper.appendChild(label);
  targetHud.appendChild(wrapper);
});

function updateTargetHpBar(i) {
  const t = dummyTargets[i];
  const bar = document.getElementById(`target-bar-${i}`);
  const label = document.getElementById(`target-label-${i}`);
  if (!bar || !label) return;
  const pct = Math.max(0, t.hp / t.maxHp * 100);
  bar.style.width = pct + '%';
  bar.style.background = pct > 50 ? '#22cc22' : pct > 25 ? '#ccaa00' : '#cc2222';
  label.textContent = `${Math.max(0, t.hp)}/${t.maxHp}`;
}

function updateTargetHpPositions() {
  dummyTargets.forEach((t, i) => {
    const wrapper = document.getElementById(`target-hp-${i}`);
    if (!wrapper || t.destroyed) { if (wrapper) wrapper.style.display = 'none'; return; }

    const worldPos = new THREE.Vector3();
    t.mesh.getWorldPosition(worldPos);
    worldPos.y += 4;

    const projected = worldPos.clone().project(camera);
    if (projected.z > 1) { wrapper.style.display = 'none'; return; }

    const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    wrapper.style.display = 'flex';
    wrapper.style.left = sx + 'px';
    wrapper.style.top = sy + 'px';
  });
}

// ── Krater ─────────────────────────────────────────────────────────────────
const craters = [];
const MAX_CRATERS = 50;

function createCrater(position) {
  const geo = new THREE.CircleGeometry(2.5, 16);
  const mat = new THREE.MeshLambertMaterial({ color: '#2a1a0a' });
  const crater = new THREE.Mesh(geo, mat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(position.x, 0.05, position.z);
  scene.add(crater);
  craters.push(crater);
  if (craters.length > MAX_CRATERS) {
    const old = craters.shift();
    scene.remove(old);
  }
}

// ── Partikel-Helfer ────────────────────────────────────────────────────────
const particles = [];

function spawnParticles(position, count, colorHex, speed, lifetime, gravity, size) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshLambertMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * speed,
      Math.random() * speed * 0.8 + speed * 0.2,
      (Math.random() - 0.5) * speed
    );

    particles.push({ mesh, vel, lifetime, age: 0, gravity, mat });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    p.vel.y -= p.gravity * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    const alpha = Math.max(0, 1 - p.age / p.lifetime);
    p.mat.opacity = alpha;
    p.mat.transparent = true;
    if (p.age >= p.lifetime) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

// ── Rauch-Partikel ─────────────────────────────────────────────────────────
const smokeParticles = [];

function spawnSmoke(position, count, lifetime) {
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.4 + Math.random() * 0.4, 5, 5);
    const mat = new THREE.MeshLambertMaterial({ color: '#555', transparent: true, opacity: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2
    ));
    scene.add(mesh);
    smokeParticles.push({ mesh, vel: new THREE.Vector3((Math.random()-0.5)*0.3, 0.8+Math.random()*0.5, (Math.random()-0.5)*0.3), lifetime, age: 0, mat });
  }
}

function updateSmoke(dt) {
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const p = smokeParticles[i];
    p.age += dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    p.mat.opacity = Math.max(0, 0.7 * (1 - p.age / p.lifetime));
    if (p.age >= p.lifetime) {
      scene.remove(p.mesh);
      smokeParticles.splice(i, 1);
    }
  }
}

// ── Explosion ──────────────────────────────────────────────────────────────
function createExplosion(position) {
  // Blitz-Licht
  const flash = new THREE.PointLight(0xff8800, 20, 30);
  flash.position.copy(position);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 100);

  // Feuer-Partikel
  spawnParticles(position, 15, 0xff4400, 8, 1.0, 9.8, 0.4);
  // Rauch
  spawnSmoke(position, 8, 3.0);

  playExplosion();
}

// ── Mündungsfeuer ──────────────────────────────────────────────────────────
function createMuzzleFlash(position) {
  const flash = new THREE.PointLight(0xffff00, 5, 15);
  flash.position.copy(position);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 80);

  spawnParticles(position, 6, 0xffdd00, 5, 0.3, 9.8, 0.15);
}

// ── Abpraller-Funken ───────────────────────────────────────────────────────
function createRicochet(position) {
  spawnParticles(position, 4, 0xffff88, 6, 0.3, 9.8, 0.08);
  playRicochet();
}

// ── Haus-Zerstörung ────────────────────────────────────────────────────────
function destroyHouse(house) {
  house.destroyed = true;
  scene.remove(house.mesh);

  const pos = house.mesh.position.clone();
  for (let i = 0; i < 7; i++) {
    const s = randomBetween(1, 3);
    const debris = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, s),
      new THREE.MeshLambertMaterial({ color: '#777' })
    );
    debris.position.set(
      pos.x + randomBetween(-4, 4),
      s / 2,
      pos.z + randomBetween(-4, 4)
    );
    debris.rotation.y = Math.random() * Math.PI;
    scene.add(debris);
  }
}

// ── Dummy-Zerstörung ───────────────────────────────────────────────────────
function destroyDummy(i) {
  const t = dummyTargets[i];
  t.destroyed = true;

  // Farbe zu schwarz, leicht schief
  t.mesh.traverse(child => {
    if (child.isMesh) {
      child.material = new THREE.MeshLambertMaterial({ color: '#111' });
    }
  });
  t.mesh.rotation.z += 0.3;

  createExplosion(t.position.clone().add(new THREE.Vector3(0, 2, 0)));
  spawnSmoke(t.position.clone().add(new THREE.Vector3(0, 3, 0)), 10, 3.0);
}

// ── Trefferberechnung ──────────────────────────────────────────────────────
const armorFactor = { front: 1.0, side: 1.5, rear: 2.0, top: 3.0 };

function calculateDamage(projectileVelocity, targetNormal, baseDamage) {
  const angle = projectileVelocity.clone().normalize().angleTo(targetNormal.clone().normalize());
  if (angle < 0.35) return 0;
  const factor = Math.sin(angle);
  return Math.round(baseDamage * factor);
}

function getHitSide(projectileVelocity, targetObject) {
  const localVel = projectileVelocity.clone();
  const invQuat = targetObject.quaternion.clone().inverse();
  localVel.applyQuaternion(invQuat);

  const ax = Math.abs(localVel.x);
  const ay = Math.abs(localVel.y);
  const az = Math.abs(localVel.z);

  if (ay > ax && ay > az) return 'top';
  if (az > ax) return localVel.z > 0 ? 'front' : 'rear';
  return 'side';
}

// ── Projektile ─────────────────────────────────────────────────────────────
const projectiles = [];

function fireShell() {
  // Kanone: CylinderGeometry, rotation.x=PI/2 → lokale -Y zeigt in Welt-Z=-Z (vorne).
  // (0,-1,0) in Kanonen-Lokalraum → (0,0,-1) Weltrichtung = Vorwärts.
  const dir = new THREE.Vector3(0, -1, 0);
  dir.transformDirection(cannon.matrixWorld).normalize();

  // Mündungsspitze = Kanonenmitte + 2 Einheiten in Schussrichtung
  const muzzlePos = new THREE.Vector3();
  cannon.getWorldPosition(muzzlePos);
  muzzlePos.addScaledVector(dir, 2);

  const geo = new THREE.SphereGeometry(0.2, 6, 6);
  const mat = new THREE.MeshLambertMaterial({ color: '#333' });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(muzzlePos);
  scene.add(mesh);

  createMuzzleFlash(muzzlePos.clone());
  playCannonShot();

  projectiles.push({
    mesh,
    velocity: dir.multiplyScalar(3),
    alive: true,
    distanceTravelled: 0,
    maxDistance: 1200,
    damage: 30,
    isShell: true,
  });

  shotCount++;
  document.getElementById('shot-count').textContent = shotCount;
}

function fireMG() {
  const dir = new THREE.Vector3(0, -1, 0);
  dir.transformDirection(cannon.matrixWorld).normalize();

  const muzzlePos = new THREE.Vector3();
  cannon.getWorldPosition(muzzlePos);
  muzzlePos.addScaledVector(dir, 2);

  const geo = new THREE.SphereGeometry(0.08, 4, 4);
  const mat = new THREE.MeshLambertMaterial({ color: '#FFD700' });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(muzzlePos);
  scene.add(mesh);

  playMGShot();

  projectiles.push({
    mesh,
    velocity: dir.multiplyScalar(6),
    alive: true,
    distanceTravelled: 0,
    maxDistance: 150,
    damage: 2,
    isShell: false,
  });
}

function checkCollision(projectile, targetMesh) {
  const box = new THREE.Box3().setFromObject(targetMesh);
  return box.containsPoint(projectile.mesh.position);
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.alive) { scene.remove(p.mesh); projectiles.splice(i, 1); continue; }

    const prevPos = p.mesh.position.clone();
    if (p.isShell) p.velocity.y -= 0.005;
    const move = p.velocity.clone().multiplyScalar(dt * 60);
    p.mesh.position.add(move);
    p.distanceTravelled += move.length();

    // Boden
    if (p.mesh.position.y <= 0) {
      if (p.isShell) createCrater(p.mesh.position);
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    // Reichweite überschritten
    if (p.distanceTravelled > p.maxDistance) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    // Feindliche Geschosse treffen Spieler
    if (p.isEnemyShot) {
      const playerBox = new THREE.Box3().setFromObject(tank);
      if (playerBox.containsPoint(p.mesh.position)) {
        playerGetHit(p.damage);
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        continue;
      }
    }

    // Spieler-Geschosse treffen Gegner
    if (!p.isEnemyShot) {
      let hitEnemy = false;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (checkCollision(p, enemy.mesh)) {
          const normal = new THREE.Vector3(0, 1, 0);
          const dmg = calculateDamage(p.velocity, normal, p.damage);
          if (dmg === 0) {
            createRicochet(p.mesh.position.clone());
          } else {
            enemy.hp -= dmg;
            if (enemy.hp <= 0) explodeEnemy(enemy);
          }
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) continue;
    }

    // Dummy-Ziele
    let hit = false;
    for (let j = 0; j < dummyTargets.length; j++) {
      const t = dummyTargets[j];
      if (t.destroyed) continue;
      if (checkCollision(p, t.mesh)) {
        const normal = new THREE.Vector3(0, 1, 0);
        const dmg = calculateDamage(p.velocity, normal, p.damage);
        if (dmg === 0) {
          createRicochet(p.mesh.position.clone());
        } else {
          const side = getHitSide(p.velocity, t.mesh);
          const finalDmg = Math.round(dmg * armorFactor[side]);
          t.hp -= finalDmg;
          updateTargetHpBar(j);
          if (t.hp <= 0) destroyDummy(j);
        }
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    // Häuser
    for (let j = 0; j < houses.length; j++) {
      const h = houses[j];
      if (h.destroyed) continue;
      if (checkCollision(p, h.mesh)) {
        const normal = new THREE.Vector3(0, 1, 0);
        const dmg = calculateDamage(p.velocity, normal, p.damage);
        if (dmg === 0) {
          createRicochet(p.mesh.position.clone());
        } else {
          h.hp--;
          if (h.hp <= 0) destroyHouse(h);
        }
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;

    // Bäume – Kanone lässt Baum umfallen
    if (p.isShell) {
      for (const t of trees) {
        if (t.falling || t.fallen) continue;
        const tp = t.group.position;
        const pp = p.mesh.position;
        const dx = pp.x - tp.x;
        const dz = pp.z - tp.z;
        if (Math.sqrt(dx * dx + dz * dz) < 2.5 && pp.y < 7) {
          const vLen = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
          let fx = 1, fz = 0;
          if (vLen > 0.001) { fx = p.velocity.x / vLen; fz = p.velocity.z / vLen; }
          t.axis.set(fz, 0, -fx);
          t.falling = true;
          t.fallSpeed = 0.8;
          spawnParticles(pp.clone(), 6, 0x5a3a1a, 3, 0.8, 9.8, 0.15);
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
          break;
        }
      }
    }
  }
}

// ── Spieler HP ─────────────────────────────────────────────────────────────
let playerHP = 100;
const playerMaxHP = 100;

function updateHPBar() {
    const pct = Math.max(0, playerHP / playerMaxHP * 100);
    document.getElementById('hp-bar').style.width = pct + '%';
    document.getElementById('hp-bar').style.background =
        pct > 60 ? '#22cc22' : pct > 30 ? '#ccaa00' : '#cc2222';
    document.getElementById('hp-text').textContent =
        `❤️ HP: ${Math.max(0, Math.round(playerHP))} / ${playerMaxHP}`;
}

// ── Kamera-Wackeln ──────────────────────────────────────────────────────────
let _shakeIntensity = 0;
let _shakeTimer = 0;

function cameraShake(intensity, durationMs) {
    _shakeIntensity = intensity;
    _shakeTimer = durationMs;
}

// ── Spielpause ──────────────────────────────────────────────────────────────
let gamePaused = true;

// ── Game Over ───────────────────────────────────────────────────────────────
function gameOver(result) {
    gamePaused = true;
    const overlay = document.getElementById('game-overlay');
    const title   = document.getElementById('overlay-title');
    const msg     = document.getElementById('overlay-message');
    const btn     = document.getElementById('overlay-button');

    if (result === 'gewonnen') {
        title.textContent = '🏆 Sieg!';
        msg.textContent   = 'Du hast alle 5 Gegner besiegt!';
        overlay.style.background = 'rgba(0, 100, 0, 0.85)';
    } else {
        title.textContent = '💀 Niederlage!';
        msg.textContent   = 'Dein Panzer wurde zerstört!';
        overlay.style.background = 'rgba(100, 0, 0, 0.85)';
    }

    btn.textContent = '🔄 Nochmal spielen';
    btn.onclick = () => location.reload();
    btn.ontouchend = (e) => { e.preventDefault(); location.reload(); };
    overlay.style.display = 'flex';
}

// ── Spieler-Treffer ─────────────────────────────────────────────────────────
function playerGetHit(damage) {
    playerHP -= damage;
    playerHP = Math.max(0, playerHP);
    updateHPBar();
    cameraShake(0.5, 300);
    playSound('player_hit');
    if (playerHP <= 0) gameOver('verloren');
}

// ── Input ──────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === ' ' || e.key === ' ') tryFireCannon();
  if (e.key.toLowerCase() === 'z') toggleScope();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Touch Joysticks
const joystickLeft  = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };
const joystickRight = { active: false, touchId: null, x: 0, y: 0, baseX: 0, baseY: 0 };

const leftBase  = document.getElementById('joystick-left-base');
const leftKnob  = document.getElementById('joystick-left-knob');
const rightBase = document.getElementById('joystick-right-base');
const rightKnob = document.getElementById('joystick-right-knob');

const JOYSTICK_RADIUS = 50;
const KNOB_MAX = 40;

function updateKnob(knob, jx, jy) {
  const dx = Math.min(Math.max(jx, -1), 1) * KNOB_MAX;
  const dy = Math.min(Math.max(jy, -1), 1) * KNOB_MAX;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}

document.addEventListener('touchstart', e => {
  resumeAudio();
  // preventDefault nur wenn kein Button berührt wird – sonst blockiert es Knopf-Klicks auf Mobile
  const hasNonButton = Array.from(e.changedTouches).some(t => t.target.tagName !== 'BUTTON');
  if (hasNonButton) e.preventDefault();
  for (const touch of e.changedTouches) {
    if (touch.target.tagName === 'BUTTON') continue;

    const isLeft = touch.clientX < window.innerWidth / 2;
    const joy  = isLeft ? joystickLeft  : joystickRight;
    const base = isLeft ? leftBase      : rightBase;
    if (!joy.active) {
      joy.active  = true;
      joy.touchId = touch.identifier;
      joy.baseX   = touch.clientX;
      joy.baseY   = touch.clientY;
      joy.x = 0;
      joy.y = 0;
      base.style.left   = (touch.clientX - 55) + 'px';
      base.style.top    = (touch.clientY - 55) + 'px';
      base.style.bottom = 'auto';
      base.style.right  = 'auto';
    }
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const touch of e.changedTouches) {
    let joy, knob;
    if (joystickLeft.active  && touch.identifier === joystickLeft.touchId)  { joy = joystickLeft;  knob = leftKnob; }
    if (joystickRight.active && touch.identifier === joystickRight.touchId) { joy = joystickRight; knob = rightKnob; }
    if (!joy) continue;

    const dx = touch.clientX - joy.baseX;
    const dy = touch.clientY - joy.baseY;
    joy.x = Math.min(Math.max(dx / JOYSTICK_RADIUS, -1), 1);
    joy.y = Math.min(Math.max(dy / JOYSTICK_RADIUS, -1), 1);
    updateKnob(knob, joy.x, joy.y);
  }
}, { passive: false });

function resetJoystick(joy, knob, base, isLeft) {
  joy.active = false;
  joy.touchId = null;
  joy.x = 0;
  joy.y = 0;
  knob.style.transform = 'translate(0px, 0px)';
  base.style.left   = isLeft ? '30px' : 'auto';
  base.style.right  = isLeft ? 'auto' : '30px';
  base.style.top    = 'auto';
  base.style.bottom = '40px';
}

function handleTouchEnd(e) {
  for (const t of e.changedTouches) {
    if (joystickLeft.touchId  === t.identifier) resetJoystick(joystickLeft,  leftKnob,  leftBase,  true);
    if (joystickRight.touchId === t.identifier) resetJoystick(joystickRight, rightKnob, rightBase, false);
  }
  // Watchdog: Falls touchId nicht mehr in der aktiven Touch-Liste ist, trotzdem resetten.
  // Verhindert hängende Joysticks wenn ein touchend verpasst wurde (z.B. über Buttons).
  const activeIds = new Set(Array.from(e.touches).map(t => t.identifier));
  if (joystickLeft.active  && !activeIds.has(joystickLeft.touchId))  resetJoystick(joystickLeft,  leftKnob,  leftBase,  true);
  if (joystickRight.active && !activeIds.has(joystickRight.touchId)) resetJoystick(joystickRight, rightKnob, rightBase, false);
}

document.addEventListener('touchend',    handleTouchEnd, { passive: false });
document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// ── Kanone Cooldown ────────────────────────────────────────────────────────
const CANNON_COOLDOWN = 3000;
let cannonLastFired = -CANNON_COOLDOWN;
let shotCount = 0;
let cannonCooldownTimer = null;

const shootBtn = document.getElementById('shoot-btn');

function tryFireCannon() {
  const now = performance.now();
  if (now - cannonLastFired < CANNON_COOLDOWN) return;
  cannonLastFired = now;
  fireShell();
  startCannonCooldown();
}

function startCannonCooldown() {
  shootBtn.disabled = true;
  shootBtn.textContent = '⏳ 3s';
  let remaining = CANNON_COOLDOWN;
  const interval = setInterval(() => {
    remaining -= 100;
    if (remaining <= 0) {
      clearInterval(interval);
      shootBtn.disabled = false;
      shootBtn.innerHTML = '&#x1F534; Kanone';
    } else {
      shootBtn.textContent = `⏳ ${(remaining / 1000).toFixed(1)}s`;
    }
  }, 100);
}

shootBtn.addEventListener('click', () => { resumeAudio(); tryFireCannon(); });
shootBtn.addEventListener('touchstart', e => { e.preventDefault(); resumeAudio(); tryFireCannon(); }, { passive: false });

// ── MG ─────────────────────────────────────────────────────────────────────
const MG_COOLDOWN = 150;
let mgLastFired = 0;
let mgFiring = false;

const btnMG = document.getElementById('btn-mg');

btnMG.addEventListener('mousedown', () => { resumeAudio(); mgFiring = true; });
btnMG.addEventListener('mouseup', () => { mgFiring = false; });
btnMG.addEventListener('touchstart', e => { e.preventDefault(); resumeAudio(); mgFiring = true; }, { passive: false });
btnMG.addEventListener('touchend', e => { e.preventDefault(); mgFiring = false; }, { passive: false });

// ── Zielfernrohr ───────────────────────────────────────────────────────────
const scopeEl = document.getElementById('scope');
const btnScope = document.getElementById('btn-scope');
let scopeActive = false;

function toggleScope() {
  scopeActive = !scopeActive;
  if (scopeActive) {
    camera.fov = 15;
    camera.updateProjectionMatrix();
    scopeEl.style.display = 'block';
    btnScope.classList.add('active');
  } else {
    camera.fov = 60;
    camera.updateProjectionMatrix();
    scopeEl.style.display = 'none';
    btnScope.classList.remove('active');
  }
}

function updateScopeCamera() {
  // Zielkamera: Blick entlang der Kanonenlinie von hinten durch das Rohr
  const dir = new THREE.Vector3(0, -1, 0);
  dir.transformDirection(cannon.matrixWorld).normalize();

  const cannonCenter = new THREE.Vector3();
  cannon.getWorldPosition(cannonCenter);

  // Kameraposition: hinter dem Verschluss, leicht erhöht
  const camPos = cannonCenter.clone().addScaledVector(dir, -3);
  camPos.y += 0.2;
  camera.position.copy(camPos);

  // Blickziel: weit vor der Mündung entlang der Schussrichtung
  const lookTarget = cannonCenter.clone().addScaledVector(dir, 300);
  camera.lookAt(lookTarget);
}

btnScope.addEventListener('click', () => toggleScope());
btnScope.addEventListener('touchstart', e => { e.preventDefault(); toggleScope(); }, { passive: false });

// ── Gegner-System ──────────────────────────────────────────────────────────

const DIFFICULTY_CONFIGS = {
    einfach: [
        { type: 'leicht', hp: 50,  damage: 6,  speed: 0.03, accuracy: 0.9,  color: '#4CAF50', shootCooldown: 5.0 },
        { type: 'leicht', hp: 50,  damage: 6,  speed: 0.03, accuracy: 0.9,  color: '#4CAF50', shootCooldown: 5.0 },
        { type: 'leicht', hp: 50,  damage: 6,  speed: 0.03, accuracy: 0.9,  color: '#4CAF50', shootCooldown: 5.0 },
        { type: 'leicht', hp: 50,  damage: 6,  speed: 0.03, accuracy: 0.9,  color: '#4CAF50', shootCooldown: 5.0 },
        { type: 'mittel', hp: 80,  damage: 12, speed: 0.05, accuracy: 0.65, color: '#FFC107', shootCooldown: 3.5 },
    ],
    normal: [
        { type: 'leicht', hp: 50,  damage: 8,  speed: 0.04, accuracy: 0.7,  color: '#4CAF50', shootCooldown: 4.0 },
        { type: 'leicht', hp: 50,  damage: 8,  speed: 0.04, accuracy: 0.7,  color: '#4CAF50', shootCooldown: 4.0 },
        { type: 'mittel', hp: 100, damage: 20, speed: 0.07, accuracy: 0.5,  color: '#FFC107', shootCooldown: 2.5 },
        { type: 'mittel', hp: 100, damage: 20, speed: 0.07, accuracy: 0.5,  color: '#FFC107', shootCooldown: 2.5 },
        { type: 'schwer', hp: 150, damage: 35, speed: 0.10, accuracy: 0.25, color: '#F44336', shootCooldown: 1.5 },
    ],
    schwer: [
        { type: 'mittel', hp: 120, damage: 22, speed: 0.09, accuracy: 0.4,  color: '#FFC107', shootCooldown: 2.0 },
        { type: 'mittel', hp: 120, damage: 22, speed: 0.09, accuracy: 0.4,  color: '#FFC107', shootCooldown: 2.0 },
        { type: 'schwer', hp: 200, damage: 42, speed: 0.12, accuracy: 0.18, color: '#F44336', shootCooldown: 1.2 },
        { type: 'schwer', hp: 200, damage: 42, speed: 0.12, accuracy: 0.18, color: '#F44336', shootCooldown: 1.2 },
        { type: 'schwer', hp: 200, damage: 42, speed: 0.12, accuracy: 0.18, color: '#F44336', shootCooldown: 1.2 },
    ],
};

const enemies = [];

function buildEnemyTank(bodyColor) {
    const group = new THREE.Group();

    const corpusColor = new THREE.MeshLambertMaterial({ color: bodyColor });
    const corpus = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), corpusColor);
    corpus.position.y = 1.0;
    corpus.castShadow = true;
    group.add(corpus);

    const trackMat = new THREE.MeshLambertMaterial({ color: '#222222' });
    [-2.3, 2.3].forEach(xOff => {
        const tr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 6.2), trackMat);
        tr.position.set(xOff, 0.85, 0);
        tr.castShadow = true;
        group.add(tr);
    });

    const turretGroup = new THREE.Group();
    turretGroup.position.set(0, 1.3, 0);
    corpus.add(turretGroup);

    const darkerHex = parseInt(bodyColor.replace('#', ''), 16);
    const dr = Math.max(0, ((darkerHex >> 16) & 0xff) - 40);
    const dg = Math.max(0, ((darkerHex >> 8) & 0xff) - 40);
    const db = Math.max(0, (darkerHex & 0xff) - 40);
    const darkerColor = `#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`;

    const turretBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5),
        new THREE.MeshLambertMaterial({ color: darkerColor }));
    turretBox.castShadow = true;
    turretGroup.add(turretBox);

    const eCannon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
        new THREE.MeshLambertMaterial({ color: '#222' })
    );
    eCannon.rotation.x = Math.PI / 2;
    eCannon.position.set(0, 0, -2.5);
    turretGroup.add(eCannon);

    return { group, turretGroup };
}

function randomEnemyPosition(existingPositions) {
    const RANGE = 220;
    const MIN_FROM_PLAYER = 100;
    const MIN_FROM_EACH = 30;
    for (let attempt = 0; attempt < 5000; attempt++) {
        const x = -RANGE + Math.random() * RANGE * 2;
        const z = -RANGE + Math.random() * RANGE * 2;
        if (Math.sqrt(x * x + z * z) < MIN_FROM_PLAYER) continue;
        let tooClose = false;
        for (const p of existingPositions) {
            const dx = x - p.x;
            const dz = z - p.z;
            if (Math.sqrt(dx * dx + dz * dz) < MIN_FROM_EACH) { tooClose = true; break; }
        }
        if (!tooClose) return { x, z };
    }
    return { x: (Math.random() > 0.5 ? 1 : -1) * (100 + Math.random() * 120), z: 0 };
}

function createEnemyHPBar(enemy) {
    const bar = document.createElement('div');
    bar.style.cssText = `
        position: fixed;
        width: 50px;
        height: 6px;
        background: #333;
        border: 1px solid #000;
        pointer-events: none;
        z-index: 100;
        transform: translate(-50%, 0);
        display: none;
    `;
    const fill = document.createElement('div');
    fill.style.cssText = `
        height: 100%;
        background: #00ff00;
        width: 100%;
        transition: width 0.2s;
    `;
    bar.appendChild(fill);
    document.body.appendChild(bar);
    enemy.hpBar = bar;
    enemy.hpBarFill = fill;
}

function createEnemies(configs) {
    const spawnedPositions = [];
    configs.forEach(cfg => {
        const pos = randomEnemyPosition(spawnedPositions);
        spawnedPositions.push(pos);

        const { group, turretGroup } = buildEnemyTank(cfg.color);
        group.position.set(pos.x, 0, pos.z);
        scene.add(group);

        const enemy = {
            mesh: group,
            turret: turretGroup,
            hp: cfg.hp,
            maxHp: cfg.hp,
            damage: cfg.damage,
            speed: cfg.speed,
            accuracy: cfg.accuracy,
            type: cfg.type,
            shootCooldown: cfg.shootCooldown,
            shootTimer: Math.random() * cfg.shootCooldown,
            state: 'suchen',
            alive: true,
            strafeDir: 0,
            strafeCooldown: 0,
            hpBar: null,
            hpBarFill: null,
        };

        createEnemyHPBar(enemy);
        enemies.push(enemy);
    });
}

function updateEnemyCounter() {
    const alive = enemies.filter(e => e.alive).length;
    document.getElementById('enemies-left').textContent = alive;
}

function startGame(difficulty) {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('enemy-counter').style.display = 'block';

    createEnemies(DIFFICULTY_CONFIGS[difficulty]);

    const total = enemies.length;
    document.getElementById('enemies-left').textContent = total;
    document.getElementById('enemies-total').textContent = total;

    gamePaused = false;
}

['einfach', 'normal', 'schwer'].forEach(diff => {
    const btn = document.getElementById(`btn-diff-${diff}`);
    btn.addEventListener('click', () => { resumeAudio(); startGame(diff); });
    btn.addEventListener('touchend', e => { e.preventDefault(); resumeAudio(); startGame(diff); }, { passive: false });
});

function createWreck(position, type) {
    const wreckColor = new THREE.MeshLambertMaterial({ color: '#222' });

    const wBody = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 6), wreckColor);
    wBody.position.set(position.x, 0.4, position.z);
    wBody.rotation.y = Math.random() * Math.PI * 0.3;
    scene.add(wBody);

    const wTurret = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 2.5), wreckColor);
    wTurret.position.set(
        position.x + (Math.random() - 0.5) * 2,
        0.9,
        position.z + (Math.random() - 0.5) * 2
    );
    wTurret.rotation.y = Math.random() * Math.PI;
    wTurret.rotation.z = (Math.random() - 0.5) * 0.6;
    scene.add(wTurret);
}

function explodeEnemy(enemy) {
    const pos = enemy.mesh.position.clone();

    enemy.mesh.visible = false;
    createWreck(pos, enemy.type);

    const flashLight = new THREE.PointLight(0xff8800, 30, 50);
    flashLight.position.copy(pos).add(new THREE.Vector3(0, 2, 0));
    scene.add(flashLight);
    setTimeout(() => scene.remove(flashLight), 150);

    const colors = [0xff6600, 0xffaa00, 0xff3300, 0x111111];
    for (let i = 0; i < 18; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        spawnParticles(pos.clone().add(new THREE.Vector3(0, 1, 0)), 1, color, 10, 1.5, 9.8, 0.5);
    }
    spawnSmoke(pos.clone().add(new THREE.Vector3(0, 2, 0)), 12, 4.0);

    playSound('explosion_large');

    enemy.alive = false;
    enemy.state = 'tot';
    if (enemy.hpBar) enemy.hpBar.style.display = 'none';

    updateEnemyCounter();
    checkWinCondition();
}

function checkWinCondition() {
    if (enemies.length > 0 && enemies.every(e => !e.alive)) {
        gameOver('gewonnen');
    }
}

function fireEnemyShell(enemy) {
    const playerPos = new THREE.Vector3();
    tank.getWorldPosition(playerPos);

    const enemyPos = enemy.mesh.position.clone();
    const dir = new THREE.Vector3().subVectors(playerPos, enemyPos).normalize();

    dir.x += (Math.random() - 0.5) * enemy.accuracy;
    dir.z += (Math.random() - 0.5) * enemy.accuracy;
    dir.normalize();
    dir.y = 0.0;

    const muzzlePos = enemyPos.clone().add(new THREE.Vector3(0, 2, 0)).addScaledVector(dir, 3);

    const geo = new THREE.SphereGeometry(0.2, 6, 6);
    const mat = new THREE.MeshLambertMaterial({ color: '#ff4400' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(muzzlePos);
    scene.add(mesh);

    createMuzzleFlash(muzzlePos.clone());

    projectiles.push({
        mesh,
        velocity: dir.multiplyScalar(2.5),
        alive: true,
        distanceTravelled: 0,
        maxDistance: 300,
        damage: enemy.damage,
        isShell: true,
        isEnemyShot: true,
    });
}

function updateEnemyAI(enemy, dt) {
    if (!enemy.alive) return;

    const playerPos = new THREE.Vector3();
    tank.getWorldPosition(playerPos);

    const enemyPos = enemy.mesh.position.clone();
    const toPlayer = new THREE.Vector3().subVectors(playerPos, enemyPos);
    const dist = toPlayer.length();

    if (enemy.state === 'suchen') {
        if (dist < 120) {
            enemy.state = 'angreifen';
        } else {
            const dir = toPlayer.normalize();
            enemy.mesh.position.x += dir.x * enemy.speed;
            enemy.mesh.position.z += dir.z * enemy.speed;
            enemy.mesh.position.y = 0;
            enemy.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }
    } else if (enemy.state === 'angreifen') {
        if (dist > 150) {
            enemy.state = 'suchen';
        } else {
            // Zufällige Seitenbewegung
            enemy.strafeCooldown -= dt;
            if (enemy.strafeCooldown <= 0) {
                enemy.strafeDir = (Math.random() < 0.5) ? 1 : -1;
                if (Math.random() < 0.3) enemy.strafeDir = 0;
                enemy.strafeCooldown = 2.5 + Math.random() * 1.0;
            }

            if (enemy.strafeDir !== 0) {
                const rightVec = new THREE.Vector3(
                    toPlayer.normalize().z,
                    0,
                    -toPlayer.normalize().x
                );
                enemy.mesh.position.x += rightVec.x * enemy.speed * enemy.strafeDir;
                enemy.mesh.position.z += rightVec.z * enemy.speed * enemy.strafeDir;
                enemy.mesh.position.y = 0;
            }

            // Turm Richtung Spieler drehen
            const turretWorldPos = new THREE.Vector3();
            enemy.turret.getWorldPosition(turretWorldPos);
            const toPlayerFromTurret = new THREE.Vector3()
                .subVectors(playerPos, turretWorldPos)
                .normalize();
            const targetAngle = Math.atan2(toPlayerFromTurret.x, toPlayerFromTurret.z);
            const worldAngle = enemy.mesh.rotation.y;
            enemy.turret.rotation.y = targetAngle - worldAngle;

            // Schuss
            enemy.shootTimer -= dt;
            if (enemy.shootTimer <= 0) {
                enemy.shootTimer = enemy.shootCooldown;
                fireEnemyShell(enemy);
            }
        }
    }
}

function updateEnemyHPBars() {
    for (const enemy of enemies) {
        if (!enemy.alive || !enemy.hpBar) continue;

        const worldPos = enemy.mesh.position.clone();
        worldPos.y += 5;

        const projected = worldPos.clone().project(camera);

        if (projected.z > 1 || projected.z < -1) {
            enemy.hpBar.style.display = 'none';
            continue;
        }

        const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;

        enemy.hpBar.style.display = 'block';
        enemy.hpBar.style.left = sx + 'px';
        enemy.hpBar.style.top = sy + 'px';

        const pct = Math.max(0, enemy.hp / enemy.maxHp * 100);
        enemy.hpBarFill.style.width = pct + '%';
        enemy.hpBarFill.style.background =
            pct > 60 ? '#00ff00' : pct > 30 ? '#ffaa00' : '#ff2222';
    }
}

// ── Minimap ────────────────────────────────────────────────────────────────

const minimapCanvas = document.createElement('canvas');
minimapCanvas.id = 'minimap';
minimapCanvas.width = 120;
minimapCanvas.height = 120;
minimapCanvas.style.cssText = `
    position: fixed;
    bottom: 160px;
    left: 20px;
    width: 120px;
    height: 120px;
    background: rgba(0,0,0,0.5);
    border: 1px solid #666;
    border-radius: 4px;
    z-index: 50;
    pointer-events: none;
`;
document.body.appendChild(minimapCanvas);
const minimapCtx = minimapCanvas.getContext('2d');

function drawMinimap() {
    minimapCtx.clearRect(0, 0, 120, 120);

    // Koordinate world → map pixel (500 units = 120 px)
    function worldToMap(x, z) {
        return {
            px: (x / 500) * 120 + 60,
            py: (z / 500) * 120 + 60,
        };
    }

    // Tote Gegner: graue Punkte
    for (const e of enemies) {
        if (e.alive) continue;
        const { px, py } = worldToMap(e.mesh.position.x, e.mesh.position.z);
        minimapCtx.beginPath();
        minimapCtx.arc(px, py, 3, 0, Math.PI * 2);
        minimapCtx.fillStyle = '#666';
        minimapCtx.fill();
    }

    // Lebende Gegner: rote Punkte
    for (const e of enemies) {
        if (!e.alive) continue;
        const r = e.type === 'schwer' ? 5 : e.type === 'mittel' ? 4 : 3;
        const { px, py } = worldToMap(e.mesh.position.x, e.mesh.position.z);
        minimapCtx.beginPath();
        minimapCtx.arc(px, py, r, 0, Math.PI * 2);
        minimapCtx.fillStyle = '#ff3333';
        minimapCtx.fill();
    }

    // Spieler: weißes Dreieck in Fahrtrichtung
    const { px: spx, py: spy } = worldToMap(tank.position.x, tank.position.z);
    const angle = tank.rotation.y;
    minimapCtx.save();
    minimapCtx.translate(spx, spy);
    minimapCtx.rotate(-angle);
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, -6);
    minimapCtx.lineTo(4, 5);
    minimapCtx.lineTo(-4, 5);
    minimapCtx.closePath();
    minimapCtx.fillStyle = '#ffffff';
    minimapCtx.fill();
    minimapCtx.restore();
}

// ── Movement constants ─────────────────────────────────────────────────────
const speed     = 0.15;
const turnSpeed = 0.03;

// ── Animation Loop ─────────────────────────────────────────────────────────
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // Test-Hooks immer setzen (auch im Pausezustand)
  window.__testEnemyCount = enemies.length;
  window.__testPlayerHP = playerHP;
  window.__testPlayerGetHit = (dmg) => playerGetHit(dmg);
  window.__testTriggerGameOver = (result) => gameOver(result);
  window.__testCameraZ = camera.position.z;
  window.__testTankX = tank.position.x;
  window.__testTankZ = tank.position.z;
  window.__testJoystickLeft = { active: joystickLeft.active, x: joystickLeft.x, y: joystickLeft.y };
  const _cp = new THREE.Vector3();
  cannon.getWorldPosition(_cp);
  window.__testCannonWorldPos = { x: _cp.x, y: _cp.y, z: _cp.z };
  const _tp = new THREE.Vector3();
  tank.getWorldPosition(_tp);
  window.__testTankWorldPos = { x: _tp.x, y: _tp.y, z: _tp.z };
  const _cd = new THREE.Vector3(0, 1, 0);
  _cd.transformDirection(cannon.matrixWorld);
  window.__testCannonDir = { x: _cd.x, y: _cd.y, z: _cd.z };

  if (gamePaused) {
    renderer.render(scene, camera);
    return;
  }

  // 1. Input
  let moveY = 0;
  let rotY  = 0;
  let turretY = 0;

  if (keys['w'] || keys['arrowup'])    moveY += 1;
  if (keys['s'] || keys['arrowdown'])  moveY -= 1;
  if (keys['a'] || keys['arrowleft'])  rotY  += 1;
  if (keys['d'] || keys['arrowright']) rotY  -= 1;
  if (keys['q']) turretY += 1;
  if (keys['e']) turretY -= 1;

  if (joystickLeft.active) {
    moveY = -joystickLeft.y;
    rotY  = -joystickLeft.x;
  }
  if (joystickRight.active) {
    turretY = -joystickRight.x;
  }

  // MG auto-fire
  if (keys['f'] || mgFiring) {
    if (now - mgLastFired >= MG_COOLDOWN) {
      mgLastFired = now;
      fireMG();
    }
  }

  // 2. Panzer
  tank.translateZ(-speed * moveY);
  tank.rotateY(turnSpeed * rotY);
  tank.position.y = 0;

  // 3. Turm
  turret.rotateY(turnSpeed * turretY);

  // 4. Projektile
  updateProjectiles(dt);

  // 5. Partikel
  updateParticles(dt);
  updateSmoke(dt);
  updateFallingTrees(dt);

  // 6. HP-Balken Positionen (Dummy-Ziele)
  updateTargetHpPositions();

  // 6b. Gegner-KI
  for (const enemy of enemies) {
    updateEnemyAI(enemy, dt);
  }

  // 6c. Gegner HP-Balken
  updateEnemyHPBars();

  // 6d. Minimap
  drawMinimap();

  // 7. Kamera
  const tankPos = new THREE.Vector3();
  tank.getWorldPosition(tankPos);

  const behind = new THREE.Vector3(0, 8, 15);
  behind.applyQuaternion(tank.quaternion);
  camera.position.copy(tankPos).add(behind);
  camera.lookAt(tankPos.x, tankPos.y + 2, tankPos.z);

  // Scope überschreibt die Third-Person-Kamera
  if (scopeActive) updateScopeCamera();

  // 7b. Kamera-Wackeln
  if (_shakeTimer > 0) {
    _shakeTimer -= dt * 1000;
    camera.position.x += (Math.random() - 0.5) * _shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * _shakeIntensity;
    camera.position.z += (Math.random() - 0.5) * _shakeIntensity;
  }

  // 8. Rendern
  renderer.render(scene, camera);
}

animate();
