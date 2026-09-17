/* Rasa Engine Chapter VIII: an original mineral evidence chamber where three distinct source marks are corroborated without closing the route's margin. */
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import { AmbientLife } from "./AmbientLife";
import { CinematicCamera } from "./CinematicCamera";
import { HudBridge, type TraitKey } from "./HudBridge";
import { InputManager } from "./InputManager";
import { Player, buildNpcFigure, createPortraitBillboard, type NpcFigure, type PortraitBillboard } from "./Player";
import { SoundFeedback } from "./SoundFeedback";
import { assets } from "./assets";
import type { JourneyContext } from "./scene";

type SourceStation = { root: TransformNode; ring: Mesh; recorded: boolean; label: string; limit: string; phase: number };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };
const saffron = Color3.FromHexString("#F26B38");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const parchment = Color3.FromHexString("#D7B77D");
const starBlue = Color3.FromHexString("#A8D7E8");
const salt = Color3.FromHexString("#DEE4DF");

export class MirrorStepWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private sources: SourceStation[] = [];
  private pulses: Pulse[] = [];
  private mirrorCore!: TransformNode;
  private interlocutor!: TransformNode;
  private interlocutorFigure!: NpcFigure;
  private interlocutorBillboard!: PortraitBillboard;
  private mirrorRings: Mesh[] = [];
  private time = 0;
  private pulseCooldown = 0;
  private recorded = 0;
  private stage: "sealed" | "approach" | "sources" | "resolve" | "corroborate" | "drill" | "complete" = "approach";
  private readonly corePosition = new Vector3(5.7, 0, -4.6);
  private drillOrder: string[] = [];
  private drillProgress = 0;
  private drillRecord = 0;
  private mirrorSeason = "Sharad · clear river";
  private newPlus = false;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.createMirrorTerrain();
    this.ambient = new AmbientLife(scene, "mirrorStep", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-8.4, 0, 7.5), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "mirrorStep", () => this.hud.reducedMotion);
    this.createSourceStations();
    this.createMirrorCoreAndInterlocutor();
    const unlocked = Boolean(context?.saltLibraryComplete && context?.fieldAnnotation && context?.chapterEightSignal);
    if (!unlocked) this.stage = "sealed";
    this.drillRecord = context?.mirrorDrillBest ?? 0;
    if (context?.mirrorStepComplete) {
      this.stage = "complete";
      this.recorded = 3;
      this.sources.forEach((source, index) => { source.recorded = true; source.ring.material = this.mat(`mirror-return-source-${index}`, saffron, saffron); });
    }
    this.hud.patch({
      chapter: "Chapter VIII · Mirror Step",
      questTitle: context?.mirrorStepComplete ? "The route keeps its countermark" : unlocked ? this.newPlus ? "Corroborate what the route can claim · New Journey+ mirror stance" : "Corroborate what the route can claim" : "Mirror Step awaits an open-margin record",
      questDetail: context?.mirrorStepComplete ? context.mirrorStepOutcome || "Return to the mirror instrument to practice a seasonal corroboration order." : unlocked ? this.newPlus ? "New Journey+ · mirror stance active: each stance choice carries its reversed meaning. The mirror reverses what you choose into what you keep." : "Reach the open mirror and press E. Then focus-pulse the observation, inference, and testimony stations." : "Carry the Salt Library’s Field Annotation and its open-margin signal to the evidence chamber.",
      glyphs: context?.mirrorStepComplete ? 3 : 0,
      glyphGoal: 3,
      season: this.mirrorSeason,
      timeOfDay: "Reflective hearing",
      notice: context?.mirrorStepComplete ? context.mirrorStepOutcome || "Margin Cartographer: an accountable route shows the source that supports it and the question that can still change it." : this.interlocutorVoice(),
      taraBond: context?.taraBond ?? 0,
      taraSaltRoute: context?.taraSaltRoute ?? 0,
      saltLibraryComplete: context?.saltLibraryComplete ?? false,
      fieldAnnotation: context?.fieldAnnotation ?? "",
      memoryStewardship: context?.memoryStewardship ?? "",
      chapterEightSignal: context?.chapterEightSignal ?? "",
      mirrorStepUnlocked: unlocked,
      mirrorSources: context?.mirrorStepComplete ? 3 : 0,
      mirrorStepComplete: context?.mirrorStepComplete ?? false,
      countermarkLens: context?.countermarkLens ?? "",
      corroborationChoice: context?.corroborationChoice ?? "",
      mirrorDrillBest: context?.mirrorDrillBest ?? 0,
      mirrorDrillSeason: context?.mirrorDrillSeason ?? "",
      mirrorStepOutcome: context?.mirrorStepOutcome ?? "",
      materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: context?.estuaryComplete ? 1 : 0, saltLeaf: context?.saltLibraryComplete ? 1 : 0 },
    });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }

  private createMirrorTerrain() {
    const ground = MeshBuilder.CreateGround("mirror-step-ground", { width: 30, height: 25, subdivisions: 14 }, this.scene); ground.material = this.mat("mirror-step-ground-mat", Color3.FromHexString("#37403F"), Color3.FromHexString("#151C21"));
    [-7.0, -2.5, 1.8, 6.1].forEach((x, index) => { const step = MeshBuilder.CreateBox(`mirror-step-terrace-${index}`, { width: 5.0, height: 0.24 + index * 0.055, depth: 3.38 }, this.scene); step.position = new Vector3(x, 0.14 + index * 0.045, 5.85 - index * 3.48); step.rotation.y = -0.47; step.material = this.mat(`mirror-step-terrace-mat-${index}`, index % 2 ? Color3.FromHexString("#8B5232") : Color3.FromHexString("#B79A66"), index % 2 ? Color3.FromHexString("#321807") : Color3.FromHexString("#372711")); });
    const path = MeshBuilder.CreateBox("mirror-step-diagonal-path", { width: 1.18, height: 0.06, depth: 21.5 }, this.scene); path.position = new Vector3(-0.2, 0.34, 0.16); path.rotation.y = -0.54; path.material = this.mat("mirror-step-path-mat", Color3.FromHexString("#C4AB77"), Color3.FromHexString("#34230D"));
    const thread = MeshBuilder.CreateBox("mirror-step-star-thread", { width: 0.115, height: 0.08, depth: 22 }, this.scene); thread.position = new Vector3(-1.02, 0.4, -0.08); thread.rotation.y = -0.54; thread.material = this.mat("mirror-step-thread-mat", starBlue, starBlue.scale(0.68), 0.82);
    for (let index = 0; index < 9; index += 1) { const etch = MeshBuilder.CreateBox(`mirror-step-path-etch-${index}`, { width: 0.76, height: 0.02, depth: 0.09 }, this.scene); etch.position = new Vector3(-5.9 + index * 1.42, 0.405 + index * 0.012, 5.2 - index * 1.07); etch.rotation.y = -0.54; etch.material = this.mat(`mirror-step-path-etch-mat-${index}`, copper, Color3.FromHexString("#3A1708")); }
    const backdrop = MeshBuilder.CreatePlane("mirror-step-visual-target", { width: 32, height: 18 }, this.scene); backdrop.position = new Vector3(0, 7.55, 14.45); backdrop.material = this.mat("mirror-step-visual-mat", Color3.FromHexString("#334A4B"), Color3.FromHexString("#18252A"), 0.34); const backdropMat = backdrop.material as StandardMaterial; backdropMat.backFaceCulling = false; backdropMat.diffuseTexture = new Texture(assets.mirrorStep, this.scene); backdropMat.emissiveTexture = new Texture(assets.mirrorStep, this.scene); backdropMat.emissiveColor = Color3.FromHexString("#263A3D");
    for (let index = 0; index < 12; index += 1) { const shard = MeshBuilder.CreateBox(`mirror-step-mineral-shard-${index}`, { width: 0.18, height: 0.82, depth: 0.18 }, this.scene); shard.position = new Vector3(-10.5 + ((index * 2.27) % 22), 0.46, 8.3 - ((index * 3.92) % 16)); shard.rotation.y = index * 0.58; shard.rotation.z = index % 2 ? 0.14 : -0.09; shard.material = this.mat(`mirror-step-shard-mat-${index}`, index % 3 === 0 ? jade : index % 3 === 1 ? parchment : starBlue, index % 3 === 0 ? Color3.FromHexString("#133B34") : Color3.FromHexString("#273E55")); }
  }

  private createSourceStations() {
    [[new Vector3(-5.6, 0.33, 2.0), "Observation basin", "It shows the water line in this chamber, not every condition beyond its frame.", starBlue], [new Vector3(-0.1, 0.33, -2.65), "Inference tablets", "It proposes a connection, but the counter-mark can still expose an overreach.", copper], [new Vector3(5.55, 0.33, 1.45), "Testimony stand", "It records a lived route account, which still asks how its conditions travel beside a map.", jade]].forEach(([position, label, limit, color], index) => {
      const root = new TransformNode(`mirror-source-${index}`, this.scene); root.position.copyFrom(position as Vector3);
      const base = MeshBuilder.CreateCylinder(`mirror-source-base-${index}`, { diameter: 1.25, height: 0.26, tessellation: 20 }, this.scene); base.parent = root; base.position.y = 0.13; base.material = this.mat(`mirror-source-base-mat-${index}`, Color3.FromHexString("#5B574C"));
      const mark = MeshBuilder.CreateDisc(`mirror-source-mark-${index}`, { radius: 0.47, tessellation: 26 }, this.scene); mark.parent = root; mark.position.y = 0.29; mark.rotation.x = Math.PI / 2; mark.material = this.mat(`mirror-source-mark-mat-${index}`, color as Color3, (color as Color3).scale(0.38));
      const ring = MeshBuilder.CreateTorus(`mirror-source-ring-${index}`, { diameter: 1.6, thickness: 0.11, tessellation: 34 }, this.scene); ring.parent = root; ring.position.y = 0.86; ring.rotation.x = Math.PI / 2; ring.material = this.mat(`mirror-source-ring-mat-${index}`, copper, Color3.FromHexString("#34170A"));
      this.sources.push({ root, ring, recorded: false, label: label as string, limit: limit as string, phase: index * 2.09 });
    });
  }

  private createMirrorCoreAndInterlocutor() {
    this.mirrorCore = new TransformNode("mirror-step-core", this.scene); this.mirrorCore.position.copyFrom(this.corePosition);
    const plinth = MeshBuilder.CreateCylinder("mirror-step-plinth", { diameter: 3.5, height: 0.26, tessellation: 34 }, this.scene); plinth.parent = this.mirrorCore; plinth.position.y = 0.13; plinth.material = this.mat("mirror-step-plinth-mat", Color3.FromHexString("#454B4B"));
    [3.12, 2.22, 1.26].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`mirror-step-ring-${index}`, { diameter, thickness: 0.075, tessellation: 36 }, this.scene); ring.parent = this.mirrorCore; ring.position.y = 1.16; ring.rotation.x = index === 1 ? 0 : Math.PI / 2; ring.rotation.z = index * 0.62; ring.material = this.mat(`mirror-step-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#103B34") : Color3.FromHexString("#351609")); this.mirrorRings.push(ring); });
    const mirror = MeshBuilder.CreateDisc("mirror-step-open-disk", { radius: 0.84, tessellation: 36 }, this.scene); mirror.parent = this.mirrorCore; mirror.position.y = 1.16; mirror.material = this.mat("mirror-step-open-disk-mat", salt, starBlue, 0.78);
    const countermark = MeshBuilder.CreateBox("mirror-step-countermark", { width: 0.88, height: 0.13, depth: 0.2 }, this.scene); countermark.parent = this.mirrorCore; countermark.position = new Vector3(0.78, 0.76, 0); countermark.rotation.z = -0.42; countermark.material = this.mat("mirror-step-countermark-mat", saffron, saffron);
    this.interlocutor = new TransformNode("mirror-step-margin-cartographer", this.scene); this.interlocutor.position = new Vector3(7.45, 0, -5.28);
    this.interlocutorFigure = buildNpcFigure({ scene: this.scene, root: this.interlocutor, name: "mirror-cartographer", robeColor: Color3.FromHexString("#42675E"), robeHeight: 1.34, robeDiameterTop: 0.4, robeDiameterBottom: 0.58, robeEmissive: Color3.FromHexString("#42675E").scale(0.05), skinColor: Color3.FromHexString("#A37050"), eyeColor: starBlue, shawlColor: salt, shawlWidth: 0.68, propColor: copper, propType: "mirror", propHeight: 1.5, propRotationZ: -0.19, posture: "upright", reducedMotion: () => this.hud.reducedMotion });
    this.interlocutorBillboard = createPortraitBillboard(this.scene, this.interlocutor, assets.mirrorStep, () => this.hud.reducedMotion);
  }

  update(delta: number) {
    const step = Math.min(delta, 0.05); const calm = this.hud.reducedMotion; this.time += step; this.pulseCooldown = Math.max(0, this.pulseCooldown - step); this.player.move(this.input.movement(), step, 4.7); this.player.update(step); if (!this.demo && this.input.consumePulse()) this.releasePulse(); if (!this.demo && this.input.consumeInteract()) this.interact(); this.ambient.update(step);
    this.sources.forEach((source) => { if (!source.recorded) { source.ring.rotation.z += calm ? step * 0.21 : step * 1.05; source.root.position.y = calm ? 0.33 : 0.33 + Math.sin(this.time * 1.5 + source.phase) * 0.07; } }); this.mirrorRings.forEach((ring, index) => { ring.rotation.z += step * (index % 2 ? -0.76 : 0.56) * (this.stage === "complete" ? 1.55 : 1) * (calm ? 0.2 : 1); }); this.interlocutor.position.y = calm ? 0 : Math.sin(this.time * 1.18) * 0.018; this.interlocutorFigure.update(step, this.time); this.interlocutorBillboard.update(this.player.root.position, this.camera.position);
    this.pulses = this.pulses.filter((pulse) => { pulse.age += step; pulse.ring.scaling.setAll(1 + pulse.age * 8); (pulse.ring.material as StandardMaterial).alpha = Math.max(0, 0.88 - pulse.age * 0.88); pulse.motes.forEach((mote, index) => { const angle = (Math.PI * 2 * index) / pulse.motes.length; mote.position.x += Math.cos(angle) * step * 2; mote.position.z += Math.sin(angle) * step * 2; mote.position.y += step * 0.72; mote.scaling.setAll(Math.max(0.05, 1 - pulse.age)); }); if (pulse.age > 1) { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; } return true; });
    this.cameraMotion.update(step, this.player, this.stage === "resolve" || this.stage === "corroborate" || this.stage === "complete" ? this.corePosition : this.stage === "sources" ? this.sources.find((source) => !source.recorded)?.root.position : undefined, this.input); this.hud.patch({ pulseReady: this.pulseCooldown <= 0 });
  }

  private releasePulse() {
    if (this.pulseCooldown > 0) return; this.pulseCooldown = 1.45; const ring = MeshBuilder.CreateTorus("mirror-step-focus-pulse", { diameter: 0.86, thickness: 0.07, tessellation: 38 }, this.scene); ring.position = this.player.root.position.clone(); ring.position.y = 0.28; ring.rotation.x = Math.PI / 2; ring.material = this.mat("mirror-step-pulse-mat", saffron, saffron, 0.88); const motes = Array.from({ length: 14 }, (_, index) => { const mote = MeshBuilder.CreateSphere(`mirror-step-pulse-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene); const angle = (Math.PI * 2 * index) / 14; mote.position = ring.position.add(new Vector3(Math.cos(angle) * 0.5, 0.04, Math.sin(angle) * 0.5)); mote.material = this.mat(`mirror-step-pulse-mote-mat-${index}`, saffron, saffron); return mote; }); this.pulses.push({ ring, motes, age: 0 }); this.cameraMotion.emphasize(); if (!this.demo) this.feedback.pulse();
    if (this.stage !== "sources") { this.hud.patch({ notice: this.stage === "sealed" ? "Mirror Step needs the Salt Library’s Field Annotation before any source can be weighed here." : "At Mirror Step, a pulse becomes a source mark only after the open mirror is addressed." }); return; }
    const source = this.sources.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!source) { this.hud.patch({ notice: "Stand by an unrecorded source station. Observation, inference, and testimony must stay distinct before the mirror can ask how they meet." }); return; }
    source.recorded = true; source.ring.material = this.mat(`mirror-source-recorded-${this.recorded}`, saffron, saffron); this.recorded += 1; if (!this.demo) this.feedback.collect();
    if (this.recorded === 3) { this.stage = "resolve"; this.hud.patch({ glyphs: 3, mirrorSources: 3, questTitle: "Test the route against its countermark", questDetail: "Return to the open mirror and press E. A route claim becomes accountable when a source and its limit are shown together.", notice: "Margin Cartographer: all three source marks are useful. Now ask what would have to be true for their agreement to mislead you." }); }
    else this.hud.patch({ glyphs: this.recorded, mirrorSources: this.recorded, notice: `${source.label} is carried with its limit: ${source.limit}` });
  }

  private interact() {
    if (this.stage === "sealed") { this.hud.patch({ notice: "Margin Cartographer: bring the Field Annotation from the Salt Library. A mirror cannot test a claim that has never shown its margin." }); return; }
    if (this.stage === "approach" && Vector3.Distance(this.player.root.position, this.corePosition) < 3.2) { this.stage = "sources"; if (!this.demo) this.feedback.speak(); this.hud.patch({ questTitle: "Trace three kinds of source", questDetail: "Use focus pulses at the observation basin, inference tablets, and testimony stand. Each source offers a use and a limit.", glyphs: 0, glyphGoal: 3, notice: `${this.interlocutorVoice()} The open mirror does not rank sources. It asks what each one can and cannot carry.` }); return; }
    if (this.stage === "resolve" && Vector3.Distance(this.player.root.position, this.corePosition) < 3.2) { this.openCorroboration(); return; }
    if (this.stage === "complete" && Vector3.Distance(this.player.root.position, this.corePosition) < 3.2) { this.startMirrorDrill(); return; }
    if (this.stage === "drill") { this.recordDrillSource(); return; }
    if (Vector3.Distance(this.player.root.position, this.interlocutor.position) < 3.2) { this.feedback.speak(); this.hud.patch({ notice: `${this.interlocutorVoice()} A route cannot be accountable if its reader cannot see where another experience might revise it.` }); }
  }

  private openCorroboration() { this.stage = "corroborate"; if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: true, choiceMode: "corroboration", countermarkLens: "Countermark Lens · claim and practical limit held together", questTitle: "Choose how the public route keeps its limit visible", questDetail: "The Margin Cartographer asks which corroboration should frame the route before another traveller must act on it.", notice: "The Countermark Lens opens beside the mirror. Tara asks which route claims most need a reader who can still disagree." }); }

  chooseStance = (trait: TraitKey) => {
    if (this.stage !== "corroborate") return; this.stage = "complete";
    // New Journey+ mirror stance: rotate the meaning of each stance.
    // viveka → sahas, sahas → karuna, karuna → viveka
    const mirror: Record<TraitKey, TraitKey> = { viveka: "sahas", sahas: "karuna", karuna: "viveka" };
    const effective = this.newPlus ? mirror[trait] : trait;
    const decisions: Record<TraitKey, string> = { viveka: "The observation is copied beside the counter-mark, so the route states what it can show without calling its frame the whole landscape.", sahas: "The provisional warning is carried with the failed route inference, so the next traveller can act without pretending uncertainty is silence.", karuna: "The testimony is placed beside the mapped hazard, so a route claim keeps the conditions of the people who must live with it in view." };
    const outcome = effective === "viveka" ? "Mirror Step record · the route names its frame and its countermark." : effective === "sahas" ? "Mirror Step record · the warning remains usable while its failed inference stays visible." : "Mirror Step record · the map carries testimony beside the risk it describes.";
    const chapterNineSignal = effective === "viveka" ? "Chapter IX · The Confluence Table calls: bring the framed observation where river, ridge, and salt routes must share a public measure." : effective === "sahas" ? "Chapter IX · The Confluence Table calls: bring the provisional warning so a shared route can show what remains unproved without becoming silent." : "Chapter IX · The Confluence Table calls: bring the testimony map so the next public record can name who must still answer it.";
    const mirrorNote = this.newPlus ? " New Journey+ · mirror stance: your choice carried a reversed meaning." : "";
    if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: false, mirrorStepComplete: true, mirrorSources: 3, countermarkLens: "Countermark Lens · claim and practical limit held together", corroborationChoice: decisions[effective], mirrorStepOutcome: outcome, chapterNineSignal, confluenceReady: true, milestone: "Countermark Lens · accountable route carried", questTitle: "A confluence answers", questDetail: chapterNineSignal, notice: `${decisions[effective]} Margin Cartographer: the route can now travel without claiming to have finished the world it describes.${mirrorNote}`, materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: 1, saltLeaf: 1 } });
  };

  private startMirrorDrill() {
    const orders = [["Observation basin", "Inference tablets", "Testimony stand"], ["Inference tablets", "Testimony stand", "Observation basin"], ["Testimony stand", "Observation basin", "Inference tablets"]]; const index = this.mirrorSeason.includes("Varsha") ? 1 : this.mirrorSeason.includes("Hemanta") ? 2 : 0; this.drillOrder = orders[index]; this.drillProgress = 0; this.stage = "drill"; this.sources.forEach((source, sourceIndex) => { source.recorded = false; source.ring.material = this.mat(`mirror-drill-reset-${sourceIndex}`, copper, Color3.FromHexString("#351609")); }); this.hud.patch({ glyphs: 0, glyphGoal: 3, questTitle: "Seasonal corroboration route", questDetail: `Trace the ${this.mirrorSeason.split(" · ")[0]} source order: ${this.drillOrder.join(" → ")}. Stand by each station and press E.`, mirrorDrillSeason: this.mirrorSeason, notice: "Margin Cartographer: replay is not rote. A season can change which source must be heard before the next conclusion is trusted." });
  }

  private recordDrillSource() { const source = this.sources.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!source) { this.hud.patch({ notice: "Stand beside the next unrecorded source station and press E to place it in the seasonal corroboration route." }); return; } const expected = this.drillOrder[this.drillProgress]; if (source.label !== expected) { this.hud.patch({ notice: `${source.label} arrived too early. This seasonal route still begins with ${expected}.` }); if (!this.demo) this.feedback.speak(); return; } source.recorded = true; source.ring.material = this.mat(`mirror-drill-aligned-${this.drillProgress}`, saffron, saffron); this.drillProgress += 1; if (!this.demo) this.feedback.collect(); if (this.drillProgress === 3) { this.stage = "complete"; this.drillRecord += 1; this.hud.patch({ glyphs: 3, mirrorDrillBest: this.drillRecord, mirrorDrillSeason: this.mirrorSeason, milestone: `Mirror route · ${this.mirrorSeason.split(" · ")[0]} corroboration recorded`, questTitle: "The corroboration route is carried", questDetail: `Seasonal corroboration ${this.drillRecord} recorded. Return later to test another source order without erasing the first.`, notice: "Tara: a return plan changes when conditions change. The point is not to make one source speak for all the others." }); } else this.hud.patch({ glyphs: this.drillProgress, mirrorDrillBest: this.drillRecord, notice: `${source.label} carried. Next: ${this.drillOrder[this.drillProgress]}.` }); }

  private interlocutorVoice() { if (!this.context?.chapterEightSignal) return "Margin Cartographer: this chamber opens only after a record has learned how to show what it leaves unresolved."; if (this.context.chapterEightSignal.includes("ledger")) return "Margin Cartographer: you carried a ledger that knows its uncertainty. Here, see whether the condition that limits a claim can also make it more useful."; if (this.context.chapterEightSignal.includes("wind warning")) return "Margin Cartographer: you carried a warning that refuses to be filed away. Here, test whether an urgent sign still needs a counter-example beside it."; return "Margin Cartographer: you carried a testimony map with an open margin. Here, ask how a route changes when the person it describes can still revise the line."; }
  advanceSeason = () => { const season = this.ambient.advanceSeason(); this.mirrorSeason = season; this.hud.patch({ season, mirrorDrillSeason: season, notice: `${season} changes the evidence emphasis and the optional corroboration order. A finished mirror route can now practice a different source sequence.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time} shifts the mirror’s reading surface. The Countermark Lens keeps an accountable route legible without pretending it has the last word.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: this.context?.returnObservatoryComplete ? "Aruna’s Observatory return note: the countermark now meets an amendment line, keeping the earlier source and later condition readable without pretending either ends the inquiry." : this.context?.confluenceComplete ? "Aruna’s Mirror Step return note: the public table shows why the countermark matters—an accountable route also needs the condition that calls a reader back." : "Aruna’s Mirror Step note: the point of naming a source is not to make it obey a hierarchy. It is to make its reach and limit available for another careful reader.", muni: this.context?.returnObservatoryComplete ? "Laya’s Observatory return note: amendment is another interval of inquiry; it leaves a place for the reader who sees the next condition." : this.context?.confluenceComplete ? "Laya’s Mirror Step return note: a route braid stays open because its return condition gives another person a moment to enter the inquiry." : "Laya’s Mirror Step note: a shared inquiry needs time for another person to point to the step you moved past too quickly.", raja: `Somavrat’s Mirror Step note: ${this.context?.amendmentChoice || this.context?.publicRouteChoice || this.context?.memoryStewardship || "public records become answerable when their readers can see which conditions shaped a route."}` }; this.hud.patch({ notice: notes[guide] }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.interlocutorBillboard.dispose(); this.pulses.forEach((pulse) => { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}
