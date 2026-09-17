// Ashram-first design reminder: a warm, inhabited learning settlement is the true opening; the Rasa Engine is an earned future chapter.
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { HudBridge, type TraitKey } from "./HudBridge";
import { InputManager } from "./InputManager";
import { Player, buildNpcFigure, createPortraitBillboard, type NpcFigure, type PortraitBillboard } from "./Player";
import { SoundFeedback } from "./SoundFeedback";
import { CinematicCamera } from "./CinematicCamera";
import { AmbientLife } from "./AmbientLife";
import { assets } from "./assets";
import type { JourneyContext } from "./scene";

type Lesson = { root: TransformNode; completed: boolean; phase: number; title: string; discipline: string };
type TrainingDummy = { root: TransformNode; body: Mesh; sway: number };
type PulseWave = { mesh: Mesh; motes: Mesh[]; age: number };
type EvidenceMarker = { root: TransformNode; core: Mesh; compared: boolean; line: string };
type PracticeAnchor = { root: TransformNode; core: Mesh; held: boolean; progress: number; phase: number };
type QuestStage = "learn" | "converse" | "prepared";

const saffron = Color3.FromHexString("#F26B38");
const indigo = Color3.FromHexString("#202A52");
const parchment = Color3.FromHexString("#D7B77D");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const star = Color3.FromHexString("#A8D7E8");

export class GameWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private lessons: Lesson[] = [];
  private dummies: TrainingDummy[] = [];
  private pulses: PulseWave[] = [];
  private seasonRings: Mesh[] = [];
  private rishiRoot: TransformNode;
  private guideRoots: { root: TransformNode; phase: number }[] = [];
  private guideFigures: NpcFigure[] = [];
  private guideBillboards: PortraitBillboard[] = [];
  private muniRoot!: TransformNode;
  private evidenceMarkers: EvidenceMarker[] = [];
  private practiceAnchors: PracticeAnchor[] = [];
  private stage: QuestStage = "learn";
  private completed = 0;
  private pulseCooldown = 0;
  private time = 0;
  private demoStage = 0;
  private demoPause = 0;
  private traitValues = { viveka: 48, sahas: 36, karuna: 42 };
  private seasonIndex = 0;
  private dayPhase = 0;
  private lastPulseReady = true;
  private evidenceCompared = 0;
  private practiceActive = false;
  private practiceStability = 100;
  private practiceWindow = 0;
  private readonly seasonalMoods = [
    { name: "Vasanta · renewal", note: "New leaf and open study circles." },
    { name: "Grishma · high sun", note: "Heat makes water and shelter part of every route." },
    { name: "Varsha · monsoon", note: "Rain reveals channels, reflections, and the next observatory path." },
    { name: "Sharad · clear sky", note: "Clear air brings long horizons and better star readings." },
    { name: "Hemanta · golden calm", note: "The fields turn quiet; a patient traveler notices more." },
    { name: "Shishira · cool mist", note: "Mist softens the trail and rewards careful listening." },
  ];
  private readonly dayPhases = [
    { name: "Dawn study", tint: new Color3(0.08, 0.14, 0.31) },
    { name: "Sunlit practice", tint: new Color3(0.16, 0.22, 0.37) },
    { name: "Amber reflection", tint: new Color3(0.12, 0.10, 0.23) },
    { name: "Night observation", tint: new Color3(0.025, 0.04, 0.12) },
  ];

  private newPlus = false;

  constructor(
    private scene: Scene,
    private camera: ArcRotateCamera,
    private hud: HudBridge,
    private demo: boolean,
    private context?: JourneyContext,
  ) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.rishiRoot = new TransformNode("rishi-anchor", scene);
    this.createAshram();
    this.ambient = new AmbientLife(scene, "ashram", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-7.1, 0, 5.3), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "ashram", () => this.hud.reducedMotion);
    this.createLessonCircles();
    this.createGuides();
    this.createTrainingDummies();
    this.createSeasonWheel();
    this.createFieldworkInstruments();
    this.hud.patch({
      chapter: "Chapter I · Ashraya Vana",
      questTitle: "The First Measure",
      questDetail: this.newPlus ? "New Journey+ · hidden markers: the study circles glow faintly. Explore the Ashram to find each lesson." : "Visit the four study circles. Let each lesson shape how you travel.",
      glyphGoal: 4,
      season: "Vasanta · renewal",
      timeOfDay: "Dawn study",
      demo,
      notice: demo ? "Demonstration path engaged: study circles, practice pulse, and Rishi dialogue." : this.newPlus ? "Rishi Aruna: A returning traveler should find the circles by memory, not by their glow. New Journey+ · hidden markers active." : "Rishi Aruna: At Ashraya Vana, learning begins by noticing what is already here.",
    });
  }

  private material(name: string, color: Color3, emissive?: Color3, alpha = 1) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.emissiveColor = emissive ?? Color3.Black();
    material.specularColor = Color3.Black();
    material.alpha = alpha;
    return material;
  }

  private createAshram() {
    const ground = MeshBuilder.CreateCylinder("ashram-earth", { diameter: 25, height: 0.26, tessellation: 64 }, this.scene);
    ground.position.y = -0.14;
    ground.material = this.material("ashram-earth-mat", Color3.FromHexString("#6A4832"));

    const court = MeshBuilder.CreateCylinder("ashram-courtyard", { diameter: 22.4, height: 0.055, tessellation: 64 }, this.scene);
    court.position.y = 0.02;
    court.material = this.material("ashram-courtyard-mat", Color3.FromHexString("#9A704A"));

    const pathMaterial = this.material("ashram-path-mat", parchment, Color3.FromHexString("#28180E"));
    const pathA = MeshBuilder.CreateBox("ashram-path-a", { width: 0.84, height: 0.05, depth: 15.5 }, this.scene);
    pathA.position = new Vector3(-0.3, 0.08, 0.5);
    pathA.rotation.y = -0.59;
    pathA.material = pathMaterial;
    const pathB = pathA.clone("ashram-path-b");
    pathB.position = new Vector3(2.0, 0.08, 1.65);
    pathB.rotation.y = 0.81;

    const waterMaterial = this.material("ashram-rill-mat", Color3.FromHexString("#3B7D91"), Color3.FromHexString("#10354A"), 0.85);
    const rill = MeshBuilder.CreateBox("ashram-rill", { width: 0.32, height: 0.035, depth: 15.3 }, this.scene);
    rill.position = new Vector3(4.5, 0.08, 0.4);
    rill.rotation.y = 0.42;
    rill.material = waterMaterial;

    const sky = MeshBuilder.CreatePlane("ashram-sky", { width: 34, height: 18 }, this.scene);
    sky.position = new Vector3(0, 7.2, 15.6);
    sky.material = this.material("ashram-sky-mat", Color3.FromHexString("#24355D"), Color3.FromHexString("#111A36"));
    const hillMaterial = this.material("ashram-hill-mat", Color3.FromHexString("#3B5947"), Color3.FromHexString("#122317"));
    [-5.2, -2.5, 0.5, 3.4, 6.4].forEach((x, index) => {
      const hill = MeshBuilder.CreateSphere(`ashram-hill-${index}`, { diameterX: 4.8, diameterY: 2.5 + (index % 2), diameterZ: 1.3, segments: 12 }, this.scene);
      hill.position = new Vector3(x, 1 + (index % 2) * 0.25, 13.7 + (index % 3) * 0.3);
      hill.material = hillMaterial;
    });

    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      const radius = 9.6 + (index % 3) * 0.35;
      const tree = new TransformNode(`ashram-tree-${index}`, this.scene);
      tree.position = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const trunk = MeshBuilder.CreateCylinder(`ashram-trunk-${index}`, { height: 1.35 + (index % 2) * 0.45, diameter: 0.16, tessellation: 6 }, this.scene);
      trunk.parent = tree;
      trunk.position.y = 0.7;
      trunk.material = this.material(`ashram-trunk-mat-${index}`, Color3.FromHexString("#5B3826"));
      const canopy = MeshBuilder.CreateSphere(`ashram-canopy-${index}`, { diameter: 1.25 + (index % 3) * 0.18, segments: 10 }, this.scene);
      canopy.parent = tree;
      canopy.position.y = 1.8 + (index % 2) * 0.25;
      canopy.material = this.material(`ashram-canopy-mat-${index}`, index % 4 === 0 ? Color3.FromHexString("#557454") : Color3.FromHexString("#3C6B50"));
    }

    this.createHut("herbal-hut", new Vector3(6.7, 0, 4.9), 1.2);
    this.createHut("study-hut", new Vector3(-3.8, 0, 6.8), 1.0);
  }

  private createHut(name: string, position: Vector3, scale: number) {
    const root = new TransformNode(name, this.scene);
    root.position.copyFrom(position);
    const wall = MeshBuilder.CreateCylinder(`${name}-wall`, { height: 1.35 * scale, diameter: 1.75 * scale, tessellation: 10 }, this.scene);
    wall.parent = root;
    wall.position.y = 0.67 * scale;
    wall.material = this.material(`${name}-wall-mat`, Color3.FromHexString("#8B6243"));
    const roof = MeshBuilder.CreateCylinder(`${name}-roof`, { height: 0.8 * scale, diameterTop: 0, diameterBottom: 2.1 * scale, tessellation: 10 }, this.scene);
    roof.parent = root;
    roof.position.y = 1.65 * scale;
    roof.material = this.material(`${name}-roof-mat`, Color3.FromHexString("#33465A"));
  }

  private createLessonCircles() {
    const lessons = [
      { title: "Shastra", discipline: "Read the pattern", position: new Vector3(-5.6, 0.25, -1.9), color: star },
      { title: "Astra", discipline: "Practice with care", position: new Vector3(0.8, 0.25, -4.2), color: saffron },
      { title: "Prana", discipline: "Balance breath and movement", position: new Vector3(5.2, 0.25, -0.9), color: jade },
      { title: "Seva", discipline: "Restore what serves everyone", position: new Vector3(-1.9, 0.25, 5.15), color: copper },
    ];
    lessons.forEach((lesson, index) => {
      const root = new TransformNode(`lesson-${lesson.title.toLowerCase()}`, this.scene);
      root.position.copyFrom(lesson.position);
      const circle = MeshBuilder.CreateTorus(`${lesson.title}-circle`, { diameter: 2.0, thickness: 0.045, tessellation: 32 }, this.scene);
      circle.parent = root;
      circle.rotation.x = Math.PI / 2;
      circle.material = this.material(`${lesson.title}-circle-mat`, lesson.color, this.newPlus ? Color3.Black() : lesson.color.scale(0.15));
      const plinth = MeshBuilder.CreateCylinder(`${lesson.title}-plinth`, { height: 0.24, diameter: 0.68, tessellation: 8 }, this.scene);
      plinth.parent = root;
      plinth.position.y = 0.12;
      plinth.material = this.material(`${lesson.title}-plinth-mat`, Color3.FromHexString("#4F382B"));
      const marker = MeshBuilder.CreateSphere(`${lesson.title}-marker`, { diameter: 0.5, segments: 4 }, this.scene);
      marker.parent = root;
      marker.position.y = 0.7;
      marker.material = this.material(`${lesson.title}-marker-mat`, lesson.color, this.newPlus ? lesson.color.scale(0.08) : lesson.color);
      if (lesson.title === "Shastra") {
        const desk = MeshBuilder.CreateBox("shastra-desk", { width: 1.15, height: 0.12, depth: 0.7 }, this.scene);
        desk.parent = root;
        desk.position = new Vector3(-0.86, 0.54, 0);
        desk.material = this.material("shastra-desk-mat", Color3.FromHexString("#6B4430"));
      }
      if (lesson.title === "Astra") {
        for (const x of [-0.72, 0.72]) {
          const staff = MeshBuilder.CreateCylinder(`astra-staff-${x}`, { height: 1.65, diameter: 0.065, tessellation: 6 }, this.scene);
          staff.parent = root;
          staff.position = new Vector3(x, 0.82, 0);
          staff.material = this.material(`astra-staff-mat-${x}`, Color3.FromHexString("#684327"));
        }
      }
      if (lesson.title === "Prana") {
        const wind = MeshBuilder.CreateTorus("prana-wind", { diameter: 0.95, thickness: 0.055, tessellation: 24 }, this.scene);
        wind.parent = root;
        wind.position.y = 0.62;
        wind.rotation.x = Math.PI / 2.6;
        wind.material = this.material("prana-wind-mat", jade, jade);
      }
      if (lesson.title === "Seva") {
        const basin = MeshBuilder.CreateCylinder("seva-basin", { height: 0.32, diameter: 1.05, tessellation: 16 }, this.scene);
        basin.parent = root;
        basin.position.y = 0.28;
        basin.material = this.material("seva-basin-mat", Color3.FromHexString("#3F7080"), Color3.FromHexString("#122F3B"));
      }
      this.lessons.push({ root, completed: false, phase: index * 1.8, title: lesson.title, discipline: lesson.discipline });
    });
  }

  private createGuides() {
    this.rishiRoot.position = new Vector3(-7.5, 0, 0.7);
    this.createGuide("rishi-aruna", this.rishiRoot, Color3.FromHexString("#E9D6AD"), "pavilion");
    this.muniRoot = new TransformNode("muni-laya-root", this.scene);
    this.muniRoot.position = new Vector3(2.4, 0, 6.2);
    this.createGuide("muni-laya", this.muniRoot, jade, "plinth");
    const terraceRoot = new TransformNode("raja-somavrat-root", this.scene);
    terraceRoot.position = new Vector3(7.7, 0, 5.1);
    this.createGuide("raja-somavrat", terraceRoot, Color3.FromHexString("#6C3D33"), "terrace");
  }

  private createGuide(name: string, root: TransformNode, robeColor: Color3, form: "pavilion" | "plinth" | "terrace") {
    const stone = this.material(`${name}-stone`, Color3.FromHexString("#876345"));
    const isRishi = name === "rishi-aruna";
    const isMuni = name === "muni-laya";
    const isRaja = name === "raja-somavrat";

    // Use a sub-node so the terrace offset does not move the terrace box.
    const figureRoot = new TransformNode(`${name}-figure`, this.scene);
    figureRoot.parent = root;
    if (form === "terrace") figureRoot.position.y = 0.32;

    const figure = buildNpcFigure({
      scene: this.scene,
      root: figureRoot,
      name,
      robeColor,
      robeHeight: isRishi ? 1.5 : isMuni ? 1.0 : 1.42,
      robeDiameterTop: isRishi ? 0.38 : isMuni ? 0.52 : 0.62,
      robeDiameterBottom: isRishi ? 0.72 : isMuni ? 0.95 : 0.82,
      robeEmissive: robeColor.scale(0.05),
      eyeColor: isRishi ? Color3.FromHexString("#F2C63D") : isMuni ? jade : copper,
      shawlColor: form === "plinth" ? jade : form === "terrace" ? saffron : parchment,
      shawlWidth: isRishi ? 0.82 : isMuni ? 0.78 : 0.72,
      propColor: form === "pavilion" ? parchment : form === "plinth" ? jade : copper,
      propType: "staff",
      propHeight: 1.45,
      propRotationZ: form === "pavilion" ? -0.3 : form === "plinth" ? 0.16 : -0.12,
      reducedMotion: () => this.hud.reducedMotion,
    });
    this.guideFigures.push(figure);

    // Billboard portrait — shows the 2D portrait when the player approaches.
    const portraitUrl = isRishi ? assets.arunaPortrait : isMuni ? assets.layaPortrait : assets.somavratPortrait;
    this.guideBillboards.push(createPortraitBillboard(this.scene, figureRoot, portraitUrl, () => this.hud.reducedMotion));

    this.guideRoots.push({ root, phase: this.guideRoots.length * 1.7 });
    if (form === "pavilion") {
      [-1, 1].forEach((x) => {
        const post = MeshBuilder.CreateCylinder(`${name}-post-${x}`, { height: 2.5, diameter: 0.1, tessellation: 6 }, this.scene);
        post.parent = root;
        post.position = new Vector3(x, 1.25, 0);
        post.material = stone;
      });
      const roof = MeshBuilder.CreateBox(`${name}-roof`, { width: 2.65, height: 0.15, depth: 1.25 }, this.scene);
      roof.parent = root;
      roof.position.y = 2.43;
      roof.material = this.material(`${name}-roof-mat`, indigo);
    }
    if (form === "plinth") {
      const plinth = MeshBuilder.CreateCylinder(`${name}-plinth`, { height: 0.42, diameter: 1.75, tessellation: 10 }, this.scene);
      plinth.parent = root;
      plinth.position.y = 0.21;
      plinth.material = stone;
    }
    if (form === "terrace") {
      const terrace = MeshBuilder.CreateBox(`${name}-terrace`, { width: 3.1, height: 0.7, depth: 2.1 }, this.scene);
      terrace.parent = root;
      terrace.position = new Vector3(0, 0.35, 0.35);
      terrace.material = stone;
    }
  }

  private createTrainingDummies() {
    [new Vector3(2.3, 0, -4.3), new Vector3(3.45, 0, -4.65)].forEach((position, index) => {
      const root = new TransformNode(`training-dummy-${index}`, this.scene);
      root.position.copyFrom(position);
      const body = MeshBuilder.CreateCylinder(`training-body-${index}`, { height: 1.28, diameter: 0.28, tessellation: 8 }, this.scene);
      body.parent = root;
      body.position.y = 0.64;
      body.material = this.material(`training-body-mat-${index}`, Color3.FromHexString("#654228"));
      const head = MeshBuilder.CreateSphere(`training-head-${index}`, { diameter: 0.32, segments: 8 }, this.scene);
      head.parent = root;
      head.position.y = 1.44;
      head.material = this.material(`training-head-mat-${index}`, Color3.FromHexString("#744A2B"));
      this.dummies.push({ root, body, sway: 0 });
    });
  }

  private createSeasonWheel() {
    const root = new TransformNode("season-wheel", this.scene);
    root.position = new Vector3(4.9, 2.2, 7.8);
    const colors = [Color3.FromHexString("#7DAD75"), Color3.FromHexString("#E0AA4A"), Color3.FromHexString("#5A91A7"), Color3.FromHexString("#A8D7E8"), Color3.FromHexString("#B88952"), Color3.FromHexString("#8094A8")];
    colors.forEach((color, index) => {
      const ring = MeshBuilder.CreateTorus(`season-ring-${index}`, { diameter: 1.35 - index * 0.11, thickness: 0.028, tessellation: 28 }, this.scene);
      ring.parent = root;
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = (Math.PI * 2 * index) / 6;
      ring.material = this.material(`season-ring-mat-${index}`, color, color.scale(0.2));
      this.seasonRings.push(ring);
    });
  }

  private createFieldworkInstruments() {
    [
      { position: new Vector3(-6.25, 0.22, 3.65), line: "High-bank route: a clean line that leaves the reed workers without a return path." },
      { position: new Vector3(-3.1, 0.22, 4.55), line: "Low-bank route: a slower line that preserves warning access during rising water." },
    ].forEach((entry, index) => {
      const root = new TransformNode(`aruna-evidence-${index}`, this.scene);
      root.position.copyFrom(entry.position);
      const tablet = MeshBuilder.CreateBox(`aruna-evidence-tablet-${index}`, { width: 0.78, height: 0.72, depth: 0.09 }, this.scene);
      tablet.parent = root;
      tablet.position.y = 0.48;
      tablet.rotation.x = -0.22;
      tablet.material = this.material(`aruna-evidence-tablet-mat-${index}`, parchment, parchment.scale(0.08));
      const core = MeshBuilder.CreateSphere(`aruna-evidence-thread-${index}`, { diameter: 0.22, segments: 8 }, this.scene);
      core.parent = root;
      core.position.y = 0.96;
      core.material = this.material(`aruna-evidence-thread-mat-${index}`, star, this.newPlus ? star.scale(0.06) : star.scale(0.35));
      const ring = MeshBuilder.CreateTorus(`aruna-evidence-ring-${index}`, { diameter: 1.12, thickness: 0.035, tessellation: 24 }, this.scene);
      ring.parent = root;
      ring.position.y = 0.18;
      ring.rotation.x = Math.PI / 2;
      ring.material = this.material(`aruna-evidence-ring-mat-${index}`, copper, Color3.FromHexString("#261307"));
      this.evidenceMarkers.push({ root, core, compared: false, line: entry.line });
    });

    [new Vector3(0.6, 0.2, 6.45), new Vector3(3.8, 0.2, 4.75), new Vector3(5.1, 0.2, 6.6)].forEach((position, index) => {
      const root = new TransformNode(`laya-practice-anchor-${index}`, this.scene);
      root.position.copyFrom(position);
      const base = MeshBuilder.CreateCylinder(`laya-practice-base-${index}`, { diameter: 0.92, height: 0.14, tessellation: 16 }, this.scene);
      base.parent = root;
      base.position.y = 0.07;
      base.material = this.material(`laya-practice-base-mat-${index}`, Color3.FromHexString("#27483F"));
      const core = MeshBuilder.CreateSphere(`laya-practice-core-${index}`, { diameter: 0.28, segments: 8 }, this.scene);
      core.parent = root;
      core.position.y = 0.52;
      core.material = this.material(`laya-practice-core-mat-${index}`, jade, this.newPlus ? Color3.Black() : Color3.FromHexString("#123A35"));
      const halo = MeshBuilder.CreateTorus(`laya-practice-halo-${index}`, { diameter: 1.14, thickness: 0.045, tessellation: 24 }, this.scene);
      halo.parent = root;
      halo.position.y = 0.12;
      halo.rotation.x = Math.PI / 2;
      halo.material = this.material(`laya-practice-halo-mat-${index}`, jade, Color3.FromHexString("#123A35"));
      this.practiceAnchors.push({ root, core, held: false, progress: 0, phase: index * 1.7 });
    });
  }

  update(delta: number) {
    const clampedDelta = Math.min(delta, 0.05);
    this.time += clampedDelta;
    this.pulseCooldown = Math.max(0, this.pulseCooldown - clampedDelta);
    let movement = this.input.movement();
    if (this.demo) movement = this.runDemo(clampedDelta);
    this.player.move(movement, clampedDelta, this.demo ? 3.8 : 4.8);
    this.player.update(clampedDelta);
    if (!this.demo && this.input.consumePulse()) this.releasePulse();
    if (!this.demo && this.input.consumeInteract()) this.interact();
    this.updateLessons();
    this.updateGuides();
    this.updateDummies(clampedDelta);
    this.updatePulses(clampedDelta);
    this.updateFieldwork(clampedDelta, movement);
    this.updateAtmosphere(clampedDelta);
    this.updateCamera(clampedDelta);
    const pulseReady = this.pulseCooldown <= 0;
    if (pulseReady !== this.lastPulseReady) {
      this.lastPulseReady = pulseReady;
      this.hud.patch({ pulseReady });
    }
  }

  private updateLessons() {
    const calm = this.hud.reducedMotion;
    this.lessons.forEach((lesson) => {
      if (lesson.completed) return;
      lesson.root.position.y = calm ? 0.25 : 0.25 + Math.sin(this.time * 2.2 + lesson.phase) * 0.08;
      lesson.root.rotation.y += calm ? 0.001 : 0.005;
      if (Vector3.DistanceSquared(this.player.root.position, lesson.root.position) < 1.48) this.completeLesson(lesson);
    });
  }

  private completeLesson(lesson: Lesson) {
    if (lesson.completed) return;
    lesson.completed = true;
    lesson.root.setEnabled(false);
    this.completed += 1;
    const thread = MeshBuilder.CreateLines(`lesson-thread-${this.completed}`, { points: [lesson.root.position.clone(), this.rishiRoot.position.add(new Vector3(0, 0.8, 0))] }, this.scene);
    thread.color = lesson.title === "Astra" ? saffron : star;
    this.hud.patch({ glyphs: this.completed, notice: `${lesson.title}: ${lesson.discipline}. This understanding belongs to the journey, not only the Ashram.` });
    if (!this.demo) this.feedback.collect();
    if (this.completed === this.lessons.length) {
      this.stage = "converse";
      this.hud.patch({ questTitle: "Rishi Aruna’s First Question", questDetail: "Return to the pavilion and press E. A good journey begins with a chosen responsibility.", notice: "Four study circles are complete. The Rishi has been watching how you chose to learn." });
    }
  }

  private updateGuides() {
    const calm = this.hud.reducedMotion;
    this.guideRoots.forEach((guide, index) => {
      guide.root.position.y = calm ? 0 : Math.sin(this.time * (1.15 + index * 0.14) + guide.phase) * 0.018;
      guide.root.rotation.y = calm ? 0 : Math.sin(this.time * 0.48 + guide.phase) * 0.1;
    });
    this.guideFigures.forEach((figure) => figure.update(0.016, this.time));
    this.guideBillboards.forEach((billboard) => billboard.update(this.player.root.position, this.camera.position));
  }

  private updateDummies(delta: number) {
    const calm = this.hud.reducedMotion;
    this.dummies.forEach((dummy) => {
      dummy.sway = Math.max(0, dummy.sway - delta);
      dummy.body.rotation.z = dummy.sway > 0 ? Math.sin(this.time * 17) * 0.23 * dummy.sway : calm ? 0 : Math.sin(this.time * 1.5) * 0.025;
    });
  }

  private updatePulses(delta: number) {
    this.pulses = this.pulses.filter((pulse) => {
      pulse.age += delta;
      const scale = 1 + pulse.age * 8;
      pulse.mesh.scaling.set(scale, scale, scale);
      const material = pulse.mesh.material as StandardMaterial;
      material.alpha = Math.max(0, 0.86 - pulse.age * 0.86);
      pulse.motes.forEach((mote, index) => {
        const angle = (Math.PI * 2 * index) / pulse.motes.length;
        mote.position.x += Math.cos(angle) * delta * 2.1;
        mote.position.z += Math.sin(angle) * delta * 2.1;
        mote.position.y += delta * 0.75;
        mote.scaling.setAll(Math.max(0.05, 1 - pulse.age));
      });
      if (pulse.age > 1) {
        pulse.mesh.dispose();
        pulse.motes.forEach((mote) => mote.dispose());
        return false;
      }
      return true;
    });
  }

  private updateFieldwork(delta: number, movement: Vector3) {
    this.evidenceMarkers.forEach((marker, index) => {
      if (marker.compared) return;
      marker.core.position.y = 0.96 + Math.sin(this.time * 2.1 + index) * 0.08;
      marker.core.rotation.y += delta * 1.8;
    });
    this.practiceAnchors.forEach((anchor) => {
      if (anchor.held) return;
      anchor.core.position.y = 0.52 + Math.sin(this.time * 2.7 + anchor.phase) * 0.06;
      anchor.core.rotation.y += delta * 1.4;
    });
    if (!this.practiceActive) return;
    this.practiceWindow = Math.max(0, this.practiceWindow - delta);
    const nearby = this.practiceAnchors.find((anchor) => !anchor.held && Vector3.Distance(anchor.root.position, this.player.root.position) < 1.45);
    if (nearby && movement.lengthSquared() < 0.018) {
      nearby.progress = Math.min(1, nearby.progress + delta * 1.4);
      this.practiceStability = Math.min(100, this.practiceStability + delta * 5.2);
      nearby.core.scaling.setAll(1 + nearby.progress * 0.5);
      if (nearby.progress >= 1) {
        nearby.held = true;
        nearby.core.material = this.material(`laya-practice-held-${this.practiceAnchors.indexOf(nearby)}`, saffron, saffron);
        if (!this.demo) this.feedback.collect();
      }
    } else {
      this.practiceStability = Math.max(0, this.practiceStability - delta * (movement.lengthSquared() > 0.03 ? 1.75 : 0.32));
    }
    const held = this.practiceAnchors.filter((anchor) => anchor.held).length;
    this.hud.patch({ glyphs: held, glyphGoal: 3, stability: this.practiceStability, notice: nearby ? "Hold still at the jade anchor. Laya’s interval rewards a deliberate pause, not a rushed crossing." : "Move between the jade anchors, then settle your stance long enough for the rhythm to hold." });
    if (held === this.practiceAnchors.length) {
      this.practiceActive = false;
      this.hud.patch({ layaPractice: 3, milestone: "Laya’s practice · Measured interval", questTitle: "Breath holds the route", questDetail: "Three movements were measured without forcing the rhythm. Prana practice now strengthens every storm crossing.", stability: 100, notice: "Muni Laya: The body learned a route that can stop for another person. Carry that patience into the stormfront." });
      return;
    }
    if (this.practiceWindow === 0 || this.practiceStability === 0) {
      this.practiceAnchors.forEach((anchor) => { anchor.held = false; anchor.progress = 0; anchor.core.scaling.setAll(1); });
      this.practiceActive = false;
      this.hud.patch({ glyphs: this.completed, glyphGoal: 4, stability: 100, questTitle: "Measured practice pauses", questDetail: "Return to Muni Laya when ready to hold the three anchors without rushing.", notice: "The interval broke, but the practice remains. A steady return is part of learning." });
    }
  }

  private updateAtmosphere(delta: number) {
    const calm = this.hud.reducedMotion;
    const phase = this.dayPhases[this.dayPhase];
    const cycle = calm ? 0.88 : 0.88 + Math.sin(this.time * 0.025) * 0.08;
    this.scene.clearColor = new Color4(phase.tint.r * cycle, phase.tint.g * cycle, phase.tint.b * cycle, 1);
    this.seasonRings.forEach((ring, index) => { ring.rotation.z += delta * (calm ? 0.012 + index * 0.002 : 0.06 + index * 0.012); });
    this.ambient.update(delta);
  }

  private updateCamera(delta: number) {
    this.cameraMotion.update(delta, this.player, this.stage === "converse" ? this.rishiRoot.position : undefined, this.input);
  }

  private releasePulse() {
    if (this.pulseCooldown > 0) return;
    this.pulseCooldown = 1.5;
    const wave = MeshBuilder.CreateTorus("focus-pulse", { diameter: 0.82, thickness: 0.065, tessellation: 40 }, this.scene);
    wave.position = this.player.root.position.clone();
    wave.position.y = 0.26;
    wave.rotation.x = Math.PI / 2;
    wave.material = this.material("focus-pulse-mat", saffron, saffron, 0.88);
    const motes = Array.from({ length: 12 }, (_, index) => {
      const mote = MeshBuilder.CreateSphere(`focus-mote-${index}`, { diameter: 0.1, segments: 6 }, this.scene);
      const angle = (Math.PI * 2 * index) / 12;
      mote.position = wave.position.add(new Vector3(Math.cos(angle) * 0.48, 0.04, Math.sin(angle) * 0.48));
      mote.material = this.material(`focus-mote-mat-${index}`, saffron, saffron);
      return mote;
    });
    this.pulses.push({ mesh: wave, motes, age: 0 });
    this.cameraMotion.emphasize();
    if (!this.demo) this.feedback.pulse();
    const evidence = this.evidenceMarkers.find((marker) => !marker.compared && Vector3.Distance(marker.root.position, this.player.root.position) < 3.1);
    if (evidence) {
      evidence.compared = true;
      evidence.core.material = this.material(`aruna-evidence-confirmed-${this.evidenceCompared}`, saffron, saffron);
      this.evidenceCompared += 1;
      if (!this.demo) this.feedback.collect();
      const complete = this.evidenceCompared === this.evidenceMarkers.length;
      this.hud.patch({ arunaEvidence: this.evidenceCompared, milestone: complete ? "Aruna’s fieldwork · Two readings compared" : "", questTitle: complete ? "Evidence holds two routes" : "Compare the route readings", questDetail: complete ? "Return to the pavilion: the Star-thread now shows what each route asks another traveler to carry." : "Use Star-thread Sight beside the second route tablet, then compare what the two lines preserve.", notice: `${evidence.line}${complete ? " Aruna’s comparison instrument now shows a shared route is more than the quickest line." : ""}` });
      return;
    }
    if (this.practiceActive) {
      this.practiceStability = Math.min(100, this.practiceStability + 20);
      this.hud.patch({ stability: this.practiceStability, notice: "A focus pulse restores the measured interval. Do not mistake recovery for haste; return to the nearest jade anchor." });
      return;
    }
    let affected = 0;
    this.dummies.forEach((dummy) => {
      if (Vector3.Distance(dummy.root.position, this.player.root.position) < 4.3) {
        dummy.sway = 1;
        affected += 1;
      }
    });
    this.hud.patch({ notice: affected ? `Your focus pulse reaches ${affected} practice doll${affected > 1 ? "s" : ""}. Form is strength guided by restraint.` : "Your focus pulse settles the air. Move closer to the Astra practice circle to test its reach." });
  }

  private interact() {
    if (this.practiceAnchors.filter((anchor) => anchor.held).length < this.practiceAnchors.length && !this.practiceActive && Vector3.Distance(this.player.root.position, this.muniRoot.position) <= 3.2) {
      this.practiceActive = true;
      this.practiceWindow = 20;
      this.practiceStability = 100;
      this.practiceAnchors.forEach((anchor) => { anchor.held = false; anchor.progress = 0; });
      if (!this.demo) this.feedback.speak();
      this.hud.patch({ questTitle: "Muni Laya’s measured interval", questDetail: "Move between three jade anchors and pause at each until it settles. Use focus pulses to recover stability, not to rush.", glyphs: 0, glyphGoal: 3, stability: 100, notice: "Muni Laya: Your pace can become shelter only when you know how to stop." });
      return;
    }
    if (this.evidenceCompared === this.evidenceMarkers.length && Vector3.Distance(this.player.root.position, this.rishiRoot.position) <= 3.1) {
      this.hud.patch({ arunaEvidence: 2, milestone: "Aruna’s evidence record · Filed", questTitle: "A route is a responsibility", questDetail: "The field comparison is complete. Its evidence now travels with the Chronicle.", notice: "Rishi Aruna: The chart did not choose for you. It made visible who would bear the cost of each line." });
      return;
    }
    if (this.stage !== "converse" || Vector3.Distance(this.player.root.position, this.rishiRoot.position) > 3.1) return;
    this.stage = "prepared";
    if (!this.demo) this.feedback.speak();
    this.hud.patch({ choiceOpen: true, questTitle: "A Rishi’s Question", questDetail: "What responsibility will guide your first journey beyond the Ashram?", notice: "Rishi Aruna: A technique becomes wisdom only when it has a purpose beyond oneself." });
  }

  chooseStance = (trait: TraitKey) => {
    if (this.stage !== "prepared") return;
    this.traitValues[trait] = Math.min(100, this.traitValues[trait] + 14);
    if (!this.demo) this.feedback.align();
    const detail: Record<TraitKey, string> = {
      viveka: "Discernment will help you read the signals hidden in unfamiliar places.",
      sahas: "Courage will carry you through uncertainty without abandoning care.",
      karuna: "Compassion will keep knowledge connected to the people it should serve.",
    };
    this.hud.patch({ choiceOpen: false, traits: this.traitValues, questTitle: "The Road of Many Arts", questDetail: detail[trait], notice: "The Ashram has prepared you for the first road. The Rasa Engine remains a distant question, waiting for a traveler who can understand it." });
  };

  private runDemo(delta: number) {
    this.demoPause = Math.max(0, this.demoPause - delta);
    if (this.demoStage < this.lessons.length) {
      const target = this.lessons[this.demoStage];
      if (target.completed) {
        this.demoStage += 1;
        this.demoPause = 0.2;
        return Vector3.Zero();
      }
      return this.directionTo(target.root.position);
    }
    if (this.demoStage === 4) {
      const dummy = this.dummies[0];
      if (Vector3.Distance(this.player.root.position, dummy.root.position) < 3.7) {
        this.releasePulse();
        this.demoStage = 5;
        this.demoPause = 0.6;
        return Vector3.Zero();
      }
      return this.directionTo(dummy.root.position);
    }
    if (this.demoStage === 5) {
      if (Vector3.Distance(this.player.root.position, this.rishiRoot.position) < 2.4) {
        this.interact();
        this.demoStage = 6;
        this.demoPause = 0.8;
        return Vector3.Zero();
      }
      return this.directionTo(this.rishiRoot.position);
    }
    if (this.demoStage === 6 && this.demoPause === 0) {
      this.chooseStance("karuna");
      this.demoStage = 7;
    }
    return Vector3.Zero();
  }

  private directionTo(target: Vector3) {
    const direction = target.subtract(this.player.root.position);
    direction.y = 0;
    return direction.lengthSquared() > 0.1 ? direction.normalize() : Vector3.Zero();
  }

  advanceSeason = () => {
    this.seasonIndex = (this.seasonIndex + 1) % this.seasonalMoods.length;
    const mood = this.seasonalMoods[this.seasonIndex];
    this.seasonRings.forEach((ring, index) => {
      const material = ring.material as StandardMaterial;
      material.emissiveColor = index === this.seasonIndex ? saffron.scale(0.52) : Color3.FromHexString("#263A45");
    });
    this.hud.patch({ season: mood.name, notice: `Season changed: ${mood.name}. ${mood.note}` });
  };

  advanceTime = () => {
    this.dayPhase = (this.dayPhase + 1) % this.dayPhases.length;
    const phase = this.dayPhases[this.dayPhase];
    this.hud.patch({ timeOfDay: phase.name, notice: `${phase.name}: the Ashram changes its rhythm, and some conversations will sound different.` });
  };

  inquireGuide = (guide: "rishi" | "muni" | "raja") => {
    const entries = {
      rishi: { trait: "viveka" as TraitKey, line: this.context?.returnObservatoryComplete ? "Rishi Aruna’s Observatory return note: set the first tablet beside its changed condition; the earlier reading remains useful when its reach is still visible." : this.context?.confluenceComplete ? "Rishi Aruna’s return note: the Route Braid belongs beside the first tablet because every careful claim needs its reach and return condition written together." : "Rishi Aruna’s fieldwork: use Star-thread Sight on the two route tablets, then name what each reading overlooks." },
      muni: { trait: "karuna" as TraitKey, line: this.context?.returnObservatoryComplete ? "Muni Laya’s Observatory return note: return practice leaves a quiet interval for the next reader to identify the change before the route hardens again." : this.context?.confluenceComplete ? "Muni Laya’s return note: the public table worked because it left an interval where another reader could enter before the route was called finished." : "Muni Laya’s practice: ask for a measured interval at the jade anchors, then recover stability without forcing the pace." },
      raja: { trait: "sahas" as TraitKey, line: this.context?.returnObservatoryComplete ? `Raja Somavrat’s Observatory return note: ${this.context.amendmentChoice || "a shared route remains responsible when its changed condition and next reader are named."}` : this.context?.confluenceComplete ? `Raja Somavrat’s return note: ${this.context.publicRouteChoice || "a shared route remains responsible when its readers can amend it."}` : "Raja Somavrat’s dialogue quest: speak for a village need before you ask for the road to open." },
    }[guide];
    this.traitValues[entries.trait] = Math.min(100, this.traitValues[entries.trait] + 3);
    this.hud.patch({ traits: this.traitValues, notice: entries.line });
  };

  dispose() {
    this.input.dispose();
    this.player.dispose();
    this.feedback.dispose();
    this.ambient.dispose();
    this.guideBillboards.forEach((billboard) => billboard.dispose());
    this.pulses.forEach((pulse) => { pulse.mesh.dispose(); pulse.motes.forEach((mote) => mote.dispose()); });
  }
}
