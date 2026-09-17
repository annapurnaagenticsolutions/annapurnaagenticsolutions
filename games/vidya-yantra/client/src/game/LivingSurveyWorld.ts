import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { AmbientLife } from "./AmbientLife";
import { assets } from "./assets";
import { CinematicCamera } from "./CinematicCamera";
import { HudBridge, type TraitKey } from "./HudBridge";
import { InputManager } from "./InputManager";
import { Player, buildNpcFigure, createPortraitBillboard, type NpcFigure, type PortraitBillboard } from "./Player";
import { SoundFeedback } from "./SoundFeedback";
import type { JourneyContext } from "./scene";

type SurveyStation = { root: TransformNode; ring: Mesh; label: string; variance: string; reader: string; recorded: boolean; phase: number };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };
type LineageLayer = { root: TransformNode; plate: Mesh; id: "earlier" | "amendment" | "variance" | "reader"; copy: string; inspected: boolean; phase: number };

const indigo = Color3.FromHexString("#071025");
const copper = Color3.FromHexString("#B66A35");
const parchment = Color3.FromHexString("#D7B77D");
const jade = Color3.FromHexString("#3A7968");
const saffron = Color3.FromHexString("#F26B38");
const starBlue = Color3.FromHexString("#A8D7E8");

export class LivingSurveyWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private stations: SurveyStation[] = [];
  private pulses: Pulse[] = [];
  private surveyor!: TransformNode;
  private surveyorFigure!: NpcFigure;
  private surveyorBillboard!: PortraitBillboard;
  private instrument!: TransformNode;
  private rings: Mesh[] = [];
  private chamberLayers: LineageLayer[] = [];
  private time = 0;
  private pulseCooldown = 0;
  private recorded = 0;
  private stage: "sealed" | "approach" | "stations" | "chamber" | "choice" | "complete" | "drill" = "approach";
  private drillOrder: string[] = [];
  private drillProgress = 0;
  private drillRecord = 0;
  private surveySeason = "Sharad · clear basin";

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.createTerrain();
    this.createBuiltCourt();
    this.ambient = new AmbientLife(scene, "returnObservatory", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-9, 0, 7.6), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "returnObservatory", () => this.hud.reducedMotion);
    this.createStations();
    this.createInstrument();
    this.createLineageChamber();
    this.createSurveyor();
    const unlocked = Boolean(context?.chapterElevenReady && context?.returnObservatoryComplete && (context?.revisionCompass || context?.amendmentChoice || context?.chapterTenReady));
    if (!unlocked) this.stage = "sealed";
    if (context?.livingSurveyComplete) {
      this.stage = "complete";
      this.recorded = 3;
      this.stations.forEach((station) => { station.recorded = true; station.ring.material = this.mat(`survey-complete-${station.label}`, saffron, saffron); });
    }
    this.drillRecord = context?.surveyDrillBest ?? 0;
    this.hud.patch({
      chapter: "Chapter XI · The Living Survey",
      questTitle: context?.livingSurveyComplete ? "The variance can travel" : unlocked ? "Read three field variances" : "The Living Survey awaits a visible lineage",
      questDetail: context?.livingSurveyComplete ? context.variancePublication || "Replay the seasonal variance order at the survey instrument." : unlocked ? "Carry the earlier line, its amendment, and the next reader to the three basin marks." : "Complete the Return Observatory and carry its visible lineage before the survey can compare a new field mark.",
      glyphs: context?.livingSurveyComplete ? 3 : 0,
      glyphGoal: 3,
      season: this.surveySeason,
      timeOfDay: "Late fieldwork",
      notice: context?.livingSurveyComplete ? context.varianceChoice || "Surveyor of Returns: a variance is useful when its frame remains visible beside the route it changes." : this.surveyorVoice(),
      chapterElevenSignal: context?.chapterElevenSignal ?? "",
      chapterElevenReady: context?.chapterElevenReady ?? false,
      livingSurveyUnlocked: unlocked,
      livingSurveyMarks: context?.livingSurveyComplete ? 3 : 0,
      livingSurveyComplete: context?.livingSurveyComplete ?? false,
      terrainRegister: context?.terrainRegister ?? "",
      varianceChoice: context?.varianceChoice ?? "",
      variancePublication: context?.variancePublication ?? "",
      surveyorEncountered: context?.surveyorEncountered ?? false,
      surveyDrillBest: this.drillRecord,
      surveyDrillSeason: context?.surveyDrillSeason ?? "",
      campaignComplete: context?.campaignComplete ?? false,
      lineageComparisonViewed: context?.lineageComparisonViewed ?? false,
      lineageComparisonLayer: context?.lineageComparisonLayer ?? "earlier",
      surveyNoPulse: context?.surveyNoPulse ?? false,
      surveyChallengeBest: context?.surveyChallengeBest ?? 0,
      journeyMode: context?.journeyMode ?? "new",
      materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: 0, saltLeaf: 0, confluenceSeal: 0, observatoryFolio: 0 },
    });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }

  private createTerrain() {
    const ground = MeshBuilder.CreateGround("survey-ground", { width: 32, height: 27, subdivisions: 16 }, this.scene); ground.material = this.mat("survey-ground-mat", Color3.FromHexString("#1A2930"), indigo.scale(0.7));
    const basin = MeshBuilder.CreateCylinder("survey-basin", { diameter: 23.5, height: 0.16, tessellation: 64 }, this.scene); basin.position.y = 0.04; basin.material = this.mat("survey-basin-mat", Color3.FromHexString("#334644"), Color3.FromHexString("#10211F"));
    [20.8, 16.4, 11.6].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`survey-inlay-${index}`, { diameter, thickness: 0.04, tessellation: 64 }, this.scene); ring.position.y = 0.13 + index * 0.014; ring.rotation.x = Math.PI / 2; ring.material = this.mat(`survey-inlay-mat-${index}`, index === 1 ? jade : copper, index === 1 ? jade.scale(0.26) : copper.scale(0.18)); });
    const route = MeshBuilder.CreateBox("survey-earlier-route", { width: 1.12, height: 0.08, depth: 22.8 }, this.scene); route.position = new Vector3(-0.85, 0.42, 0.3); route.rotation.y = -0.55; route.material = this.mat("survey-earlier-route-mat", parchment, parchment.scale(0.2));
    const amendment = MeshBuilder.CreateBox("survey-amendment-arc", { width: 0.13, height: 0.055, depth: 21.6 }, this.scene); amendment.position = new Vector3(-1.9, 0.49, 0.25); amendment.rotation.y = -0.55; amendment.material = this.mat("survey-amendment-mat", jade, jade.scale(0.4), 0.88);
    const water = MeshBuilder.CreateBox("survey-water-edge", { width: 0.28, height: 0.05, depth: 19.5 }, this.scene); water.position = new Vector3(-7.5, 0.45, 0.3); water.rotation.y = -0.55; water.material = this.mat("survey-water-mat", starBlue, starBlue.scale(0.5), 0.82);
    for (let index = 0; index < 13; index += 1) { const marker = MeshBuilder.CreateBox(`survey-marker-${index}`, { width: 0.2, height: 0.72, depth: 0.2 }, this.scene); marker.position = new Vector3(-10 + ((index * 2.17) % 21), 0.44, 8.6 - ((index * 3.27) % 16)); marker.rotation.y = index * 0.38; marker.material = this.mat(`survey-marker-mat-${index}`, index % 3 === 0 ? jade : index % 3 === 1 ? parchment : starBlue, indigo.scale(0.2)); }
    const plate = MeshBuilder.CreatePlane("living-survey-concept-plate", { width: 11.8, height: 6.64 }, this.scene); plate.position = new Vector3(0.2, 3.7, -11.8); plate.rotation.x = -0.08; const plateMat = this.mat("living-survey-concept-plate-mat", Color3.White(), Color3.White().scale(0.26), 0.34); plateMat.diffuseTexture = new Texture(assets.livingSurvey, this.scene); plateMat.emissiveTexture = plateMat.diffuseTexture; plate.material = plateMat;
  }

  private createBuiltCourt() {
    const pilgrimage = MeshBuilder.CreateBox("survey-pilgrimage-path", { width: 1.08, height: 0.13, depth: 19.8 }, this.scene); pilgrimage.position = new Vector3(-0.9, 0.27, 0.65); pilgrimage.rotation.y = -0.55; pilgrimage.material = this.mat("survey-pilgrimage-path-mat", parchment, parchment.scale(0.12));
    [[-8.4, 0.3, 6.8, 4.2, 1.25, 3.1], [-5.9, 0.32, 4.3, 3.0, 1.0, 2.3], [5.7, 0.3, -5.9, 4.0, 1.25, 2.8], [8.1, 0.28, -2.6, 2.5, 1.0, 3.6]].forEach(([x, y, z, width, height, depth], index) => { const terrace = MeshBuilder.CreateBox(`survey-terrace-${index}`, { width, height, depth }, this.scene); terrace.position = new Vector3(x, y, z); terrace.material = this.mat(`survey-terrace-mat-${index}`, index % 2 ? Color3.FromHexString("#6A4A34") : Color3.FromHexString("#4B554C"), index % 2 ? copper.scale(0.12) : jade.scale(0.08)); const edge = MeshBuilder.CreateBox(`survey-terrace-edge-${index}`, { width: width + 0.08, height: 0.06, depth: 0.1 }, this.scene); edge.position = new Vector3(x, y + height / 2 + 0.04, z + depth / 2 - 0.05); edge.material = this.mat(`survey-terrace-edge-mat-${index}`, copper, copper.scale(0.28)); });
    [-6.5, -3.2, 0.1, 3.4, 6.7].forEach((offset, index) => { const mark = MeshBuilder.CreateTorus(`survey-etched-mark-${index}`, { diameter: 0.58, thickness: 0.035, tessellation: 24 }, this.scene); mark.position = new Vector3(-0.9 + offset * 0.42, 0.36, 0.55 - offset); mark.rotation.x = Math.PI / 2; mark.material = this.mat(`survey-etched-mark-mat-${index}`, index % 2 ? jade : copper, index % 2 ? jade.scale(0.22) : copper.scale(0.22)); });
  }

  private createStations() {
    [[new Vector3(-5.8, 0.38, 2.8), "Water Reach", "the basin holds a higher return edge than the earlier gauge line", "downstream readers", starBlue], [new Vector3(0, 0.38, -2.5), "Ridge Passage", "the wind corridor opens later than the amended warning predicted", "ridge walkers", copper], [new Vector3(6.2, 0.38, 2.0), "Shore Access", "the salt edge leaves one crossing open for a different daily reader", "shore carriers", jade]].forEach(([position, label, variance, reader, color], index) => {
      const root = new TransformNode(`survey-station-${index}`, this.scene); root.position.copyFrom(position as Vector3);
      const base = MeshBuilder.CreateCylinder(`survey-station-base-${index}`, { diameter: 1.52, height: 0.28, tessellation: 24 }, this.scene); base.parent = root; base.position.y = 0.14; base.material = this.mat(`survey-station-base-mat-${index}`, Color3.FromHexString("#4A5149"), indigo.scale(0.2));
      const plate = MeshBuilder.CreateDisc(`survey-station-plate-${index}`, { radius: 0.52, tessellation: 28 }, this.scene); plate.parent = root; plate.position.y = 0.31; plate.rotation.x = Math.PI / 2; plate.material = this.mat(`survey-station-plate-mat-${index}`, color as Color3, (color as Color3).scale(0.32));
      const ring = MeshBuilder.CreateTorus(`survey-station-ring-${index}`, { diameter: 1.76, thickness: 0.1, tessellation: 36 }, this.scene); ring.parent = root; ring.position.y = 0.93; ring.rotation.x = Math.PI / 2; ring.material = this.mat(`survey-station-ring-mat-${index}`, copper, copper.scale(0.22));
      this.stations.push({ root, ring, label: label as string, variance: variance as string, reader: reader as string, recorded: false, phase: index * 2.2 });
    });
  }

  private createInstrument() {
    this.instrument = new TransformNode("living-survey-instrument", this.scene); this.instrument.position = new Vector3(4.1, 0, -4.1);
    const plinth = MeshBuilder.CreateCylinder("survey-instrument-plinth", { diameter: 5.4, height: 0.38, tessellation: 48 }, this.scene); plinth.parent = this.instrument; plinth.position.y = 0.19; plinth.material = this.mat("survey-instrument-plinth-mat", Color3.FromHexString("#3A4A46"), indigo.scale(0.2));
    const table = MeshBuilder.CreateCylinder("survey-register-table", { diameter: 3.92, height: 0.13, tessellation: 42 }, this.scene); table.parent = this.instrument; table.position.y = 0.45; table.material = this.mat("survey-register-table-mat", Color3.FromHexString("#B99763"), copper.scale(0.18));
    [5.12, 4.0, 2.8, 1.55].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`survey-armillary-ring-${index}`, { diameter, thickness: 0.1, tessellation: 48 }, this.scene); ring.parent = this.instrument; ring.position.y = 0.64 + index * 0.08; ring.rotation.x = index % 2 ? 0 : Math.PI / 2; ring.rotation.z = index * 0.5; ring.material = this.mat(`survey-armillary-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? jade.scale(0.28) : copper.scale(0.2)); this.rings.push(ring); });
    const earlier = MeshBuilder.CreateBox("survey-earlier-seam", { width: 0.08, height: 0.06, depth: 2.75 }, this.scene); earlier.parent = this.instrument; earlier.position.y = 0.9; earlier.rotation.y = -0.2; earlier.material = this.mat("survey-earlier-seam-mat", parchment, parchment.scale(0.42));
    const variance = MeshBuilder.CreateBox("survey-variance-seam", { width: 0.08, height: 0.07, depth: 2.2 }, this.scene); variance.parent = this.instrument; variance.position.y = 0.94; variance.rotation.y = 0.54; variance.material = this.mat("survey-variance-seam-mat", saffron, saffron.scale(0.6));
    const core = MeshBuilder.CreateSphere("survey-core", { diameter: 0.54, segments: 12 }, this.scene); core.parent = this.instrument; core.position.y = 1.02; core.material = this.mat("survey-core-mat", starBlue, starBlue.scale(0.65));
  }

  private createLineageChamber() {
    const layers: { id: LineageLayer["id"]; color: Color3; position: Vector3; copy: string; phase: number }[] = [
      { id: "earlier", color: parchment, position: new Vector3(1.05, 0, -6.45), copy: "Earlier line · source, water level, and return marker.", phase: 0 },
      { id: "amendment", color: jade, position: new Vector3(4.05, 0, -7.25), copy: "Amendment · a changed condition remains beside the earlier reach.", phase: 1.3 },
      { id: "variance", color: saffron, position: new Vector3(7.0, 0, -5.45), copy: "Variance · this basin mark names where the ground differs now.", phase: 2.6 },
      { id: "reader", color: starBlue, position: new Vector3(6.2, 0, -2.35), copy: "Next reader · a public route remains open to a later comparison.", phase: 3.9 },
    ];
    layers.forEach((layer, index) => {
      const root = new TransformNode(`lineage-leaf-${layer.id}`, this.scene); root.position.copyFrom(layer.position);
      const base = MeshBuilder.CreateCylinder(`lineage-leaf-base-${layer.id}`, { diameter: 1.45, height: 0.2, tessellation: 24 }, this.scene); base.parent = root; base.position.y = 0.12; base.material = this.mat(`lineage-leaf-base-mat-${layer.id}`, Color3.FromHexString("#384943"), indigo.scale(0.2));
      const plate = MeshBuilder.CreateBox(`lineage-leaf-plate-${layer.id}`, { width: 1.04, height: 0.08, depth: 0.74 }, this.scene); plate.parent = root; plate.position.y = 0.35; plate.rotation.y = index * 0.48; plate.material = this.mat(`lineage-leaf-plate-mat-${layer.id}`, layer.color, layer.color.scale(0.22));
      const thread = MeshBuilder.CreateBox(`lineage-thread-${layer.id}`, { width: 0.045, height: 0.04, depth: 2.15 }, this.scene); thread.parent = root; thread.position = new Vector3(0, 0.44, 0.84); thread.rotation.y = index * 0.48; thread.material = this.mat(`lineage-thread-mat-${layer.id}`, layer.color, layer.color.scale(0.48), 0.84);
      this.chamberLayers.push({ root, plate, id: layer.id, copy: layer.copy, inspected: false, phase: layer.phase });
    });
  }

  private createSurveyor() { this.surveyor = new TransformNode("surveyor-of-returns", this.scene); this.surveyor.position = new Vector3(6.85, 0, -5.55); this.surveyorFigure = buildNpcFigure({ scene: this.scene, root: this.surveyor, name: "surveyor", robeColor: Color3.FromHexString("#5A513A"), robeHeight: 1.45, robeDiameterTop: 0.5, robeDiameterBottom: 0.7, robeEmissive: Color3.FromHexString("#5A513A").scale(0.05), skinColor: Color3.FromHexString("#A37050"), eyeColor: starBlue, shawlColor: parchment, shawlWidth: 0.74, propColor: copper, propType: "instrument", propHeight: 1.64, propRotationZ: -0.18, posture: "upright", reducedMotion: () => this.hud.reducedMotion }); this.surveyorBillboard = createPortraitBillboard(this.scene, this.surveyor, assets.livingSurvey, () => this.hud.reducedMotion); }

  update(delta: number) { const step = Math.min(delta, 0.05); const calm = this.hud.reducedMotion; this.time += step; this.pulseCooldown = Math.max(0, this.pulseCooldown - step); this.player.move(this.input.movement(), step, 4.7); this.player.update(step); if (!this.demo && this.input.consumePulse() && !(this.context?.journeyMode === "new-plus" && this.context?.surveyNoPulse && this.stage === "drill")) this.releasePulse(); if (!this.demo && this.input.consumeInteract()) this.interact(); this.ambient.update(step); this.stations.forEach((station) => { if (!station.recorded) { station.ring.rotation.z += calm ? step * 0.2 : step; station.root.position.y = calm ? 0.38 : 0.38 + Math.sin(this.time * 1.4 + station.phase) * 0.07; } }); this.chamberLayers.forEach((layer) => { if (!layer.inspected) { layer.root.position.y = calm ? 0 : Math.sin(this.time * 1.12 + layer.phase) * 0.04; layer.plate.rotation.y += calm ? step * 0.04 : step * 0.18; } }); this.rings.forEach((ring, index) => { ring.rotation.z += step * (index % 2 ? -0.66 : 0.5) * (this.stage === "complete" ? 1.4 : 1) * (calm ? 0.2 : 1); }); this.surveyor.position.y = calm ? 0 : Math.sin(this.time * 1.08) * 0.018; this.surveyorFigure.update(step, this.time); this.surveyorBillboard.update(this.player.root.position, this.camera.position); this.cameraMotion.update(step, this.player, this.stage === "chamber" || this.stage === "choice" || this.stage === "complete" ? this.instrument.position : this.stage === "stations" ? this.stations.find((station) => !station.recorded)?.root.position : undefined, this.input); this.hud.patch({ pulseReady: this.pulseCooldown <= 0 }); this.pulses = this.pulses.filter((pulse) => { pulse.age += step; pulse.ring.scaling.setAll(1 + pulse.age * 8); (pulse.ring.material as StandardMaterial).alpha = Math.max(0, 0.88 - pulse.age * 0.88); pulse.motes.forEach((mote, index) => { const angle = (Math.PI * 2 * index) / pulse.motes.length; mote.position.x += Math.cos(angle) * step * 2; mote.position.z += Math.sin(angle) * step * 2; mote.position.y += step * 0.72; mote.scaling.setAll(Math.max(0.05, 1 - pulse.age)); }); if (pulse.age > 1) { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; } return true; }); }

  private releasePulse() { if (this.pulseCooldown > 0) return; this.pulseCooldown = 1.4; const ring = MeshBuilder.CreateTorus("survey-focus-pulse", { diameter: 0.88, thickness: 0.07, tessellation: 38 }, this.scene); ring.position = this.player.root.position.clone(); ring.position.y = 0.28; ring.rotation.x = Math.PI / 2; ring.material = this.mat("survey-pulse-mat", saffron, saffron, 0.88); const motes = Array.from({ length: 14 }, (_, index) => { const mote = MeshBuilder.CreateSphere(`survey-pulse-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene); const angle = (Math.PI * 2 * index) / 14; mote.position = ring.position.add(new Vector3(Math.cos(angle) * 0.5, 0.04, Math.sin(angle) * 0.5)); mote.material = this.mat(`survey-pulse-mote-mat-${index}`, saffron, saffron); return mote; }); this.pulses.push({ ring, motes, age: 0 }); this.cameraMotion.emphasize(); if (!this.demo) this.feedback.pulse(); if (this.stage !== "stations") { this.hud.patch({ notice: this.stage === "sealed" ? "Surveyor of Returns: complete the Return Observatory so the earlier line and amendment remain visible here." : "A pulse becomes a variance only when it meets a recorded condition." }); return; } const station = this.stations.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!station) { this.hud.patch({ notice: "Stand beside an unrecorded basin mark. The terrain register needs its condition and next reader together." }); return; } station.recorded = true; station.ring.material = this.mat(`survey-recorded-${this.recorded}`, saffron, saffron); this.recorded += 1; if (!this.demo) this.feedback.collect(); this.hud.patch({ glyphs: this.recorded, livingSurveyMarks: this.recorded, notice: `${station.label} variance recorded: ${station.variance}. Reader named: ${station.reader}.` }); if (this.recorded === 3) { this.stage = "chamber"; this.hud.patch({ questTitle: "Enter the lineage chamber", questDetail: "Walk the four copper leaves: earlier route, amendment, variance, and next reader. Keep each layer distinct before publication.", notice: "Surveyor of Returns: the field mark is not a replacement. It is a new frame asking the route to show what changed." }); } }

  private interact() { if (this.stage === "sealed") { this.hud.patch({ notice: "Surveyor of Returns: carry a completed Return Observatory lineage before the Living Survey can read a new variance." }); return; } if (this.stage === "approach" && Vector3.Distance(this.player.root.position, this.instrument.position) < 3.5) { this.stage = "stations"; this.hud.patch({ surveyorEncountered: true, questTitle: "Read three field variances", questDetail: "Focus-pulse the Water Reach, Ridge Passage, and Shore Access marks. Record each condition without overwriting the earlier line.", notice: `${this.surveyorVoice()} The register opens when every changed condition can name a reader.` }); if (!this.demo) this.feedback.speak(); return; } if (this.stage === "chamber") { this.inspectLineageLayer(); return; } if (this.stage === "complete" && Vector3.Distance(this.player.root.position, this.instrument.position) < 3.6) { this.startDrill(); return; } if (this.stage === "drill") { this.recordDrill(); return; } if (Vector3.Distance(this.player.root.position, this.surveyor.position) < 3.3) { this.hud.patch({ surveyorEncountered: true, notice: `${this.surveyorVoice()} A surveyor of returns keeps a place for the next reader to disagree with care.` }); if (!this.demo) this.feedback.speak(); } }

  private inspectLineageLayer() { const layer = this.chamberLayers.find((entry) => !entry.inspected && Vector3.Distance(entry.root.position, this.player.root.position) < 2.25); if (!layer) { const next = this.chamberLayers.find((entry) => !entry.inspected); this.hud.patch({ notice: next ? `Walk to the ${next.id} leaf on the copper table and press E. The layers must remain distinct before a public notation can travel.` : "All four leaves are visible. Return to the central register." }); return; } layer.inspected = true; layer.plate.material = this.mat(`lineage-inspected-${layer.id}`, saffron, saffron.scale(0.55)); const inspected = this.chamberLayers.filter((entry) => entry.inspected).length; this.hud.patch({ lineageComparisonViewed: true, lineageComparisonLayer: layer.id, questTitle: "Inspect the visible lineage", questDetail: `${inspected} / 4 table leaves compared. ${layer.copy}`, notice: `Lineage leaf held apart: ${layer.copy}` }); if (!this.demo) this.feedback.collect(); if (inspected === 4) { this.stage = "choice"; this.hud.patch({ choiceOpen: true, choiceMode: "survey", questTitle: "Publish a visible variance", questDetail: "All four physical leaves remain visible. Choose which reader-facing notation should travel with the earlier route and its amendment.", notice: "Tara: no leaf became the whole table. Let the public notation show where the ground disagreed." }); } }

  chooseStance = (trait: TraitKey) => { if (this.stage !== "choice") return; this.stage = "complete"; const choices: Record<TraitKey, { register: string; publication: string; copy: string }> = { viveka: { register: "Register · water reach, amended frame, downstream reader", publication: "Publish the variance beside the earlier line so downstream readers can compare the raised basin edge before relying on the route.", copy: "Variance published with a visible comparison for the next water reader." }, sahas: { register: "Register · ridge passage, warning amendment, ridge walker", publication: "Publish the variance at the ridge passage so walkers can see the later opening before treating the amended warning as fixed.", copy: "Variance published with a visible comparison for the next ridge walker." }, karuna: { register: "Register · shore access, salt amendment, shore carrier", publication: "Publish the variance beside the shore line so daily carriers can find the changed crossing before the public route narrows their choice.", copy: "Variance published with a visible comparison for the next shore carrier." } }; const choice = choices[trait]; const signal = "Chapter XI · the Living Survey keeps an earlier line, an amendment, and a reader’s variance visible together."; this.hud.patch({ choiceOpen: false, livingSurveyComplete: true, livingSurveyMarks: 3, terrainRegister: choice.register, varianceChoice: choice.copy, variancePublication: choice.publication, campaignComplete: true, chapterElevenSignal: signal, chapterElevenReady: true, surveyDrillBest: this.drillRecord, milestone: "Living Survey · variance published beside its lineage", questTitle: "The campaign remains open to return", questDetail: choice.publication, notice: `${choice.publication} Surveyor of Returns: comparison is a form of care when the next reader can see the disagreement.` }); if (!this.demo) this.feedback.align(); }

  private startDrill() { const orders = [["Water Reach", "Ridge Passage", "Shore Access"], ["Ridge Passage", "Shore Access", "Water Reach"], ["Shore Access", "Water Reach", "Ridge Passage"], ["Water Reach", "Shore Access", "Ridge Passage"], ["Ridge Passage", "Water Reach", "Shore Access"], ["Shore Access", "Ridge Passage", "Water Reach"]]; const seasonIndex = this.surveySeason.includes("Vasanta") ? 0 : this.surveySeason.includes("Grishma") ? 1 : this.surveySeason.includes("Varsha") ? 2 : this.surveySeason.includes("Sharad") ? 3 : this.surveySeason.includes("Hemanta") ? 4 : 5; this.drillOrder = orders[seasonIndex]; this.drillProgress = 0; this.stage = "drill"; this.stations.forEach((station) => { station.recorded = false; station.ring.material = this.mat(`survey-drill-reset-${station.label}`, copper, copper.scale(0.2)); }); const newPlus = this.context?.journeyMode === "new-plus"; const noPulse = newPlus && this.context?.surveyNoPulse; this.hud.patch({ glyphs: 0, questTitle: newPlus ? "New Journey+ seasonal ladder" : "Seasonal variance order", questDetail: `Trace the ${this.surveySeason.split(" · ")[0]} order: ${this.drillOrder.join(" → ")}. Stand beside each mark and press E.${noPulse ? " No-pulse practice is active: measure only by position and attention." : ""}`, surveyDrillSeason: this.surveySeason, notice: newPlus ? this.seasonalNewJourneyVoice() : "Surveyor of Returns: replay changes the order of attention, not the truth of the earlier record." }); }

  private surveyorVoice() { if (this.context?.journeyMode === "new-plus") return this.seasonalNewJourneyVoice(); if (!this.context?.variancePublication) return "Surveyor of Returns: a field mark becomes useful when its condition, frame, and next reader remain visible."; return "Surveyor of Returns: the published variance is still open to another reader’s comparison."; }
  private seasonalNewJourneyVoice() { if (this.surveySeason.includes("Vasanta")) return "Surveyor of Returns · Vasanta: carried mastery should make a new question more careful, not make the spring route seem already known."; if (this.surveySeason.includes("Grishma")) return "Surveyor of Returns · Grishma: heat exposes what a carried technique cannot repair alone; keep the next reader in view."; if (this.surveySeason.includes("Varsha")) return "Surveyor of Returns · Varsha: a returning traveler may know a tool, but the water still asks for a fresh measure."; if (this.surveySeason.includes("Sharad")) return "Surveyor of Returns · Sharad: clarity is an invitation to compare layers, not permission to collapse them."; if (this.surveySeason.includes("Hemanta")) return "Surveyor of Returns · Hemanta: a record carries farther when repair and restraint travel with it."; return "Surveyor of Returns · Shishira: quiet ground lets a returning traveler hear which difference still deserves attention."; }
  private recordDrill() { const station = this.stations.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!station) { this.hud.patch({ notice: "Stand beside the next unrecorded variance mark before pressing E." }); return; } const expected = this.drillOrder[this.drillProgress]; if (station.label !== expected) { this.hud.patch({ notice: `${station.label} arrived too early. This seasonal survey begins with ${expected}.` }); return; } station.recorded = true; this.drillProgress += 1; if (this.drillProgress === 3) { this.stage = "complete"; this.drillRecord += 1; this.hud.patch({ glyphs: 3, surveyDrillBest: this.drillRecord, surveyDrillSeason: this.surveySeason, milestone: `Living Survey · ${this.surveySeason.split(" · ")[0]} variance order recorded`, notice: "Tara: the route is not loosened by a new mark. It becomes more honest about where the ground asked us to look again." }); } else this.hud.patch({ glyphs: this.drillProgress, surveyDrillBest: this.drillRecord, notice: `${station.label} carried. Next: ${this.drillOrder[this.drillProgress]}.` }); }

  advanceSeason = () => { this.surveySeason = this.ambient.advanceSeason(); this.hud.patch({ season: this.surveySeason, surveyDrillSeason: this.surveySeason, notice: `${this.surveySeason} changes which variance arrives first. The register keeps the three frames distinct.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time} changes the survey instrument’s reading surface without erasing its earlier line.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: "Aruna’s Living Survey note: compare a new mark with the observation it can actually reach, not with a claim larger than its frame.", muni: "Laya’s Living Survey note: attention becomes collective when the register leaves another reader enough room to disagree.", raja: `Somavrat’s Living Survey note: ${this.context?.variancePublication || "a public variance must name who will rely on it first."}` }; this.hud.patch({ notice: notes[guide] }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.surveyorBillboard.dispose(); this.pulses.forEach((pulse) => { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}

// The class is intentionally framework-agnostic: React owns the frame while Babylon owns this field.
const _keepType = LivingSurveyWorld;
void _keepType;
