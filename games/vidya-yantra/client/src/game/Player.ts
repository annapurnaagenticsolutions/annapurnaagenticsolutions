// Rasa Engine design reminder: the apprentice is a clear indigo-and-saffron silhouette, with knowledge expressed as geometry.
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

// ---------------------------------------------------------------------------
// Shared NPC figure builder — exported so every world file can produce a
// procedural character with a face, arms, hands, and a held prop without
// duplicating geometry code.  Each world customises silhouette, eye colour,
// prop type, and posture through the options bag.
// ---------------------------------------------------------------------------

export type PropType = "staff" | "oar" | "mirror" | "lantern" | "instrument" | "ceremonial";
export type Posture = "upright" | "hunched" | "leaning" | "bent";

export type NpcFigureOptions = {
  scene: Scene;
  root: TransformNode;
  name: string;
  robeColor: Color3;
  robeHeight: number;
  robeDiameterTop: number;
  robeDiameterBottom: number;
  robeEmissive?: Color3;
  skinColor?: Color3;
  hairColor?: Color3;
  eyeColor: Color3;
  shawlColor?: Color3;
  shawlWidth?: number;
  propColor: Color3;
  propType?: PropType;
  propHeight?: number;
  propRotationZ?: number;
  posture?: Posture;
  braid?: boolean;
  reducedMotion?: () => boolean;
};

export type NpcFigure = {
  eyeMaterial: StandardMaterial;
  leftArm: TransformNode;
  rightArm: TransformNode;
  prop: Mesh;
  update: (delta: number, time: number) => void;
};

export function buildNpcFigure(opts: NpcFigureOptions): NpcFigure {
  const { scene, root, name } = opts;
  const skinColor = opts.skinColor ?? Color3.FromHexString("#8E5B3F");
  const hairColor = opts.hairColor ?? Color3.FromHexString("#231918");
  const robeEmissive = opts.robeEmissive ?? Color3.Black();
  const shawlColor = opts.shawlColor ?? Color3.FromHexString("#D7B77D");
  const shawlWidth = opts.shawlWidth ?? 0.68;
  const propType = opts.propType ?? "staff";
  const propHeight = opts.propHeight ?? 1.5;
  const propRotationZ = opts.propRotationZ ?? -0.18;
  const posture = opts.posture ?? "upright";
  const reducedMotion = opts.reducedMotion ?? (() => false);

  // Apply posture tilt to the root
  if (posture === "hunched") { root.rotation.x = 0.12; }
  else if (posture === "leaning") { root.rotation.x = 0.07; root.rotation.z = 0.04; }
  else if (posture === "bent") { root.rotation.x = 0.16; }

  const robeMat = new StandardMaterial(`${name}-robe-mat`, scene);
  robeMat.diffuseColor = opts.robeColor;
  robeMat.emissiveColor = robeEmissive;
  robeMat.specularColor = new Color3(0.04, 0.04, 0.04);

  const skinMat = new StandardMaterial(`${name}-skin-mat`, scene);
  skinMat.diffuseColor = skinColor;
  skinMat.specularColor = Color3.Black();

  const hairMat = new StandardMaterial(`${name}-hair-mat`, scene);
  hairMat.diffuseColor = hairColor;
  hairMat.specularColor = Color3.Black();

  const eyeMat = new StandardMaterial(`${name}-eye-mat`, scene);
  eyeMat.diffuseColor = Color3.Black();
  eyeMat.emissiveColor = opts.eyeColor.scale(0.45);
  eyeMat.specularColor = Color3.Black();

  const mouthMat = new StandardMaterial(`${name}-mouth-mat`, scene);
  mouthMat.diffuseColor = Color3.FromHexString("#3A2018");
  mouthMat.specularColor = Color3.Black();

  const shawlMat = new StandardMaterial(`${name}-shawl-mat`, scene);
  shawlMat.diffuseColor = shawlColor;
  shawlMat.emissiveColor = shawlColor.scale(0.08);
  shawlMat.specularColor = Color3.Black();

  const propMat = new StandardMaterial(`${name}-prop-mat`, scene);
  propMat.diffuseColor = opts.propColor;
  propMat.emissiveColor = opts.propColor.scale(0.06);
  propMat.specularColor = new Color3(0.12, 0.12, 0.12);

  // Robe — tessellation raised to 16
  const robe = MeshBuilder.CreateCylinder(`${name}-robe`, {
    height: opts.robeHeight,
    diameterTop: opts.robeDiameterTop,
    diameterBottom: opts.robeDiameterBottom,
    tessellation: 16,
  }, scene);
  robe.parent = root;
  robe.position.y = opts.robeHeight * 0.5;
  robe.material = robeMat;

  // Neck cylinder
  const neckHeight = 0.08;
  const neck = MeshBuilder.CreateCylinder(`${name}-neck`, {
    height: neckHeight,
    diameterTop: 0.16,
    diameterBottom: 0.18,
    tessellation: 12,
  }, scene);
  neck.parent = root;
  neck.position.y = opts.robeHeight + neckHeight * 0.5;
  neck.material = skinMat;

  // Head — segments raised to 16
  const headDiameter = 0.36;
  const headY = opts.robeHeight + neckHeight + headDiameter * 0.5;
  const head = MeshBuilder.CreateSphere(`${name}-head`, { diameter: headDiameter, segments: 16 }, scene);
  head.parent = root;
  head.position.y = headY;
  head.material = skinMat;

  // Hair
  const hair = MeshBuilder.CreateSphere(`${name}-hair`, { diameter: headDiameter + 0.01, segments: 12 }, scene);
  hair.parent = root;
  hair.position = new Vector3(0, headY + 0.02, -0.02);
  hair.scaling.y = 0.52;
  hair.material = hairMat;

  // Face — two emissive eye spheres + a thin mouth/brow line
  const eyeDiameter = 0.045;
  const eyeY = headY + 0.01;
  const eyeZ = headDiameter * 0.5 - 0.01;
  const eyeOffsetX = 0.07;
  const leftEye = MeshBuilder.CreateSphere(`${name}-eye-l`, { diameter: eyeDiameter, segments: 8 }, scene);
  leftEye.parent = root;
  leftEye.position = new Vector3(-eyeOffsetX, eyeY, eyeZ);
  leftEye.material = eyeMat;
  const rightEye = MeshBuilder.CreateSphere(`${name}-eye-r`, { diameter: eyeDiameter, segments: 8 }, scene);
  rightEye.parent = root;
  rightEye.position = new Vector3(eyeOffsetX, eyeY, eyeZ);
  rightEye.material = eyeMat;

  // Mouth / brow line — a thin dark box
  const mouth = MeshBuilder.CreateBox(`${name}-mouth`, { width: 0.1, height: 0.012, depth: 0.02 }, scene);
  mouth.parent = root;
  mouth.position = new Vector3(0, headY - 0.06, eyeZ);
  mouth.material = mouthMat;

  // Shawl / sash
  const shawl = MeshBuilder.CreateBox(`${name}-shawl`, { width: shawlWidth, height: 0.1, depth: 0.16 }, scene);
  shawl.parent = root;
  shawl.position = new Vector3(-0.1, opts.robeHeight - 0.12, 0.12);
  shawl.material = shawlMat;

  // Arms — two cylinders attached near the shoulders, with hand spheres
  const armLength = 0.32;
  const armDiameter = 0.07;
  const shoulderY = opts.robeHeight - 0.06;
  const shoulderOffsetX = opts.robeDiameterTop * 0.5 + 0.02;

  const leftArmRoot = new TransformNode(`${name}-arm-l-root`, scene);
  leftArmRoot.parent = root;
  leftArmRoot.position = new Vector3(-shoulderOffsetX, shoulderY, 0);
  const leftArmMesh = MeshBuilder.CreateCylinder(`${name}-arm-l`, { height: armLength, diameter: armDiameter, tessellation: 8 }, scene);
  leftArmMesh.parent = leftArmRoot;
  leftArmMesh.position.y = -armLength * 0.5;
  leftArmMesh.material = robeMat;
  const leftHand = MeshBuilder.CreateSphere(`${name}-hand-l`, { diameter: 0.07, segments: 8 }, scene);
  leftHand.parent = leftArmRoot;
  leftHand.position.y = -armLength;
  leftHand.material = skinMat;

  const rightArmRoot = new TransformNode(`${name}-arm-r-root`, scene);
  rightArmRoot.parent = root;
  rightArmRoot.position = new Vector3(shoulderOffsetX, shoulderY, 0);
  const rightArmMesh = MeshBuilder.CreateCylinder(`${name}-arm-r`, { height: armLength, diameter: armDiameter, tessellation: 8 }, scene);
  rightArmMesh.parent = rightArmRoot;
  rightArmMesh.position.y = -armLength * 0.5;
  rightArmMesh.material = robeMat;
  const rightHand = MeshBuilder.CreateSphere(`${name}-hand-r`, { diameter: 0.07, segments: 8 }, scene);
  rightHand.parent = rightArmRoot;
  rightHand.position.y = -armLength;
  rightHand.material = skinMat;

  // Prop (staff / oar / mirror / lantern / instrument / ceremonial)
  const prop = MeshBuilder.CreateCylinder(`${name}-prop`, { height: propHeight, diameter: 0.045, tessellation: 6 }, scene);
  prop.parent = root;
  prop.position = new Vector3(shoulderOffsetX + 0.02, propHeight * 0.5, 0.06);
  prop.rotation.z = propRotationZ;
  prop.material = propMat;

  // Position the right hand to grip the prop
  rightArmRoot.rotation.z = 0.35;
  rightHand.position.set(0.04, -armLength + 0.02, 0.04);

  // Prop-specific tip / accessory
  if (propType === "lantern") {
    const lanternBody = MeshBuilder.CreateSphere(`${name}-lantern-body`, { diameter: 0.12, segments: 10 }, scene);
    lanternBody.parent = prop;
    lanternBody.position.y = propHeight * 0.5;
    const lanternMat = new StandardMaterial(`${name}-lantern-mat`, scene);
    lanternMat.diffuseColor = Color3.FromHexString("#F2C63D");
    lanternMat.emissiveColor = Color3.FromHexString("#F2C63D").scale(0.5);
    lanternMat.specularColor = Color3.Black();
    lanternBody.material = lanternMat;
  } else if (propType === "mirror") {
    const mirrorDisc = MeshBuilder.CreateDisc(`${name}-mirror-disc`, { radius: 0.16, tessellation: 20 }, scene);
    mirrorDisc.parent = prop;
    mirrorDisc.position.y = propHeight * 0.5;
    mirrorDisc.rotation.x = Math.PI / 2;
    const mirrorMat = new StandardMaterial(`${name}-mirror-mat`, scene);
    mirrorMat.diffuseColor = Color3.FromHexString("#DEE4DF");
    mirrorMat.emissiveColor = Color3.FromHexString("#A8D7E8").scale(0.3);
    mirrorMat.specularColor = Color3.White();
    mirrorMat.alpha = 0.82;
    mirrorDisc.material = mirrorMat;
  } else if (propType === "instrument") {
    const instrumentHead = MeshBuilder.CreateBox(`${name}-instrument-head`, { width: 0.14, height: 0.1, depth: 0.06 }, scene);
    instrumentHead.parent = prop;
    instrumentHead.position.y = propHeight * 0.5;
    instrumentHead.material = propMat;
  } else if (propType === "ceremonial") {
    const ceremonialTop = MeshBuilder.CreateSphere(`${name}-ceremonial-top`, { diameter: 0.1, segments: 10 }, scene);
    ceremonialTop.parent = prop;
    ceremonialTop.position.y = propHeight * 0.5;
    const ceremonialMat = new StandardMaterial(`${name}-ceremonial-mat`, scene);
    ceremonialMat.diffuseColor = opts.propColor;
    ceremonialMat.emissiveColor = opts.propColor.scale(0.25);
    ceremonialMat.specularColor = new Color3(0.15, 0.15, 0.15);
    ceremonialTop.material = ceremonialMat;
  } else {
    // staff / oar — emissive tip
    const tip = MeshBuilder.CreateSphere(`${name}-prop-tip`, { diameter: 0.08, segments: 10 }, scene);
    tip.parent = prop;
    tip.position.y = propHeight * 0.5;
    const tipMat = new StandardMaterial(`${name}-prop-tip-mat`, scene);
    tipMat.diffuseColor = opts.propColor;
    tipMat.emissiveColor = opts.propColor.scale(0.3);
    tipMat.specularColor = Color3.Black();
    tip.material = tipMat;
  }

  // Optional braid detail
  if (opts.braid) {
    const braid = MeshBuilder.CreateCylinder(`${name}-braid`, { height: 0.3, diameter: 0.04, tessellation: 8 }, scene);
    braid.parent = root;
    braid.position = new Vector3(0, opts.robeHeight * 0.55, -opts.robeDiameterBottom * 0.4);
    braid.rotation.x = 0.15;
    braid.material = hairMat;
  }

  const phase = Math.random() * Math.PI * 2;

  const update = (delta: number, time: number) => {
    const calm = reducedMotion();
    // Eye pulse — subtle emissive glow tied to time
    const pulse = calm ? 0.2 : 0.3 + Math.sin(time * 2.5 + phase) * 0.15;
    eyeMat.emissiveColor = opts.eyeColor.scale(pulse);
    // Arm swing — subtle, calmed by reduced motion
    const swing = calm ? 0 : Math.sin(time * 3 + phase) * 0.08;
    leftArmRoot.rotation.x = swing;
    rightArmRoot.rotation.x = -swing;
  };

  return { eyeMaterial: eyeMat, leftArm: leftArmRoot, rightArm: rightArmRoot, prop, update };
}

// ---------------------------------------------------------------------------
// Billboard portrait helper — renders a small plane above an NPC that shows
// the 2D portrait from assets.ts, always facing the camera, fading in/out
// based on player proximity.
// ---------------------------------------------------------------------------

export type PortraitBillboard = {
  update: (playerPosition: Vector3, cameraPosition: Vector3) => void;
  dispose: () => void;
};

export function createPortraitBillboard(scene: Scene, root: TransformNode, portraitUrl: string, reducedMotion?: () => boolean): PortraitBillboard {
  const billboardRoot = new TransformNode(`${root.name}-portrait-bb`, scene);
  billboardRoot.parent = root;
  billboardRoot.position.y = 2.2;

  const plane = MeshBuilder.CreatePlane(`${root.name}-portrait-plane`, { width: 0.7, height: 0.7 }, scene);
  plane.parent = billboardRoot;
  plane.position.y = 0;

  const mat = new StandardMaterial(`${root.name}-portrait-mat`, scene);
  mat.diffuseColor = Color3.White();
  mat.emissiveColor = Color3.White();
  mat.specularColor = Color3.Black();
  mat.alpha = 0;
  mat.backFaceCulling = false;
  mat.diffuseTexture = new Texture(portraitUrl, scene);
  mat.emissiveTexture = mat.diffuseTexture;
  plane.material = mat;

  let currentAlpha = 0;

  const update = (playerPosition: Vector3, _cameraPosition: Vector3) => {
    // Face the camera — billboard behaviour
    const camera = scene.activeCamera;
    if (camera) {
      const dir = camera.position.subtract(billboardRoot.getAbsolutePosition());
      billboardRoot.rotation.y = Math.atan2(dir.x, dir.z);
    }
    // Fade based on distance
    const dist = Vector3.Distance(playerPosition, root.getAbsolutePosition());
    const targetAlpha = dist < 4.5 ? Math.max(0, 1 - (dist - 2.5) / 2) : 0;
    const calm = reducedMotion?.() ?? false;
    currentAlpha += (targetAlpha - currentAlpha) * (calm ? 0.05 : 0.12);
    mat.alpha = currentAlpha;
    plane.isVisible = currentAlpha > 0.01;
  };

  const dispose = () => { billboardRoot.dispose(false, true); };

  return { update, dispose };
}

// ---------------------------------------------------------------------------
// Player (Ila) — the apprentice character
// ---------------------------------------------------------------------------

export class Player {
  readonly root: TransformNode;
  private robe: Mesh;
  private scarf: Mesh;
  private sash: Mesh;
  private staff: Mesh;
  private compass: Mesh;
  private compassMaterial: StandardMaterial;
  private eyeMaterial: StandardMaterial;
  private leftArm: TransformNode;
  private rightArm: TransformNode;
  private velocity = Vector3.Zero();
  private time = 0;
  // When reducedMotion is enabled the apprentice stops bobbing and the
  // scarf/sash/staff/robe settle to a near-still pose; movement itself is
  // unaffected so the figure still walks and turns normally.
  private reducedMotion: () => boolean = () => false;

  constructor(private scene: Scene, position: Vector3, reducedMotion?: () => boolean) {
    if (reducedMotion) this.reducedMotion = reducedMotion;
    this.root = new TransformNode("apprentice-root", scene);
    this.root.position.copyFrom(position);

    const robeMaterial = new StandardMaterial("robe-material", scene);
    robeMaterial.diffuseColor = Color3.FromHexString("#24365E");
    robeMaterial.specularColor = new Color3(0.04, 0.04, 0.04);
    // Subtle rim-light emissive for the indigo robe
    robeMaterial.emissiveColor = Color3.FromHexString("#24365E").scale(0.05);

    const skinMaterial = new StandardMaterial("skin-material", scene);
    skinMaterial.diffuseColor = Color3.FromHexString("#8E5B3F");
    skinMaterial.specularColor = Color3.Black();

    const saffronMaterial = new StandardMaterial("saffron-scarf", scene);
    saffronMaterial.diffuseColor = Color3.FromHexString("#F26B38");
    // Saffron scarf glows a bit more — it should read as warm cloth
    saffronMaterial.emissiveColor = Color3.FromHexString("#F26B38").scale(0.18);

    const copperMaterial = new StandardMaterial("player-copper", scene);
    copperMaterial.diffuseColor = Color3.FromHexString("#B66A35");
    copperMaterial.emissiveColor = Color3.FromHexString("#201006");
    copperMaterial.specularColor = new Color3(0.12, 0.12, 0.12);

    // Robe — tessellation raised from 10 to 16
    this.robe = MeshBuilder.CreateCylinder("apprentice-robe", { height: 1.12, diameterTop: 0.48, diameterBottom: 0.82, tessellation: 16 }, scene);
    this.robe.parent = this.root;
    this.robe.position.y = 0.71;
    this.robe.material = robeMaterial;

    // Neck cylinder between head and robe
    const neck = MeshBuilder.CreateCylinder("apprentice-neck", { height: 0.08, diameterTop: 0.14, diameterBottom: 0.16, tessellation: 12 }, scene);
    neck.parent = this.root;
    neck.position.y = 1.31;
    neck.material = skinMaterial;

    // Head — segments raised from 12 to 16
    const head = MeshBuilder.CreateSphere("apprentice-head", { diameter: 0.42, segments: 16 }, scene);
    head.parent = this.root;
    head.position.y = 1.48;
    head.material = skinMaterial;

    // Face — two emissive eye spheres
    this.eyeMaterial = new StandardMaterial("apprentice-eye-mat", scene);
    this.eyeMaterial.diffuseColor = Color3.Black();
    this.eyeMaterial.emissiveColor = Color3.FromHexString("#A8D7E8").scale(0.4);
    this.eyeMaterial.specularColor = Color3.Black();
    const eyeDiameter = 0.05;
    const eyeY = 1.49;
    const eyeZ = 0.19;
    const eyeOffsetX = 0.08;
    const leftEye = MeshBuilder.CreateSphere("apprentice-eye-l", { diameter: eyeDiameter, segments: 8 }, scene);
    leftEye.parent = this.root;
    leftEye.position = new Vector3(-eyeOffsetX, eyeY, eyeZ);
    leftEye.material = this.eyeMaterial;
    const rightEye = MeshBuilder.CreateSphere("apprentice-eye-r", { diameter: eyeDiameter, segments: 8 }, scene);
    rightEye.parent = this.root;
    rightEye.position = new Vector3(eyeOffsetX, eyeY, eyeZ);
    rightEye.material = this.eyeMaterial;

    // Mouth / brow line — thin dark box
    const mouthMat = new StandardMaterial("apprentice-mouth-mat", scene);
    mouthMat.diffuseColor = Color3.FromHexString("#3A2018");
    mouthMat.specularColor = Color3.Black();
    const mouth = MeshBuilder.CreateBox("apprentice-mouth", { width: 0.12, height: 0.014, depth: 0.02 }, scene);
    mouth.parent = this.root;
    mouth.position = new Vector3(0, 1.42, eyeZ);
    mouth.material = mouthMat;

    const hair = MeshBuilder.CreateSphere("apprentice-hair", { diameter: 0.43, segments: 12 }, scene);
    hair.parent = this.root;
    hair.position = new Vector3(0, 1.61, -0.025);
    hair.scaling.y = 0.48;
    const hairMaterial = new StandardMaterial("apprentice-hair-mat", scene);
    hairMaterial.diffuseColor = Color3.FromHexString("#1C1516");
    hairMaterial.specularColor = Color3.Black();
    hair.material = hairMaterial;

    this.scarf = MeshBuilder.CreateBox("apprentice-scarf", { width: 0.72, height: 0.11, depth: 0.18 }, scene);
    this.scarf.parent = this.root;
    this.scarf.position = new Vector3(-0.16, 1.14, 0.18);
    this.scarf.material = saffronMaterial;

    this.sash = MeshBuilder.CreateBox("apprentice-parchment-sash", { width: 0.12, height: 0.72, depth: 0.08 }, scene);
    this.sash.parent = this.root;
    this.sash.position = new Vector3(-0.3, 0.78, -0.22);
    const sashMaterial = new StandardMaterial("apprentice-sash-mat", scene);
    sashMaterial.diffuseColor = Color3.FromHexString("#D7B77D");
    sashMaterial.specularColor = Color3.Black();
    this.sash.material = sashMaterial;

    const belt = MeshBuilder.CreateTorus("apprentice-jade-belt", { diameter: 0.58, thickness: 0.045, tessellation: 18 }, scene);
    belt.parent = this.root;
    belt.position.y = 0.98;
    belt.rotation.x = Math.PI / 2;
    const beltMaterial = new StandardMaterial("apprentice-belt-mat", scene);
    beltMaterial.diffuseColor = Color3.FromHexString("#3A7968");
    beltMaterial.emissiveColor = Color3.FromHexString("#09271F");
    belt.material = beltMaterial;

    // Arms — upper arm cylinders + hand spheres
    const armLength = 0.34;
    const armDiameter = 0.075;
    const shoulderY = 1.06;
    const shoulderOffsetX = 0.27;

    this.leftArm = new TransformNode("apprentice-arm-l-root", scene);
    this.leftArm.parent = this.root;
    this.leftArm.position = new Vector3(-shoulderOffsetX, shoulderY, 0);
    const leftArmMesh = MeshBuilder.CreateCylinder("apprentice-arm-l", { height: armLength, diameter: armDiameter, tessellation: 8 }, scene);
    leftArmMesh.parent = this.leftArm;
    leftArmMesh.position.y = -armLength * 0.5;
    leftArmMesh.material = robeMaterial;
    const leftHand = MeshBuilder.CreateSphere("apprentice-hand-l", { diameter: 0.08, segments: 8 }, scene);
    leftHand.parent = this.leftArm;
    leftHand.position.y = -armLength;
    leftHand.material = skinMaterial;

    this.rightArm = new TransformNode("apprentice-arm-r-root", scene);
    this.rightArm.parent = this.root;
    this.rightArm.position = new Vector3(shoulderOffsetX, shoulderY, 0);
    const rightArmMesh = MeshBuilder.CreateCylinder("apprentice-arm-r", { height: armLength, diameter: armDiameter, tessellation: 8 }, scene);
    rightArmMesh.parent = this.rightArm;
    rightArmMesh.position.y = -armLength * 0.5;
    rightArmMesh.material = robeMaterial;
    const rightHand = MeshBuilder.CreateSphere("apprentice-hand-r", { diameter: 0.08, segments: 8 }, scene);
    rightHand.parent = this.rightArm;
    rightHand.position.y = -armLength;
    rightHand.material = skinMaterial;

    this.staff = MeshBuilder.CreateCylinder("apprentice-staff", { height: 1.32, diameter: 0.055, tessellation: 6 }, scene);
    this.staff.parent = this.root;
    this.staff.position = new Vector3(0.34, 0.73, 0.1);
    this.staff.rotation.z = -0.25;
    this.staff.material = copperMaterial;
    // Position right hand to grip the staff
    this.rightArm.rotation.z = 0.3;
    rightHand.position.set(0.04, -armLength + 0.02, 0.04);

    // Staff tip — more emissive
    const staffTip = MeshBuilder.CreateSphere("apprentice-staff-tip", { diameter: 0.14, segments: 10 }, scene);
    staffTip.parent = this.staff;
    staffTip.position.y = 0.67;
    const staffTipMat = new StandardMaterial("apprentice-staff-tip-mat", scene);
    staffTipMat.diffuseColor = Color3.FromHexString("#F26B38");
    staffTipMat.emissiveColor = Color3.FromHexString("#F26B38").scale(0.5);
    staffTipMat.specularColor = Color3.Black();
    staffTip.material = staffTipMat;

    this.compass = MeshBuilder.CreateTorus("apprentice-compass", { diameter: 0.32, thickness: 0.05, tessellation: 16 }, scene);
    this.compass.parent = this.root;
    this.compass.position = new Vector3(0.37, 0.42, -0.1);
    this.compass.rotation.x = Math.PI / 2;
    this.compassMaterial = copperMaterial;
    this.compass.material = this.compassMaterial;
  }

  move(direction: Vector3, delta: number, speed = 4.8) {
    const targetVelocity = direction.scale(speed);
    this.velocity = Vector3.Lerp(this.velocity, targetVelocity, Math.min(1, delta * 11));
    this.root.position.addInPlace(this.velocity.scale(delta));
    const distance = Math.hypot(this.root.position.x, this.root.position.z);
    if (distance > 10.4) {
      this.root.position.scaleInPlace(10.4 / distance);
    }
    if (direction.lengthSquared() > 0.001) {
      this.root.rotation.y = Math.atan2(direction.x, direction.z);
    }
  }

  update(delta: number) {
    const calm = this.reducedMotion();
    this.time += calm ? delta * 0.15 : delta;
    const moving = this.velocity.lengthSquared() > 0.12;
    this.root.position.y = calm ? 0.045 : moving ? 0.045 + Math.sin(this.time * 10) * 0.035 : 0.045 + Math.sin(this.time * 2.2) * 0.015;
    this.scarf.rotation.y = calm ? 0 : Math.sin(this.time * 5.2) * 0.22;
    this.sash.rotation.z = calm ? 0 : Math.sin(this.time * (moving ? 8 : 2.4)) * (moving ? 0.14 : 0.045);
    this.staff.rotation.z = calm ? -0.25 : -0.25 + Math.sin(this.time * (moving ? 8 : 1.7)) * (moving ? 0.11 : 0.025);
    this.robe.scaling.y = calm ? 1 : 1 + Math.sin(this.time * (moving ? 10 : 2.2)) * (moving ? 0.025 : 0.008);
    this.compass.rotation.z += calm ? delta * 0.25 : delta * 1.8;
    const compassGlow = calm ? 0.05 : 0.04 + (Math.sin(this.time * 3.5) + 1) * 0.035;
    this.compassMaterial.emissiveColor = Color3.FromHexString("#B66A35").scale(compassGlow);
    // Eye emissive pulse — subtle, tied to the shared time clock
    const eyePulse = calm ? 0.25 : 0.3 + (Math.sin(this.time * 3) + 1) * 0.1;
    this.eyeMaterial.emissiveColor = Color3.FromHexString("#A8D7E8").scale(eyePulse);
    // Arm swing — subtle, tied to walk cycle
    const armSwing = calm ? 0 : Math.sin(this.time * (moving ? 10 : 2.2)) * (moving ? 0.12 : 0.03);
    this.leftArm.rotation.x = armSwing;
    this.rightArm.rotation.x = -armSwing * 0.5; // right arm holds staff, swings less
  }

  isMoving() { return this.velocity.lengthSquared() > 0.12; }
  getForward() { return new Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y)); }

  dispose() {
    this.root.dispose(false, true);
  }
}
