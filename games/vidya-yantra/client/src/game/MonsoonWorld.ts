// Monsoon Observatory design reminder: rain, wet stone, jade water channels, and copper yantra rings make the later chapter feel earned and distinct.
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
import { Player } from "./Player";
import { SoundFeedback } from "./SoundFeedback";
import { CinematicCamera } from "./CinematicCamera";
import { AmbientLife } from "./AmbientLife";
import type { JourneyContext } from "./scene";

type RainDrop = { mesh: Mesh; phase: number };
type RainNode = { root: TransformNode; core: Mesh; calibrated: boolean; phase: number };
type PulseWave = { mesh: Mesh; motes: Mesh[]; age: number };
type StormCurrent = { root: TransformNode; core: Mesh; redirected: boolean; phase: number };
type ShelterAnchor = { root: TransformNode; core: Mesh; sheltered: boolean; phase: number };

const saffron = Color3.FromHexString("#F26B38");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const rainBlue = Color3.FromHexString("#93C8DD");

export class MonsoonWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private nodes: RainNode[] = [];
  private rain: RainDrop[] = [];
  private rings: Mesh[] = [];
  private pulses: PulseWave[] = [];
  private stormCurrents: StormCurrent[] = [];
  private shelterAnchors: ShelterAnchor[] = [];
  private calibrated = 0;
  private time = 0;
  private pulseCooldown = 0;
  private lastPulseReady = true;
  private phaseIndex = 0;
  private stage: "briefing" | "attune" | "align" | "choose" | "traverse" | "public" | "complete" = "briefing";
  private traits = { viveka: 48, sahas: 36, karuna: 42 };
  private readonly corePosition = new Vector3(0, 0, 0);
  private readonly times = ["Stormwatch", "Rainfall", "Cloudbreak"];
  private newPlus = false;
  private focusTimer = 0;
  private readonly focusTimerMax = 90;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.focusTimer = this.focusTimerMax;
    this.createObservatory();
    this.ambient = new AmbientLife(scene, "monsoon", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-7.0, 0, 5.3), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "monsoon", () => this.hud.reducedMotion);
    this.createRainNodes();
    this.createStormfrontCourse();
    this.createRain();
    if (context?.stormfrontComplete) {
      this.stage = "complete";
      this.stormCurrents.forEach((current, index) => { current.redirected = true; current.core.material = this.material(`resolved-storm-current-${index}`, saffron, saffron); });
      this.shelterAnchors.forEach((anchor, index) => { anchor.sheltered = true; anchor.core.material = this.material(`resolved-shelter-anchor-${index}`, saffron, saffron); });
    }
    this.hud.patch({
      chapter: "Chapter IV · Monsoon Observatory",
      questTitle: context?.stormfrontComplete ? "Chapter V signal held" : this.newPlus ? "Stormfront briefing · New Journey+ time pressure" : "Stormfront briefing",
      questDetail: context?.stormfrontComplete ? context.chapterFiveSignal : this.newPlus ? "New Journey+ · time pressure: a slow focus timer drains through the storm. Complete the practice before it empties, or the monsoon will settle for a default shelter." : "The Observatory detects a moving current below the plateau. Reach the central yantra and press E to begin the Rainward Current practice.",
      glyphs: context?.stormfrontComplete ? 5 : 0,
      glyphGoal: context?.stormfrontComplete ? 5 : 3,
      season: "Varsha · monsoon",
      timeOfDay: "Stormwatch",
      demo,
      notice: context?.mirrorStepComplete ? `The Rainward Current now receives a countermark: ${context.corroborationChoice || "the water route must show the source and limit that shape its warning."}` : context?.stormfrontComplete ? context.chapterFiveSignal : this.newPlus ? `New Journey+ · time pressure active. ${Math.ceil(this.focusTimer)} seconds of focus remain before the storm settles on its own.` : context?.taraBond && context.taraBond >= 2 ? "Tara’s returned sounding has marked two shelter anchors. The plateau asks whether a technique can carry more than its first traveler." : "The plateau observes a different kind of lesson: water makes every path a question of attention. Tara’s returned sounding has marked the safest shelter route.",
      taraBond: context?.taraBond ?? 0,
      taraStormQuest: context?.taraStormQuest ?? 0,
      stormfrontComplete: context?.stormfrontComplete ?? false,
      publicChoice: context?.publicChoice ?? "",
      chapterFiveSignal: context?.chapterFiveSignal ?? "",
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

  private createObservatory() {
    const plateau = MeshBuilder.CreateCylinder("monsoon-plateau", { diameter: 24, height: 0.32, tessellation: 64 }, this.scene);
    plateau.position.y = -0.16;
    plateau.material = this.material("monsoon-stone", Color3.FromHexString("#26333A"), Color3.FromHexString("#0B1218"));
    const innerCourt = MeshBuilder.CreateCylinder("monsoon-court", { diameter: 18.8, height: 0.06, tessellation: 64 }, this.scene);
    innerCourt.position.y = 0.02;
    innerCourt.material = this.material("monsoon-court-mat", Color3.FromHexString("#354750"));
    const water = this.material("monsoon-water", Color3.FromHexString("#3C7991"), Color3.FromHexString("#163E50"), 0.9);
    [-3.6, 3.6].forEach((x, index) => {
      const channel = MeshBuilder.CreateBox(`rain-channel-${index}`, { width: 0.48, height: 0.04, depth: 16 }, this.scene);
      channel.position = new Vector3(x, 0.08, 0);
      channel.rotation.y = index === 0 ? 0.44 : -0.44;
      channel.material = water;
    });
    const edge = MeshBuilder.CreateTorus("monsoon-edge", { diameter: 19.4, thickness: 0.08, tessellation: 64 }, this.scene);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.11;
    edge.material = this.material("monsoon-edge-mat", copper, Color3.FromHexString("#281007"));
    const skyline = MeshBuilder.CreatePlane("monsoon-skyline", { width: 34, height: 18 }, this.scene);
    skyline.position = new Vector3(0, 7.2, 15.4);
    skyline.material = this.material("monsoon-sky-mat", Color3.FromHexString("#102238"), Color3.FromHexString("#071327"));
    const rockMaterial = this.material("monsoon-rock-mat", Color3.FromHexString("#26333A"));
    for (let index = 0; index < 13; index += 1) {
      const angle = (Math.PI * 2 * index) / 13;
      const rock = MeshBuilder.CreateSphere(`monsoon-rock-${index}`, { diameter: 0.9 + (index % 3) * 0.45, segments: 7 }, this.scene);
      rock.scaling.y = 0.65;
      rock.position = new Vector3(Math.cos(angle) * (9.6 + (index % 2)), 0.22, Math.sin(angle) * (9.6 + (index % 2)));
      rock.material = rockMaterial;
    }
    const core = MeshBuilder.CreateCylinder("monsoon-yantra-base", { diameter: 4.4, height: 0.18, tessellation: 48 }, this.scene);
    core.position.y = 0.18;
    core.material = this.material("monsoon-yantra-base-mat", Color3.FromHexString("#1E2528"), Color3.FromHexString("#0C1114"));
    [5.6, 4.3, 3.05].forEach((diameter, index) => {
      const ring = MeshBuilder.CreateTorus(`monsoon-yantra-ring-${index}`, { diameter, thickness: 0.1, tessellation: 48 }, this.scene);
      ring.position.y = 0.52 + index * 0.1;
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = index * 0.7;
      ring.material = this.material(`monsoon-yantra-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#103B35") : Color3.FromHexString("#301307"));
      this.rings.push(ring);
    });
    const spindle = MeshBuilder.CreateCylinder("monsoon-spindle", { height: 1.3, diameterTop: 0.1, diameterBottom: 0.34, tessellation: 10 }, this.scene);
    spindle.position.y = 0.75;
    spindle.material = this.material("monsoon-spindle-mat", jade, Color3.FromHexString("#103B35"));
  }

  private createRainNodes() {
    [new Vector3(-5.3, 0.25, -2.6), new Vector3(4.8, 0.25, -3.2), new Vector3(2.0, 0.25, 5.7)].forEach((position, index) => {
      const root = new TransformNode(`rain-node-${index}`, this.scene);
      root.position.copyFrom(position);
      const base = MeshBuilder.CreateCylinder(`rain-node-base-${index}`, { height: 0.25, diameter: 1.0, tessellation: 12 }, this.scene);
      base.parent = root;
      base.position.y = 0.13;
      base.material = this.material(`rain-node-base-mat-${index}`, Color3.FromHexString("#293B42"));
      const core = MeshBuilder.CreateSphere(`rain-node-core-${index}`, { diameter: 0.42, segments: 10 }, this.scene);
      core.parent = root;
      core.position.y = 0.7;
      core.material = this.material(`rain-node-core-mat-${index}`, rainBlue, rainBlue);
      const halo = MeshBuilder.CreateTorus(`rain-node-halo-${index}`, { diameter: 1.1, thickness: 0.04, tessellation: 28 }, this.scene);
      halo.parent = root;
      halo.position.y = 0.42;
      halo.rotation.x = Math.PI / 2;
      halo.material = this.material(`rain-node-halo-mat-${index}`, jade, Color3.FromHexString("#103B35"));
      this.nodes.push({ root, core, calibrated: false, phase: index * 1.8 });
    });
  }

  private createStormfrontCourse() {
    [new Vector3(-6.2, 0.25, 3.1), new Vector3(-0.4, 0.25, -6.0), new Vector3(6.1, 0.25, 1.8)].forEach((position, index) => {
      const root = new TransformNode(`storm-current-${index}`, this.scene);
      root.position.copyFrom(position);
      const core = MeshBuilder.CreateTorus(`storm-current-core-${index}`, { diameter: 1.35, thickness: 0.075, tessellation: 30 }, this.scene);
      core.parent = root;
      core.rotation.x = Math.PI / 2;
      core.material = this.material(`storm-current-mat-${index}`, rainBlue, rainBlue.scale(0.48));
      const streak = MeshBuilder.CreateBox(`storm-current-streak-${index}`, { width: 2.0, height: 0.035, depth: 0.12 }, this.scene);
      streak.parent = root;
      streak.position.y = 0.22;
      streak.material = this.material(`storm-current-streak-mat-${index}`, rainBlue, rainBlue.scale(0.3), 0.8);
      this.stormCurrents.push({ root, core, redirected: false, phase: index * 2.1 });
    });
    [new Vector3(-3.2, 0.25, 6.15), new Vector3(4.55, 0.25, 5.3)].forEach((position, index) => {
      const root = new TransformNode(`storm-shelter-anchor-${index}`, this.scene);
      root.position.copyFrom(position);
      const base = MeshBuilder.CreateCylinder(`storm-shelter-base-${index}`, { diameter: 1.45, height: 0.18, tessellation: 20 }, this.scene);
      base.parent = root;
      base.position.y = 0.09;
      base.material = this.material(`storm-shelter-base-mat-${index}`, Color3.FromHexString("#1D4D48"), Color3.FromHexString("#0B2725"));
      const core = MeshBuilder.CreateSphere(`storm-shelter-core-${index}`, { diameter: 0.36, segments: 10 }, this.scene);
      core.parent = root;
      core.position.y = 0.58;
      core.material = this.material(`storm-shelter-core-mat-${index}`, jade, Color3.FromHexString("#123A35"));
      const halo = MeshBuilder.CreateTorus(`storm-shelter-halo-${index}`, { diameter: 1.62, thickness: 0.055, tessellation: 28 }, this.scene);
      halo.parent = root;
      halo.position.y = 0.12;
      halo.rotation.x = Math.PI / 2;
      halo.material = this.material(`storm-shelter-halo-mat-${index}`, jade, Color3.FromHexString("#123A35"));
      this.shelterAnchors.push({ root, core, sheltered: false, phase: index * 1.8 });
    });
  }

  private createRain() {
    const material = this.material("rain-streak-material", rainBlue, rainBlue, 0.58);
    for (let index = 0; index < 85; index += 1) {
      const mesh = MeshBuilder.CreateBox(`rain-streak-${index}`, { width: 0.024, height: 0.7, depth: 0.024 }, this.scene);
      mesh.position = new Vector3(-12 + ((index * 2.73) % 24), 1 + ((index * 1.97) % 12), -9 + ((index * 3.91) % 18));
      mesh.rotation.z = -0.18;
      mesh.material = material;
      this.rain.push({ mesh, phase: index * 0.13 });
    }
  }

  update(delta: number) {
    const step = Math.min(delta, 0.05);
    this.time += step;
    this.pulseCooldown = Math.max(0, this.pulseCooldown - step);
    if (this.newPlus && this.focusTimer > 0 && (this.stage === "attune" || this.stage === "align" || this.stage === "choose" || this.stage === "traverse")) { this.focusTimer = Math.max(0, this.focusTimer - step); if (this.focusTimer === 0) { this.autoCompleteTimePressure(); } else if (Math.floor(this.focusTimer) % 15 === 0 && Math.floor(this.focusTimer) !== Math.floor(this.focusTimer + step)) { this.hud.patch({ notice: `New Journey+ · time pressure: ${Math.ceil(this.focusTimer)} seconds of focus remain before the storm settles on its own.` }); } }
    this.player.move(this.input.movement(), step, 4.65);
    this.player.update(step);
    if (!this.demo && this.input.consumePulse()) this.releasePulse();
    if (!this.demo && this.input.consumeInteract()) this.interact();
    this.updateRain(step);
    this.updateNodes();
    this.updateStormfrontCourse(step);
    this.updateRings(step);
    this.updatePulses(step);
    this.updateCamera(step);
    const ready = this.pulseCooldown <= 0;
    if (ready !== this.lastPulseReady) { this.lastPulseReady = ready; this.hud.patch({ pulseReady: ready }); }
  }

  private updateRain(delta: number) {
    this.ambient.update(delta);
    const calm = this.hud.reducedMotion;
    this.rain.forEach((drop) => {
      drop.mesh.position.y -= delta * (calm ? 1.6 : 8.2);
      drop.mesh.position.x += delta * (calm ? 0.14 : 0.7);
      if (drop.mesh.position.y < 0) drop.mesh.position.y = 12 + (drop.phase % 3);
    });
  }

  private updateNodes() {
    const calm = this.hud.reducedMotion;
    this.nodes.forEach((node) => {
      if (node.calibrated) return;
      node.root.position.y = calm ? 0.25 : 0.25 + Math.sin(this.time * 2.7 + node.phase) * 0.12;
      node.core.rotation.y += calm ? 0.008 : 0.04;
    });
  }

  private updateStormfrontCourse(delta: number) {
    const calm = this.hud.reducedMotion;
    this.stormCurrents.forEach((current) => {
      if (current.redirected) return;
      current.root.position.x += Math.sin(this.time * 0.82 + current.phase) * delta * (calm ? 0.18 : 0.9);
      current.root.position.z += Math.cos(this.time * 0.71 + current.phase) * delta * (calm ? 0.13 : 0.65);
      current.core.rotation.z += delta * (calm ? 0.38 : 1.9);
    });
    this.shelterAnchors.forEach((anchor) => {
      if (anchor.sheltered) return;
      anchor.core.position.y = calm ? 0.58 : 0.58 + Math.sin(this.time * 2.4 + anchor.phase) * 0.08;
      anchor.core.rotation.y += delta * (calm ? 0.24 : 1.2);
    });
  }

  private updateRings(delta: number) {
    const calm = this.hud.reducedMotion;
    this.rings.forEach((ring, index) => { ring.rotation.z += delta * (index % 2 === 0 ? 0.5 : -0.68) * (this.stage === "complete" ? 2.3 : 1) * (calm ? 0.2 : 1); });
  }

  private updatePulses(delta: number) {
    this.pulses = this.pulses.filter((pulse) => {
      pulse.age += delta;
      const scale = 1 + pulse.age * 8;
      pulse.mesh.scaling.set(scale, scale, scale);
      (pulse.mesh.material as StandardMaterial).alpha = Math.max(0, 0.88 - pulse.age * 0.88);
      pulse.motes.forEach((mote, index) => {
        const angle = (Math.PI * 2 * index) / pulse.motes.length;
        mote.position.x += Math.cos(angle) * delta * 2.3;
        mote.position.z += Math.sin(angle) * delta * 2.3;
        mote.position.y += delta * 0.75;
        mote.scaling.setAll(Math.max(0.05, 1 - pulse.age));
      });
      if (pulse.age > 1) { pulse.mesh.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; }
      return true;
    });
  }

  private updateCamera(delta: number) {
    const stormTarget = this.stage === "traverse" ? this.stormCurrents.find((current) => !current.redirected)?.root.position : undefined;
    this.cameraMotion.update(delta, this.player, this.stage === "align" ? this.corePosition : stormTarget, this.input);
  }

  private autoCompleteTimePressure() {
    if (this.stage === "choose") { this.chooseStance("karuna"); return; }
    if (this.stage === "traverse") { this.stage = "public"; if (!this.demo) this.feedback.speak(); this.hud.patch({ glyphs: 5, glyphGoal: 5, choiceOpen: true, choiceMode: "public", questTitle: "Who receives the redirected rain?", questDetail: "The storm settled before every current was met. The Observatory defaults to the most exposed shelter.", notice: "New Journey+ · time pressure ended: the monsoon settled for a default shelter before all currents were redirected." }); return; }
    this.stage = "complete";
    this.traits.karuna = Math.min(100, this.traits.karuna + 10);
    const publicChoice = "The first protected route now reaches the low settlement’s shared shelter court.";
    const chapterFiveSignal = "Chapter V · The Common Roof answers from the high ridge: the next instrument was built for those who have nowhere else to wait.";
    if (!this.demo) this.feedback.align();
    this.hud.patch({ choiceOpen: false, choiceMode: "stance", traits: this.traits, taraBond: 3, taraStormQuest: 1, stormfrontComplete: true, publicChoice, chapterFiveSignal, milestone: "Tara’s bond · Shelter-caller’s knot (time pressure default)", questTitle: "A horizon answers", questDetail: chapterFiveSignal, notice: `New Journey+ · time pressure ended: ${publicChoice} The monsoon chose the default shelter before the traveler could answer.` });
  }

  private releasePulse() {
    if (this.pulseCooldown > 0) return;
    this.pulseCooldown = 1.5;
    const wave = MeshBuilder.CreateTorus("monsoon-focus-pulse", { diameter: 0.82, thickness: 0.07, tessellation: 40 }, this.scene);
    wave.position = this.player.root.position.clone();
    wave.position.y = 0.28;
    wave.rotation.x = Math.PI / 2;
    wave.material = this.material("monsoon-pulse-mat", saffron, saffron, 0.88);
    const motes = Array.from({ length: 16 }, (_, index) => {
      const mote = MeshBuilder.CreateSphere(`monsoon-focus-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene);
      const angle = (Math.PI * 2 * index) / 16;
      mote.position = wave.position.add(new Vector3(Math.cos(angle) * 0.5, 0.04, Math.sin(angle) * 0.5));
      mote.material = this.material(`monsoon-mote-mat-${index}`, saffron, saffron);
      return mote;
    });
    this.pulses.push({ mesh: wave, motes, age: 0 });
    this.cameraMotion.emphasize();
    if (!this.demo) this.feedback.pulse();
    if (this.stage === "traverse") {
      const redirected = this.stormCurrents.filter((current) => current.redirected).length;
      const sheltered = this.shelterAnchors.filter((anchor) => anchor.sheltered).length;
      const current = this.stormCurrents.find((entry) => !entry.redirected && Vector3.Distance(entry.root.position, this.player.root.position) < 3.1);
      if (current) {
        current.redirected = true;
        current.core.material = this.material(`storm-current-redirected-${redirected}`, saffron, saffron);
        if (!this.demo) this.feedback.collect();
        this.hud.patch({ glyphs: redirected + sheltered + 1, glyphGoal: 5, milestone: redirected + 1 === this.stormCurrents.length ? "Rainward Current · all flows redirected" : "", notice: "Rainward Current bends the moving flow away from the shelter line. Now carry the refuge into place." });
        return;
      }
      const shelter = this.shelterAnchors.find((entry) => !entry.sheltered && Vector3.Distance(entry.root.position, this.player.root.position) < 3.1);
      if (shelter) {
        shelter.sheltered = true;
        shelter.core.material = this.material(`storm-shelter-held-${sheltered}`, saffron, saffron);
        if (!this.demo) this.feedback.collect();
        const nextRedirected = this.stormCurrents.filter((entry) => entry.redirected).length;
        const nextSheltered = sheltered + 1;
        if (nextRedirected === this.stormCurrents.length && nextSheltered === this.shelterAnchors.length) {
          this.stage = "public";
          if (!this.demo) this.feedback.speak();
          this.hud.patch({ glyphs: 5, glyphGoal: 5, choiceOpen: true, choiceMode: "public", questTitle: "Who receives the redirected rain?", questDetail: "The route can serve only one need first. What should the Observatory protect while the next storm band approaches?", notice: "Tara: The shelter holds. Raja Somavrat asks whose safety the instrument must make visible first." });
        } else {
          this.hud.patch({ glyphs: nextRedirected + nextSheltered, glyphGoal: 5, notice: "Resonance Shelter holds a shared pause in the storm. Find the remaining current or anchor before the route closes." });
        }
        return;
      }
      this.hud.patch({ notice: "A moving current needs Rainward Current; a jade anchor needs Resonance Shelter. Stand within the instrument’s reach before pulsing." });
      return;
    }
    const nearby = this.nodes.find((node) => !node.calibrated && Vector3.Distance(node.root.position, this.player.root.position) < 4.25);
    if (!nearby) {
      this.hud.patch({ notice: "Rain listens to a focused pulse only near an unaligned node." });
      return;
    }
    nearby.calibrated = true;
    nearby.core.material = this.material(`rain-node-aligned-${this.calibrated}`, saffron, saffron);
    this.calibrated += 1;
    if (!this.demo) this.feedback.collect();
    this.hud.patch({ glyphs: this.calibrated, notice: `Rain node ${this.calibrated} / 3 attuned. The yantra’s geometry changes with every measured pulse.` });
    if (this.calibrated === 3) {
      this.stage = "align";
      this.hud.patch({ questTitle: "The Inner Ring Receives", questDetail: "Return to the central yantra and press E to complete the monsoon alignment.", notice: "All rain paths now feed the instrument. The central ring is ready for a deliberate answer." });
    }
  }

  private interact() {
    if (this.stage === "briefing" && Vector3.Distance(this.player.root.position, this.corePosition) <= 2.8) { this.stage = "attune"; this.feedback.speak(); this.hud.patch({ questTitle: "Redirect the rain paths", questDetail: "Use a focus pulse near each rain node. The central yantra will answer when all three moving currents are attuned.", notice: "The forecast board gives an advantage in Varsha: pulses return more steadily near jade water channels." }); return; }
    if (this.stage !== "align" || Vector3.Distance(this.player.root.position, this.corePosition) > 2.8) return;
    this.stage = "choose";
    if (!this.demo) this.feedback.speak();
    this.hud.patch({ choiceOpen: true, choiceMode: "stance", questTitle: "A Question in Rain", questDetail: "The aligned yantra asks what knowledge should preserve when conditions change.", notice: "The storm quiets for a moment. Answer the instrument before the water finds a new route." });
  }

  chooseStance = (trait: TraitKey) => {
    if (this.stage === "choose") {
      this.stage = "traverse";
      this.traits[trait] = Math.min(100, this.traits[trait] + 14);
      if (!this.demo) this.feedback.align();
      this.hud.patch({ choiceOpen: false, choiceMode: "stance", traits: this.traits, advancedTechnique: "Rainward Current", milestone: "Technique earned · Rainward Current", questTitle: "Tara’s storm-shelter route", questDetail: "Redirect the three moving currents with Rainward Current, then pulse the two jade anchors to extend Resonance Shelter for the whole crossing.", glyphs: 0, glyphGoal: 5, notice: "Tara: The current will move again. Meet it with Rainward Current, then leave a shelter where someone else can wait safely." });
      return;
    }
    if (this.stage !== "public") return;
    this.stage = "complete";
    this.traits[trait] = Math.min(100, this.traits[trait] + 10);
    const publicChoice: Record<TraitKey, string> = { viveka: "The redirected water now drives a public flood-warning needle before any private work begins.", sahas: "The Observatory holds a passage channel open for isolated travelers before the next rain band closes it.", karuna: "The first protected route now reaches the low settlement’s shared shelter court." };
    const chapterFiveSignal = trait === "viveka" ? "Chapter V · The Warning Archive answers from the high ridge: bring the evidence that a river can speak before it floods." : trait === "sahas" ? "Chapter V · The Wind Stair answers from the high ridge: a new passage is open, but it needs a traveler willing to carry its warning." : "Chapter V · The Common Roof answers from the high ridge: the next instrument was built for those who have nowhere else to wait.";
    if (!this.demo) this.feedback.align();
    this.hud.patch({ choiceOpen: false, choiceMode: "stance", traits: this.traits, taraBond: 3, taraStormQuest: 1, stormfrontComplete: true, publicChoice: publicChoice[trait], chapterFiveSignal, milestone: "Tara’s bond · Shelter-caller’s knot", questTitle: "A horizon answers", questDetail: chapterFiveSignal, notice: `${publicChoice[trait]} Tara knots the storm call into Ila’s compass cord: a promise that safe passage must be shareable.` });
  };

  advanceSeason = () => this.hud.patch({ notice: "The Monsoon Observatory holds steady in Varsha. Its puzzle changes with water, not with a calendar switch." });
  advanceTime = () => { this.phaseIndex = (this.phaseIndex + 1) % this.times.length; this.hud.patch({ timeOfDay: this.times[this.phaseIndex], notice: `${this.times[this.phaseIndex]} changes the visibility of rain channels and the rhythm of the rings.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => {
    const hints = { rishi: this.context?.returnObservatoryComplete ? "Rishi Aruna’s Observatory return note: the rain gauge keeps its earlier water frame beside the later rise, so the next storm can revise the route without erasing the source." : this.context?.confluenceComplete ? "Rishi Aruna’s monsoon return note: the rain gauge now carries its water condition and a public return marker, so the next storm can revise the route without hiding its source." : this.context?.mirrorStepComplete ? "Rishi Aruna’s monsoon note: the Countermark Lens changes the rain reading—show the reflection, the source, and the condition that could redirect the current." : "Rishi Aruna’s monsoon note: do not read a reflection as if it were the source.", muni: this.context?.returnObservatoryComplete ? "Muni Laya’s Observatory return note: a changed current needs a quiet beat where the next water reader can place the amendment before moving." : this.context?.confluenceComplete ? "Muni Laya’s monsoon return note: a public route leaves a beat for the next warning to arrive before the group moves." : "Muni Laya’s monsoon note: a steady breath finds the opening between two falling sheets of rain.", raja: this.context?.amendmentChoice || this.context?.publicRouteChoice || this.context?.corroborationChoice || "Raja Somavrat’s monsoon note: water chooses low ground; responsibility should choose the people most exposed." };
    this.hud.patch({ notice: hints[guide] });
  };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.rain.forEach((drop) => drop.mesh.dispose()); this.pulses.forEach((pulse) => { pulse.mesh.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}
