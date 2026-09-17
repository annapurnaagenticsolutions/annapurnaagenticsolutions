// Chapter III design reminder: the Rasa Engine converts patient study into a nonviolent trial of observation, steadiness, and shared shelter.
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { AmbientLife } from "./AmbientLife";
import { CinematicCamera } from "./CinematicCamera";
import { HudBridge, type TraitKey } from "./HudBridge";
import { InputManager } from "./InputManager";
import { Player } from "./Player";
import { SoundFeedback } from "./SoundFeedback";
import { loadChronicleData } from "./Chronicle";

type Stage = "gate" | "observe" | "hold" | "share" | "choose" | "complete";
type Measure = { root: TransformNode; core: Mesh; aligned: boolean; label: string };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const saffron = Color3.FromHexString("#F26B38");
const parchment = Color3.FromHexString("#D7B77D");

export class RasaWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private ambient: AmbientLife;
  private player: Player;
  private cameraMotion: CinematicCamera;
  private measures: Measure[] = [];
  private rings: Mesh[] = [];
  private shelters: Vector3[] = [new Vector3(-6.4, 0, 3.3), new Vector3(6.1, 0, 2.8)];
  private pulses: Pulse[] = [];
  private stage: Stage;
  private aligned = 0;
  private stability = 100;
  private pulseCooldown = 0;
  private time = 0;
  private hudTimer = 0;
  private traits = { viveka: 48, sahas: 36, karuna: 42 };
  private newPlus = false;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private prepared: boolean, private demo: boolean) {
    this.newPlus = loadChronicleData().journeyMode === "new-plus";
    this.createCourtyard();
    this.ambient = new AmbientLife(scene, "rasa", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-6.6, 0, 5.2), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "rasa", () => this.hud.reducedMotion);
    this.stage = prepared ? "observe" : "gate";
    if (prepared) this.createMeasures();
    this.hud.patch(prepared ? {
      chapter: "Chapter III · Rasa Engine", questTitle: this.newPlus ? "New Journey+ · Mirror stance: three measures reversed" : "Three measures of a living instrument", questDetail: this.newPlus ? "New Journey+ · mirror stance active: each stance choice carries its reversed meaning. Viveka asks for courage, sahas asks for discernment, karuna asks for observation." : "Observe the chart fragment, hold the river measure under pressure, then share shelter before the Engine answers.", glyphs: 0, glyphGoal: 3, season: "Sharad · starfall", timeOfDay: "Observatory dusk", stability: 100, notice: this.newPlus ? "The repaired compass catches a star-thread. New Journey+ · the Engine reverses each stance: choose what you will keep, but its meaning has turned." : "The repaired compass catches a star-thread. The first ring asks only that you observe." 
    } : {
      chapter: "Chapter III · Silent Courtyard", questTitle: "An unprepared instrument", questDetail: "The Engine will not answer until Ila has repaired the compass and carried a practice into the road.", glyphs: 0, glyphGoal: 3, season: "Sharad · starfall", timeOfDay: "Observatory dusk", stability: 100, notice: "The Engine remains quiet. Complete the Nadi Corridor route and repair the copper field compass in the Chronicle." 
    });
  }

  private material(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.emissiveColor = emissive;
    material.specularColor = Color3.Black();
    material.alpha = alpha;
    return material;
  }

  private createCourtyard() {
    const floor = MeshBuilder.CreateCylinder("rasa-courtyard", { diameter: 24, height: 0.25, tessellation: 64 }, this.scene);
    floor.position.y = -0.12;
    floor.material = this.material("rasa-stone", Color3.FromHexString("#233247"));
    const inner = MeshBuilder.CreateCylinder("rasa-inner", { diameter: 15, height: 0.05, tessellation: 56 }, this.scene);
    inner.position.y = 0.02;
    inner.material = this.material("rasa-inner-mat", Color3.FromHexString("#2C3A44"));
    const path = MeshBuilder.CreateBox("rasa-path", { width: 2, height: 0.06, depth: 18 }, this.scene);
    path.position = new Vector3(-2, 0.06, 0);
    path.rotation.y = 0.44;
    path.material = this.material("rasa-path-mat", parchment);
    for (let index = 0; index < 9; index += 1) {
      const angle = (Math.PI * 2 * index) / 9;
      const pillar = MeshBuilder.CreateBox(`rasa-pillar-${index}`, { width: 0.65, height: 2.1 + (index % 3) * 0.4, depth: 0.65 }, this.scene);
      pillar.position = new Vector3(Math.cos(angle) * 10, 1, Math.sin(angle) * 10);
      pillar.rotation.y = angle;
      pillar.material = this.material(`rasa-pillar-mat-${index}`, Color3.FromHexString(index % 2 ? "#384557" : "#2A3442"));
      const cap = MeshBuilder.CreateSphere(`rasa-cap-${index}`, { diameter: 0.38, segments: 8 }, this.scene);
      cap.position = pillar.position.add(new Vector3(0, 1.25, 0));
      cap.material = this.material(`rasa-cap-mat-${index}`, copper, Color3.FromHexString("#36180B"));
    }
    const base = MeshBuilder.CreateCylinder("rasa-base", { diameter: 5.2, height: 0.22, tessellation: 48 }, this.scene);
    base.position.y = 0.16;
    base.material = this.material("rasa-base-mat", Color3.FromHexString("#182334"));
    [6.2, 4.8, 3.55, 2.15].forEach((diameter, index) => {
      const ring = MeshBuilder.CreateTorus(`rasa-ring-${index}`, { diameter, thickness: 0.1, tessellation: 52 }, this.scene);
      ring.position.y = 0.55 + index * 0.12;
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = index * 0.48;
      ring.material = this.material(`rasa-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#133A35") : Color3.FromHexString("#341607"));
      this.rings.push(ring);
    });
    const needle = MeshBuilder.CreateCylinder("rasa-needle", { height: 2.4, diameterTop: 0.06, diameterBottom: 0.24, tessellation: 10 }, this.scene);
    needle.position.y = 1.45;
    needle.material = this.material("rasa-needle-mat", saffron, saffron);
    const horizon = MeshBuilder.CreatePlane("rasa-horizon", { width: 34, height: 17 }, this.scene);
    horizon.position = new Vector3(0, 7.6, 15);
    horizon.material = this.material("rasa-horizon-mat", Color3.FromHexString("#0B1630"), Color3.FromHexString("#071023"));
    this.shelters.forEach((position, index) => {
      const anchor = MeshBuilder.CreateTorus(`rasa-shelter-${index}`, { diameter: 1.4, thickness: 0.06, tessellation: 32 }, this.scene);
      anchor.position = position.add(new Vector3(0, 0.12, 0));
      anchor.rotation.x = Math.PI / 2;
      anchor.material = this.material(`rasa-shelter-mat-${index}`, jade, Color3.FromHexString("#123A35"));
    });
  }

  private createMeasures() {
    [[new Vector3(-5.2, 0.2, -3.1), "Observe · chart fragment"], [new Vector3(5.0, 0.2, -3.4), "Hold · river measure"], [new Vector3(1.6, 0.2, 5.8), "Share · shelter weave"]].forEach(([position, label], index) => {
      const root = new TransformNode(`rasa-measure-${index}`, this.scene);
      root.position = (position as Vector3).clone();
      const base = MeshBuilder.CreateCylinder(`rasa-measure-base-${index}`, { diameter: 1, height: 0.14, tessellation: 12 }, this.scene);
      base.parent = root;
      base.position.y = 0.08;
      base.material = this.material(`rasa-measure-base-mat-${index}`, Color3.FromHexString("#31414B"));
      const core = MeshBuilder.CreateSphere(`rasa-measure-core-${index}`, { diameter: 0.38, segments: 10 }, this.scene);
      core.parent = root;
      core.position.y = 0.63;
      core.material = this.material(`rasa-measure-core-mat-${index}`, parchment, parchment);
      const halo = MeshBuilder.CreateTorus(`rasa-measure-halo-${index}`, { diameter: 1.06, thickness: 0.045, tessellation: 28 }, this.scene);
      halo.parent = root;
      halo.position.y = 0.38;
      halo.rotation.x = Math.PI / 2;
      halo.material = this.material(`rasa-measure-halo-mat-${index}`, jade, Color3.FromHexString("#123A35"));
      this.measures.push({ root, core, aligned: false, label: label as string });
    });
  }

  update(delta: number) {
    const step = Math.min(delta, 0.05);
    this.time += step;
    this.hudTimer += step;
    this.pulseCooldown = Math.max(0, this.pulseCooldown - step);
    this.player.move(this.input.movement(), step, 4.7);
    this.player.update(step);
    if (!this.demo && this.input.consumePulse()) this.pulse();
    if (!this.demo && this.input.consumeInteract()) this.interact();
    this.ambient.update(step);
    if (this.stage === "hold" || this.stage === "share") this.updatePressure(step);
    const calm = this.hud.reducedMotion;
    this.measures.forEach((measure, index) => { if (!measure.aligned) { measure.root.position.y = calm ? 0.2 : 0.2 + Math.sin(this.time * 2.1 + index) * 0.1; measure.core.rotation.y += calm ? 0.008 : 0.04; } });
    this.rings.forEach((ring, index) => { ring.rotation.z += step * (index % 2 ? 0.72 : -0.58) * (this.stage === "complete" ? 2.2 : 1) * (calm ? 0.2 : 1); });
    this.updatePulses(step);
    this.cameraMotion.update(step, this.player, this.stage === "choose" || this.stage === "complete" ? Vector3.Zero() : undefined, this.input);
    if (this.hudTimer > 0.18) { this.hudTimer = 0; this.hud.patch({ pulseReady: this.pulseCooldown <= 0, stability: Math.round(this.stability) }); }
  }

  private updatePressure(delta: number) {
    const sheltered = this.shelters.some((shelter) => Vector3.Distance(this.player.root.position, shelter) < 2.1);
    this.stability = Math.max(0, Math.min(100, this.stability + (sheltered ? 22 : -6.5) * delta));
    if (sheltered && Math.floor(this.time * 2) % 2 === 0) this.hud.patch({ notice: "Shelter anchor steady: the Engine gives your practice room to recover." });
    if (this.stability < 22) this.hud.patch({ notice: "Engine pressure rising. Reach a jade shelter anchor or use a measured focus pulse." });
  }

  private updatePulses(delta: number) {
    this.pulses = this.pulses.filter((pulse) => {
      pulse.age += delta;
      pulse.ring.scaling.setAll(1 + pulse.age * 7);
      (pulse.ring.material as StandardMaterial).alpha = Math.max(0, 0.85 - pulse.age * 0.85);
      pulse.motes.forEach((mote, index) => { const angle = (Math.PI * 2 * index) / pulse.motes.length; mote.position.x += Math.cos(angle) * delta * 2.1; mote.position.z += Math.sin(angle) * delta * 2.1; mote.position.y += delta * 0.7; mote.scaling.setAll(Math.max(0.05, 1 - pulse.age)); });
      if (pulse.age > 1) { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; }
      return true;
    });
  }

  private pulse() {
    if (this.pulseCooldown > 0) return;
    this.pulseCooldown = 1.35;
    this.cameraMotion.emphasize();
    const ring = MeshBuilder.CreateTorus("rasa-focus-pulse", { diameter: 0.82, thickness: 0.065, tessellation: 36 }, this.scene);
    ring.position = this.player.root.position.clone();
    ring.position.y = 0.26;
    ring.rotation.x = Math.PI / 2;
    ring.material = this.material("rasa-pulse-mat", saffron, saffron, 0.88);
    const motes = Array.from({ length: 14 }, (_, index) => { const mote = MeshBuilder.CreateSphere(`rasa-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene); const angle = (Math.PI * 2 * index) / 14; mote.position = ring.position.add(new Vector3(Math.cos(angle) * 0.45, 0.04, Math.sin(angle) * 0.45)); mote.material = this.material(`rasa-mote-mat-${index}`, saffron, saffron); return mote; });
    this.pulses.push({ ring, motes, age: 0 });
    this.feedback.pulse();
    if (this.stage === "gate") { this.hud.patch({ notice: "The Engine’s rings answer only a repaired compass. The Chronicle knows the unfinished work." }); return; }
    if (this.stage === "hold" || this.stage === "share") { this.stability = Math.min(100, this.stability + 14); this.hud.patch({ stability: this.stability, notice: "Measured pulse: stability returns when attention meets pressure." }); }
    const expected = this.measures[this.aligned];
    if (!expected || Vector3.Distance(expected.root.position, this.player.root.position) > 4.15) { this.hud.patch({ notice: `Seek the next measure: ${expected?.label ?? "the central ring"}.` }); return; }
    expected.aligned = true;
    expected.core.material = this.material(`rasa-measure-aligned-${this.aligned}`, saffron, saffron);
    this.aligned += 1;
    this.feedback.collect();
    if (this.aligned === 1) { this.stage = "hold"; this.hud.patch({ glyphs: 1, questTitle: "Hold the river measure", questDetail: "Pressure now tests timing. Use focus pulse to steady the ring, or reach a jade shelter anchor before aligning the second measure.", notice: "Observe complete. The Engine now asks whether you can keep a practice steady in motion." }); }
    else if (this.aligned === 2) { this.stage = "share"; this.hud.patch({ glyphs: 2, questTitle: "Share the shelter weave", questDetail: "Stability is fragile. Recover at a shelter anchor, then align the final measure to make room for another traveller.", notice: "Hold complete. The final ring opens only when stability becomes shared shelter." }); }
    else { this.stage = "choose"; this.hud.patch({ glyphs: 3, questTitle: "What does knowledge keep?", questDetail: "Return to the central ring and press E. The Engine listens for the responsibility carried from the road.", notice: "Three measures align. The Engine is ready to answer the traveller, not merely the instrument." }); }
  }

  private interact() {
    if (this.stage !== "choose" || Vector3.Distance(this.player.root.position, Vector3.Zero()) > 3.1) return;
    this.stage = "complete";
    this.feedback.speak();
    this.hud.patch({ choiceOpen: true, questTitle: "The Engine’s first answer", questDetail: "Choose the responsibility that will shape Resonance Shelter in the journeys ahead.", notice: "The needle settles above the centre mark. Answer with what you have learned to keep." });
  }

  chooseStance = (trait: TraitKey) => {
    if (this.stage !== "complete") return;
    // New Journey+ mirror stance: rotate the meaning of each stance.
    // viveka → sahas, sahas → karuna, karuna → viveka
    const mirror: Record<TraitKey, TraitKey> = { viveka: "sahas", sahas: "karuna", karuna: "viveka" };
    const effective = this.newPlus ? mirror[trait] : trait;
    this.traits[trait] = Math.min(100, this.traits[trait] + 14);
    this.feedback.align();
    const responseColor = { viveka: Color3.FromHexString("#A8D7E8"), sahas: saffron, karuna: jade }[effective];
    this.rings.forEach((ring, index) => { const material = ring.material as StandardMaterial; material.diffuseColor = responseColor; material.emissiveColor = responseColor.scale(0.2 + index * 0.05); });
    const outcome = { viveka: "You carried honest observation through pressure; the Engine reveals a careful path forward.", sahas: "You carried courageous movement through pressure; the Engine holds a route open ahead.", karuna: "You carried shared shelter through pressure; the Engine widens the circle for others." }[effective];
    const mirrorNote = this.newPlus ? " New Journey+ · mirror stance: your choice carried a reversed meaning." : "";
    this.hud.patch({ choiceOpen: false, traits: this.traits, stability: this.stability, rasaTechnique: "Resonance Shelter", rasaOutcome: outcome, milestone: "Technique earned · Resonance Shelter", questTitle: "Rasa Engine awakened", questDetail: "Resonance Shelter now marks safe circles and stabilizes living mechanisms. The next route waits beyond the Observatory.", notice: `${outcome}${mirrorNote}` });
  };

  advanceSeason = () => { const season = this.ambient.advanceSeason(); this.hud.patch({ season, notice: `${season}: the Engine changes its forecast, and each ring takes a different tint.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time}: the star-thread geometry becomes easier to read from the shelter anchors.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: "Aruna: Observation turns an instrument into a question.", muni: "Laya: Let the pulse return before you ask it to carry more.", raja: "Somavrat: A shelter is only complete when another traveller can use it." }; this.hud.patch({ notice: notes[guide] }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.pulses.forEach((pulse) => { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}
