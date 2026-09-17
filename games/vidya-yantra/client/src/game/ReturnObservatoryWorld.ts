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

type ReturnWindow = { root: TransformNode; ring: Mesh; recorded: boolean; label: string; change: string; phase: number };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };
const saffron = Color3.FromHexString("#F26B38");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const parchment = Color3.FromHexString("#D7B77D");
const starBlue = Color3.FromHexString("#A8D7E8");

export class ReturnObservatoryWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private windows: ReturnWindow[] = [];
  private pulses: Pulse[] = [];
  private armillary!: TransformNode;
  private tender!: TransformNode;
  private tenderFigure!: NpcFigure;
  private tenderBillboard!: PortraitBillboard;
  private armillaryRings: Mesh[] = [];
  private time = 0;
  private pulseCooldown = 0;
  private recorded = 0;
  private stage: "sealed" | "approach" | "windows" | "lineage" | "choice" | "complete" | "drill" = "approach";
  private readonly armillaryPosition = new Vector3(4.05, 0, -4.15);
  private drillOrder: string[] = [];
  private drillProgress = 0;
  private drillRecord = 0;
  private observatorySeason = "Sharad · clear river";
  private newPlus = false;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.createTerrain();
    this.ambient = new AmbientLife(scene, "returnObservatory", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-9.2, 0, 8.1), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "returnObservatory", () => this.hud.reducedMotion);
    this.createWindows();
    this.createArmillaryAndTender();
    const unlocked = Boolean(context?.chapterTenReady && context?.confluenceComplete && context?.routeBraid);
    if (!unlocked) this.stage = "sealed";
    this.drillRecord = context?.observatoryDrillBest ?? 0;
    if (context?.returnObservatoryComplete) {
      this.stage = "complete";
      this.recorded = 3;
      this.windows.forEach((window, index) => { window.recorded = true; window.ring.material = this.mat(`return-complete-window-${index}`, saffron, saffron); });
    }
    this.hud.patch({
      chapter: "Chapter X · Return Observatory",
      questTitle: context?.returnObservatoryComplete ? "The amendment keeps its lineage" : unlocked ? this.newPlus ? "Return to three changed conditions · New Journey+ no-pulse" : "Return to three changed conditions" : "The Return Observatory awaits a carried braid",
      questDetail: context?.returnObservatoryComplete ? context.amendmentChoice || "Return to the armillary to practice a seasonal amendment order." : unlocked ? this.newPlus ? "New Journey+ · no-pulse mode: walk to each return window and press E to read it. The focus pulse is silent on the return; seeing replaces it." : "Reach the copper armillary and press E. Then focus-pulse the River Measure, Wind Dial, and Shore Folio." : "Carry Route Braid from the Confluence Table before the Observatory can read a change.",
      glyphs: context?.returnObservatoryComplete ? 3 : 0,
      glyphGoal: 3,
      season: this.observatorySeason,
      timeOfDay: "Return fieldwork",
      notice: context?.returnObservatoryComplete ? context.amendmentChoice || "Observatory Tender: an amendment travels honestly when the earlier line remains legible beside the changed condition." : this.tenderVoice(),
      taraBond: context?.taraBond ?? 0,
      confluenceComplete: context?.confluenceComplete ?? false,
      routeBraid: context?.routeBraid ?? "",
      publicRouteChoice: context?.publicRouteChoice ?? "",
      chapterTenReady: unlocked,
      returnObservatoryReady: unlocked,
      returnWindows: context?.returnObservatoryComplete ? 3 : 0,
      returnObservatoryComplete: context?.returnObservatoryComplete ?? false,
      revisionCompass: context?.revisionCompass ?? "",
      amendmentChoice: context?.amendmentChoice ?? "",
      observatoryDrillBest: context?.observatoryDrillBest ?? 0,
      observatoryDrillSeason: context?.observatoryDrillSeason ?? "",
      taraReturnLine: context?.taraReturnLine ?? false,
      chapterElevenSignal: context?.chapterElevenSignal ?? "",
      chapterElevenReady: context?.chapterElevenReady ?? false,
      materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: context?.estuaryComplete ? 1 : 0, saltLeaf: context?.saltLibraryComplete ? 1 : 0, confluenceSeal: context?.confluenceComplete ? 1 : 0, observatoryFolio: context?.returnObservatoryComplete ? 1 : 0 },
    });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }

  private createTerrain() {
    const ground = MeshBuilder.CreateGround("return-ground", { width: 32, height: 27, subdivisions: 14 }, this.scene); ground.material = this.mat("return-ground-mat", Color3.FromHexString("#252C31"), Color3.FromHexString("#091215"));
    const undercourt = MeshBuilder.CreateCylinder("return-undercourt", { diameter: 23.6, height: 0.13, tessellation: 64 }, this.scene); undercourt.position.y = 0.02; undercourt.material = this.mat("return-undercourt-mat", Color3.FromHexString("#37403D"), Color3.FromHexString("#14201D"));
    [20.5, 16.2, 11.1].forEach((diameter, index) => { const inlay = MeshBuilder.CreateTorus(`return-ground-inlay-${index}`, { diameter, thickness: 0.035, tessellation: 64 }, this.scene); inlay.position.y = 0.1 + index * 0.012; inlay.rotation.x = Math.PI / 2; inlay.material = this.mat(`return-ground-inlay-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#12342E") : Color3.FromHexString("#301306")); });
    [[-7.4, 6.4, "#806044"], [-3.1, 2.85, "#6E4031"], [1.15, -0.75, "#8E6948"], [5.45, -4.25, "#5D3A30"]].forEach(([x, z, color], index) => { const terrace = MeshBuilder.CreateBox(`return-terrace-${index}`, { width: 5.5, height: 0.3 + index * 0.055, depth: 3.6 }, this.scene); terrace.position = new Vector3(x as number, 0.16 + index * 0.05, z as number); terrace.rotation.y = -0.51; terrace.material = this.mat(`return-terrace-mat-${index}`, Color3.FromHexString(color as string), Color3.FromHexString("#28150D")); const edge = MeshBuilder.CreateBox(`return-terrace-edge-${index}`, { width: 5.1, height: 0.04, depth: 0.12 }, this.scene); edge.position = new Vector3(x as number, 0.34 + index * 0.05, (z as number) - 1.47); edge.rotation.y = -0.51; edge.material = this.mat(`return-terrace-edge-mat-${index}`, copper, Color3.FromHexString("#301306")); });
    const path = MeshBuilder.CreateBox("return-parchment-path", { width: 1.22, height: 0.075, depth: 22.8 }, this.scene); path.position = new Vector3(-0.72, 0.39, 0.34); path.rotation.y = -0.54; path.material = this.mat("return-path-mat", Color3.FromHexString("#B39362"), Color3.FromHexString("#321F0E"));
    [-1.35, -0.1].forEach((offset, index) => { const edge = MeshBuilder.CreateBox(`return-path-edge-${index}`, { width: 0.045, height: 0.035, depth: 23.1 }, this.scene); edge.position = new Vector3(offset, 0.47, 0.2); edge.rotation.y = -0.54; edge.material = this.mat(`return-path-edge-mat-${index}`, copper, Color3.FromHexString("#321508")); });
    for (let index = 0; index < 11; index += 1) { const etch = MeshBuilder.CreateBox(`return-path-etch-${index}`, { width: 0.78, height: 0.025, depth: 0.09 }, this.scene); etch.position = new Vector3(-7.2 + index * 1.35, 0.47 + index * 0.012, 6.0 - index * 1.1); etch.rotation.y = -0.54; etch.material = this.mat(`return-path-etch-mat-${index}`, copper, Color3.FromHexString("#351609")); }
    const channel = MeshBuilder.CreateBox("return-condition-channel", { width: 0.24, height: 0.04, depth: 21.4 }, this.scene); channel.position = new Vector3(-1.74, 0.47, 0.1); channel.rotation.y = -0.54; channel.material = this.mat("return-condition-channel-mat", starBlue, starBlue.scale(0.38), 0.82);
    const backdrop = MeshBuilder.CreatePlane("return-target", { width: 32, height: 18 }, this.scene); backdrop.position = new Vector3(0, 7.8, 14.65); const backdropMat = this.mat("return-target-mat", Color3.FromHexString("#3B493C"), Color3.FromHexString("#192F2F"), 0.38); backdropMat.backFaceCulling = false; backdropMat.diffuseTexture = new Texture(assets.returnObservatory, this.scene); backdropMat.emissiveTexture = new Texture(assets.returnObservatory, this.scene); backdrop.material = backdropMat;
    for (let index = 0; index < 15; index += 1) { const marker = MeshBuilder.CreateBox(`return-mineral-marker-${index}`, { width: 0.18, height: 0.78, depth: 0.18 }, this.scene); marker.position = new Vector3(-10.4 + ((index * 2.19) % 22), 0.42, 8.8 - ((index * 3.13) % 17)); marker.rotation.y = index * 0.49; marker.material = this.mat(`return-mineral-marker-mat-${index}`, index % 3 === 0 ? jade : index % 3 === 1 ? parchment : starBlue, index % 3 === 0 ? Color3.FromHexString("#143C35") : Color3.FromHexString("#263E55")); }
  }

  private createWindows() {
    [[new Vector3(-5.6, 0.38, 2.75), "River Measure", "the water frame rose beyond the earlier line", starBlue], [new Vector3(0.15, 0.38, -2.55), "Wind Dial", "the ridge corridor shifted before the warning arrived", copper], [new Vector3(6.45, 0.38, 1.9), "Shore Folio", "the salt edge changed the reader’s access condition", jade]].forEach(([position, label, change, color], index) => {
      const root = new TransformNode(`return-window-${index}`, this.scene); root.position.copyFrom(position as Vector3);
      const base = MeshBuilder.CreateCylinder(`return-window-base-${index}`, { diameter: 1.48, height: 0.28, tessellation: 24 }, this.scene); base.parent = root; base.position.y = 0.14; base.material = this.mat(`return-window-base-mat-${index}`, Color3.FromHexString("#50544B"), Color3.FromHexString("#1D211A"));
      const plate = MeshBuilder.CreateDisc(`return-window-plate-${index}`, { radius: 0.52, tessellation: 28 }, this.scene); plate.parent = root; plate.position.y = 0.3; plate.rotation.x = Math.PI / 2; plate.material = this.mat(`return-window-plate-mat-${index}`, color as Color3, (color as Color3).scale(0.36));
      const ring = MeshBuilder.CreateTorus(`return-window-ring-${index}`, { diameter: 1.74, thickness: 0.11, tessellation: 36 }, this.scene); ring.parent = root; ring.position.y = 0.93; ring.rotation.x = Math.PI / 2; ring.material = this.mat(`return-window-ring-mat-${index}`, copper, Color3.FromHexString("#351609"));
      const needle = MeshBuilder.CreateBox(`return-window-needle-${index}`, { width: 0.08, height: 0.06, depth: 0.63 }, this.scene); needle.parent = root; needle.position.y = 0.98; needle.rotation.y = index * 0.76; needle.material = this.mat(`return-window-needle-mat-${index}`, index === 0 ? starBlue : index === 1 ? copper : jade, (color as Color3).scale(0.4));
      this.windows.push({ root, ring, recorded: false, label: label as string, change: change as string, phase: index * 2.1 });
    });
  }

  private createArmillaryAndTender() {
    this.armillary = new TransformNode("return-armillary", this.scene); this.armillary.position.copyFrom(this.armillaryPosition);
    const plinth = MeshBuilder.CreateCylinder("return-armillary-plinth", { diameter: 5.55, height: 0.36, tessellation: 48 }, this.scene); plinth.parent = this.armillary; plinth.position.y = 0.18; plinth.material = this.mat("return-armillary-plinth-mat", Color3.FromHexString("#3C4B47"), Color3.FromHexString("#14201E"));
    const table = MeshBuilder.CreateCylinder("return-folio-table", { diameter: 3.92, height: 0.13, tessellation: 42 }, this.scene); table.parent = this.armillary; table.position.y = 0.43; table.material = this.mat("return-folio-table-mat", Color3.FromHexString("#C19E69"), Color3.FromHexString("#412A12"));
    [5.15, 4.02, 2.82, 1.55].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`return-armillary-ring-${index}`, { diameter, thickness: 0.1, tessellation: 48 }, this.scene); ring.parent = this.armillary; ring.position.y = 0.62 + index * 0.08; ring.rotation.x = index % 2 ? 0 : Math.PI / 2; ring.rotation.z = index * 0.52; ring.material = this.mat(`return-armillary-ring-mat-${index}`, index === 2 ? jade : copper, index === 2 ? Color3.FromHexString("#113C35") : Color3.FromHexString("#351609")); this.armillaryRings.push(ring); });
    for (let index = 0; index < 10; index += 1) { const arm = MeshBuilder.CreateBox(`return-armillary-arm-${index}`, { width: 0.12, height: 0.07, depth: 1.95 }, this.scene); arm.parent = this.armillary; arm.position.y = 0.77; arm.rotation.y = (Math.PI * 2 * index) / 10; arm.material = this.mat(`return-armillary-arm-mat-${index}`, index % 2 ? copper : starBlue, index % 2 ? Color3.FromHexString("#351609") : Color3.FromHexString("#1A3A51")); }
    const seam = MeshBuilder.CreateBox("return-amendment-seam", { width: 0.08, height: 0.055, depth: 2.65 }, this.scene); seam.parent = this.armillary; seam.position.y = 0.88; seam.rotation.y = -0.25; seam.material = this.mat("return-amendment-seam-mat", saffron, saffron.scale(0.62));
    const core = MeshBuilder.CreateSphere("return-lineage-core", { diameter: 0.56, segments: 12 }, this.scene); core.parent = this.armillary; core.position.y = 0.99; core.material = this.mat("return-lineage-core-mat", starBlue, starBlue.scale(0.74));
    this.tender = new TransformNode("observatory-tender", this.scene); this.tender.position = new Vector3(6.95, 0, -5.65);
    this.tenderFigure = buildNpcFigure({ scene: this.scene, root: this.tender, name: "observatory-tender", robeColor: Color3.FromHexString("#5D5639"), robeHeight: 1.42, robeDiameterTop: 0.5, robeDiameterBottom: 0.68, robeEmissive: Color3.FromHexString("#5D5639").scale(0.05), skinColor: Color3.FromHexString("#A37050"), eyeColor: starBlue, shawlColor: parchment, shawlWidth: 0.74, propColor: copper, propType: "lantern", propHeight: 1.58, propRotationZ: -0.18, posture: "bent", reducedMotion: () => this.hud.reducedMotion });
    this.tenderBillboard = createPortraitBillboard(this.scene, this.tender, assets.returnObservatory, () => this.hud.reducedMotion);
  }

  update(delta: number) {
    const step = Math.min(delta, 0.05); const calm = this.hud.reducedMotion; this.time += step; this.pulseCooldown = Math.max(0, this.pulseCooldown - step); this.player.move(this.input.movement(), step, 4.7); this.player.update(step); if (!this.demo && this.input.consumePulse()) this.releasePulse(); if (!this.demo && this.input.consumeInteract()) this.interact(); this.ambient.update(step);
    this.windows.forEach((window) => { if (!window.recorded) { window.ring.rotation.z += calm ? step * 0.21 : step * 1.03; window.root.position.y = calm ? 0.38 : 0.38 + Math.sin(this.time * 1.48 + window.phase) * 0.07; } }); this.armillaryRings.forEach((ring, index) => { ring.rotation.z += step * (index % 2 ? -0.68 : 0.54) * (this.stage === "complete" ? 1.45 : 1) * (calm ? 0.2 : 1); }); this.tender.position.y = calm ? 0 : Math.sin(this.time * 1.08) * 0.018; this.tenderFigure.update(step, this.time); this.tenderBillboard.update(this.player.root.position, this.camera.position);
    this.pulses = this.pulses.filter((pulse) => { pulse.age += step; pulse.ring.scaling.setAll(1 + pulse.age * 8); (pulse.ring.material as StandardMaterial).alpha = Math.max(0, 0.88 - pulse.age * 0.88); pulse.motes.forEach((mote, index) => { const angle = (Math.PI * 2 * index) / pulse.motes.length; mote.position.x += Math.cos(angle) * step * 2; mote.position.z += Math.sin(angle) * step * 2; mote.position.y += step * 0.72; mote.scaling.setAll(Math.max(0.05, 1 - pulse.age)); }); if (pulse.age > 1) { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; } return true; });
    this.cameraMotion.update(step, this.player, this.stage === "lineage" || this.stage === "choice" || this.stage === "complete" ? this.armillaryPosition : this.stage === "windows" ? this.windows.find((window) => !window.recorded)?.root.position : undefined, this.input); this.hud.patch({ pulseReady: this.pulseCooldown <= 0 });
  }

  private releasePulse() {
    if (this.pulseCooldown > 0) return; this.pulseCooldown = 1.42; const ring = MeshBuilder.CreateTorus("return-focus-pulse", { diameter: 0.88, thickness: 0.07, tessellation: 38 }, this.scene); ring.position = this.player.root.position.clone(); ring.position.y = 0.28; ring.rotation.x = Math.PI / 2; ring.material = this.mat("return-pulse-mat", saffron, saffron, 0.88); const motes = Array.from({ length: 14 }, (_, index) => { const mote = MeshBuilder.CreateSphere(`return-pulse-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene); const angle = (Math.PI * 2 * index) / 14; mote.position = ring.position.add(new Vector3(Math.cos(angle) * 0.5, 0.04, Math.sin(angle) * 0.5)); mote.material = this.mat(`return-pulse-mote-mat-${index}`, saffron, saffron); return mote; }); this.pulses.push({ ring, motes, age: 0 }); this.cameraMotion.emphasize(); if (!this.demo) this.feedback.pulse();
    if (this.stage !== "windows") { this.hud.patch({ notice: this.stage === "sealed" ? "Observatory Tender: carry Route Braid from the Confluence Table. A route can only be amended when its earlier source and return condition remain visible." : "At the Return Observatory, a pulse becomes a comparison only beside a changed condition." }); return; }
    if (this.newPlus) { this.hud.patch({ notice: "New Journey+ · no-pulse mode: the focus pulse is silent on the return. Walk to each return window and press E to read it." }); return; }
    const window = this.windows.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!window) { this.hud.patch({ notice: "Stand by an unrecorded return window. River, ridge, and shore change must remain distinct before their lineage can be compared." }); return; }
    window.recorded = true; window.ring.material = this.mat(`return-window-recorded-${this.recorded}`, saffron, saffron); this.recorded += 1; if (!this.demo) this.feedback.collect();
    if (this.recorded === 3) { this.stage = "lineage"; this.hud.patch({ glyphs: 3, returnWindows: 3, questTitle: "Trace the amendment lineage", questDetail: "Return to the copper armillary and press E. Keep the earlier route, changed condition, and next reader visible together.", notice: "Observatory Tender: change does not make the earlier line useless. It asks the route to show what it could reach, what now differs, and who must see the amendment." }); } else this.hud.patch({ glyphs: this.recorded, returnWindows: this.recorded, notice: `${window.label} carried: ${window.change}.` });
  }

  private interact() {
    if (this.stage === "sealed") { this.hud.patch({ notice: "Observatory Tender: bring Route Braid from the Confluence Table. A public line cannot be returned responsibly until it still names its source and return condition." }); return; }
    if (this.newPlus && this.stage === "windows") { const window = this.windows.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (window) { window.recorded = true; window.ring.material = this.mat(`return-window-recorded-${this.recorded}`, saffron, saffron); this.recorded += 1; if (!this.demo) this.feedback.collect(); if (this.recorded === 3) { this.stage = "lineage"; this.hud.patch({ glyphs: 3, returnWindows: 3, questTitle: "Trace the amendment lineage", questDetail: "Return to the copper armillary and press E. Keep the earlier route, changed condition, and next reader visible together.", notice: "Observatory Tender: change does not make the earlier line useless. It asks the route to show what it could reach, what now differs, and who must see the amendment." }); } else this.hud.patch({ glyphs: this.recorded, returnWindows: this.recorded, notice: `${window.label} read carefully: ${window.change}.` }); return; } this.hud.patch({ notice: "New Journey+ · no-pulse mode: stand by an unrecorded return window and press E to read it." }); return; }
    if (this.stage === "approach" && Vector3.Distance(this.player.root.position, this.armillaryPosition) < 3.4) { this.stage = "windows"; if (!this.demo) this.feedback.speak(); this.hud.patch({ questTitle: "Read three changed conditions", questDetail: this.newPlus ? "New Journey+ · no-pulse: walk to each return window and press E. River Measure, Wind Dial, and Shore Folio each carry a changed condition." : "Use focus pulses at the River Measure, Wind Dial, and Shore Folio. Each window carries a changed condition beside the earlier route.", glyphs: 0, glyphGoal: 3, notice: `${this.tenderVoice()} The armillary needs three changes before any amendment can be shared.` }); return; }
    if (this.stage === "lineage" && Vector3.Distance(this.player.root.position, this.armillaryPosition) < 3.4) { this.openAmendmentChoice(); return; }
    if (this.stage === "complete" && Vector3.Distance(this.player.root.position, this.armillaryPosition) < 3.4) { this.startObservatoryDrill(); return; }
    if (this.stage === "drill") { this.recordDrillWindow(); return; }
    if (Vector3.Distance(this.player.root.position, this.tender.position) < 3.2) { this.feedback.speak(); this.hud.patch({ notice: `${this.tenderVoice()} A careful route does not punish its earlier reader. It gives the next reader a line of sight to what changed.` }); }
  }

  private openAmendmentChoice() { this.stage = "choice"; if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: true, choiceMode: "observatory", questTitle: "Choose the public amendment", questDetail: "The Observatory Tender asks what changes, what remains useful, and which reader must carry the amendment forward.", notice: "Tara: the six knots did not end in a final answer. They taught us to return with the line that lets someone else see the ground change." }); }

  chooseStance = (trait: TraitKey) => {
    if (this.stage !== "choice") return; this.stage = "complete";
    const choices: Record<TraitKey, string> = { viveka: "The river route is amended beside its earlier gauge reach; the folio names the next water reader who must compare the line after another rise.", sahas: "The ridge warning remains visible beside its first wind corridor; the amendment asks the next traveler to publish the shifted passage before urgency becomes certainty.", karuna: "The shore route keeps its earlier access line beside the changed salt edge; the folio names the reader whose daily crossing must meet the amendment first." };
    const revisionCompass = trait === "viveka" ? "Revision Compass · compare earlier reach, changed water frame, and next reader" : trait === "sahas" ? "Revision Compass · compare earlier warning, shifted wind corridor, and next reader" : "Revision Compass · compare earlier shore route, changed access condition, and next reader";
    const chapterElevenSignal = trait === "viveka" ? "Chapter XI · the Living Survey receives a water line that carries both an earlier reach and a return to measure again." : trait === "sahas" ? "Chapter XI · the Living Survey receives a warning lineage that can be revised before the next traveler relies on it." : "Chapter XI · the Living Survey receives a shore amendment that leaves a place for the next reader’s crossing.";
    if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: false, returnObservatoryComplete: true, returnWindows: 3, revisionCompass, amendmentChoice: choices[trait], observatoryDrillBest: this.drillRecord, taraReturnLine: true, chapterElevenSignal, chapterElevenReady: true, milestone: "Revision Compass · the earlier line remains visible beside its amendment", questTitle: "The route carries its lineage", questDetail: revisionCompass, notice: `${choices[trait]} Observatory Tender: an amendment becomes care when it leaves both the earlier use and the changed condition visible to the next reader.`, materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: this.context?.estuaryComplete ? 1 : 0, saltLeaf: this.context?.saltLibraryComplete ? 1 : 0, confluenceSeal: this.context?.confluenceComplete ? 1 : 0, observatoryFolio: 1 } });
  };

  private startObservatoryDrill() {
    const orders = [["River Measure", "Wind Dial", "Shore Folio"], ["Wind Dial", "Shore Folio", "River Measure"], ["Shore Folio", "River Measure", "Wind Dial"]]; const index = this.observatorySeason.includes("Varsha") ? 1 : this.observatorySeason.includes("Hemanta") ? 2 : 0; this.drillOrder = orders[index]; this.drillProgress = 0; this.stage = "drill"; this.windows.forEach((window, windowIndex) => { window.recorded = false; window.ring.material = this.mat(`return-drill-reset-${windowIndex}`, copper, Color3.FromHexString("#351609")); }); this.hud.patch({ glyphs: 0, glyphGoal: 3, questTitle: "Seasonal amendment order", questDetail: `Trace the ${this.observatorySeason.split(" · ")[0]} return order: ${this.drillOrder.join(" → ")}. Stand by each window and press E.`, observatoryDrillSeason: this.observatorySeason, notice: "Observatory Tender: a changed condition arrives in a different order with each season. Replay is a way to see which reader must receive the amendment first." });
  }

  private recordDrillWindow() { const window = this.windows.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!window) { this.hud.patch({ notice: "Stand beside the next unrecorded return window and press E to place it in the seasonal amendment order." }); return; } const expected = this.drillOrder[this.drillProgress]; if (window.label !== expected) { this.hud.patch({ notice: `${window.label} arrived too early. This seasonal amendment still begins with ${expected}.` }); if (!this.demo) this.feedback.speak(); return; } window.recorded = true; window.ring.material = this.mat(`return-drill-aligned-${this.drillProgress}`, saffron, saffron); this.drillProgress += 1; if (!this.demo) this.feedback.collect(); if (this.drillProgress === 3) { this.stage = "complete"; this.drillRecord += 1; this.hud.patch({ glyphs: 3, observatoryDrillBest: this.drillRecord, observatoryDrillSeason: this.observatorySeason, milestone: `Return Observatory · ${this.observatorySeason.split(" · ")[0]} amendment order recorded`, questTitle: "The amendment can travel again", questDetail: `Seasonal amendment ${this.drillRecord} recorded. Return later to compare another order without erasing the earlier line.`, notice: "Tara: an unbound line is not a loose line. It stays tied to the reader who can show where the ground changed." }); } else this.hud.patch({ glyphs: this.drillProgress, observatoryDrillBest: this.drillRecord, notice: `${window.label} carried. Next: ${this.drillOrder[this.drillProgress]}.` }); }

  private tenderVoice() { if (!this.context?.chapterTenSignal) return "Observatory Tender: this instrument opens when a public route can return to the source that changes it."; if (this.context.chapterTenSignal.includes("gauge record")) return "Observatory Tender: the gauge taught a useful reach. Return now to see whether the water line still grants it the same path."; if (this.context.chapterTenSignal.includes("warning")) return "Observatory Tender: the warning was worth carrying. Return now to see how the wind corridor has changed the reach of its urgency."; return "Observatory Tender: the public route named a reader who could amend it. Return now to make that reader’s changed shore visible beside the earlier line."; }
  advanceSeason = () => { const season = this.ambient.advanceSeason(); this.observatorySeason = season; this.hud.patch({ season, observatoryDrillSeason: season, notice: `${season} changes the first return window in the optional amendment order. The Revision Compass keeps earlier line, changed condition, and reader distinct.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time} changes the armillary’s reading surface. The amendment keeps its lineage visible to the next reader.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: "Aruna’s Observatory note: a change becomes more useful when the earlier observation stays readable beside it, rather than being quietly overwritten.", muni: "Laya’s Observatory note: return is a practice of attention. It leaves enough quiet for the next reader to point to a changed condition.", raja: `Somavrat’s Observatory note: ${this.context?.publicRouteChoice || "a public route must say which reader needs to see the amendment before relying on it."}` }; this.hud.patch({ notice: notes[guide] }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.tenderBillboard.dispose(); this.pulses.forEach((pulse) => { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}
