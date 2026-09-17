// Chapter VII design reminder: the Salt Library is an original civic field archive where observation, record, and testimony remain distinct but travel together.
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

type MemoryCasket = { root: TransformNode; ring: Mesh; recorded: boolean; label: string; limit: string; phase: number };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };
const saffron = Color3.FromHexString("#F26B38");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const parchment = Color3.FromHexString("#D7B77D");
const tideBlue = Color3.FromHexString("#78BAC8");
const salt = Color3.FromHexString("#DEE4DF");

export class SaltLibraryWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private caskets: MemoryCasket[] = [];
  private pulses: Pulse[] = [];
  private libraryCore!: TransformNode;
  private steward!: TransformNode;
  private stewardFigure!: NpcFigure;
  private stewardBillboard!: PortraitBillboard;
  private memoryRings: Mesh[] = [];
  private time = 0;
  private pulseCooldown = 0;
  private recorded = 0;
  private stage: "sealed" | "approach" | "records" | "annotate" | "memory" | "drill" | "complete" = "approach";
  private readonly corePosition = new Vector3(5.7, 0, -4.45);
  private drillOrder: string[] = [];
  private drillProgress = 0;
  private drillRecord = 0;
  private saltSeason = "Hemanta · salt wind";
  private newPlus = false;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.createLibraryTerrain();
    this.ambient = new AmbientLife(scene, "saltLibrary", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-8.35, 0, 7.4), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "saltLibrary", () => this.hud.reducedMotion);
    this.createCaskets();
    this.createCoreAndSteward();
    const unlocked = Boolean(context?.estuaryComplete && context?.chapterSevenSignal && context?.mangroveTechnique);
    if (!unlocked) this.stage = "sealed";
    this.drillRecord = context?.saltDrillBest ?? 0;
    if (context?.saltLibraryComplete) {
      this.stage = "complete";
      this.recorded = 3;
      this.caskets.forEach((casket, index) => { casket.recorded = true; casket.ring.material = this.mat(`salt-return-casket-${index}`, saffron, saffron); });
    }
    this.hud.patch({
      chapter: "Chapter VII · The Salt Library", questTitle: context?.saltLibraryComplete ? "The shared record stays legible" : unlocked ? this.newPlus ? "The coast keeps more than one memory · New Journey+ hidden markers" : "The coast keeps more than one memory" : "The Salt Library waits for a tide record", questDetail: context?.saltLibraryComplete ? context.chapterEightSignal || "Return to the archive core to practice a changing memory route." : unlocked ? this.newPlus ? "New Journey+ · hidden markers: the casket rings glow faintly. Navigate the library from memory to find each record." : "Reach the memory table and press E. Then use focus pulses at watch-mark, route-mark, and shore-voice caskets." : "Carry Mangrove Refuge and the Estuary’s shared tide record to the windward archive.", glyphs: context?.saltLibraryComplete ? 3 : 0, glyphGoal: 3, season: this.saltSeason, timeOfDay: "Windward ledger", notice: context?.saltLibraryComplete ? context.chapterEightSignal || "Library Steward: the record is not finished because it has been copied; it is finished only when readers can name what it leaves open." : this.newPlus ? `${this.stewardVoice()} New Journey+ · hidden markers active: the caskets do not glow. A returning reader should find them by memory.` : this.stewardVoice(), taraBond: context?.taraBond ?? 0, taraEstuaryRoute: context?.taraEstuaryRoute ?? 0, estuaryComplete: context?.estuaryComplete ?? false, mangroveTechnique: context?.mangroveTechnique ?? "", stewardshipChoice: context?.stewardshipChoice ?? "", chapterSevenSignal: context?.chapterSevenSignal ?? "", saltLibraryUnlocked: unlocked, saltRecords: context?.saltLibraryComplete ? 3 : 0, saltLibraryComplete: context?.saltLibraryComplete ?? false, fieldAnnotation: context?.fieldAnnotation ?? "", saltMarshTechnique: context?.saltMarshTechnique ?? "", memoryStewardship: context?.memoryStewardship ?? "", taraSaltRoute: context?.taraSaltRoute ?? 0, saltDrillBest: context?.saltDrillBest ?? 0, saltDrillSeason: context?.saltDrillSeason ?? "", chapterEightSignal: context?.chapterEightSignal ?? "", materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: context?.estuaryComplete ? 1 : 0, saltLeaf: context?.saltLibraryComplete ? 1 : 0 } });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }

  private createLibraryTerrain() {
    const ground = MeshBuilder.CreateGround("salt-library-cliff-ground", { width: 29, height: 25, subdivisions: 14 }, this.scene); ground.material = this.mat("salt-library-ground-mat", Color3.FromHexString("#5B5D53"), Color3.FromHexString("#1C2425"));
    [-7.2, -2.7, 1.5, 6.0].forEach((x, index) => { const step = MeshBuilder.CreateBox(`salt-library-terrace-${index}`, { width: 4.85, height: 0.23 + index * 0.055, depth: 3.45 }, this.scene); step.position = new Vector3(x, 0.13 + index * 0.045, 5.8 - index * 3.48); step.rotation.y = -0.47; step.material = this.mat(`salt-library-terrace-mat-${index}`, index % 2 ? Color3.FromHexString("#8C6040") : Color3.FromHexString("#B6AF94"), index % 2 ? Color3.FromHexString("#39200C") : Color3.FromHexString("#2E3431")); });
    const path = MeshBuilder.CreateBox("salt-library-diagonal-path", { width: 1.15, height: 0.055, depth: 21 }, this.scene); path.position = new Vector3(-0.18, 0.33, 0.2); path.rotation.y = -0.54; path.material = this.mat("salt-library-path-mat", Color3.FromHexString("#C0A878"), Color3.FromHexString("#32200C"));
    const thread = MeshBuilder.CreateBox("salt-library-tide-thread", { width: 0.12, height: 0.075, depth: 21.5 }, this.scene); thread.position = new Vector3(-1.03, 0.39, -0.06); thread.rotation.y = -0.54; thread.material = this.mat("salt-library-thread-mat", tideBlue, tideBlue.scale(0.68), 0.82);
    for (let index = 0; index < 9; index += 1) { const etch = MeshBuilder.CreateBox(`salt-library-path-etch-${index}`, { width: 0.72, height: 0.02, depth: 0.085 }, this.scene); etch.position = new Vector3(-5.8 + index * 1.4, 0.4 + index * 0.012, 5.12 - index * 1.06); etch.rotation.y = -0.54; etch.material = this.mat(`salt-library-path-etch-mat-${index}`, copper, Color3.FromHexString("#391908")); }
    const backdrop = MeshBuilder.CreatePlane("salt-library-visual-target", { width: 32, height: 18 }, this.scene); backdrop.position = new Vector3(0, 7.6, 14.5); backdrop.material = this.mat("salt-library-visual-mat", Color3.FromHexString("#384642"), Color3.FromHexString("#1B292A"), 0.34); const backdropMat = backdrop.material as StandardMaterial; backdropMat.backFaceCulling = false; backdropMat.diffuseTexture = new Texture(assets.saltLibrary, this.scene); backdropMat.emissiveTexture = new Texture(assets.saltLibrary, this.scene); backdropMat.emissiveColor = Color3.FromHexString("#2D413F");
    for (let index = 0; index < 14; index += 1) { const grass = MeshBuilder.CreatePlane(`salt-library-grass-${index}`, { width: 0.28, height: 0.8 }, this.scene); grass.position = new Vector3(-11 + ((index * 2.15) % 22), 0.43, 8.7 - ((index * 4.4) % 17)); grass.rotation.y = index * 0.51; grass.material = this.mat(`salt-library-grass-mat-${index}`, index % 3 ? jade : salt, index % 3 ? Color3.FromHexString("#17352F") : Color3.FromHexString("#303A3A"), 0.9); }
  }

  private createCaskets() {
    [[new Vector3(-5.65, 0.33, 2.1), "Watch-mark", "It records what the instrument could observe, not every change beyond its frame."], [new Vector3(-0.15, 0.33, -2.65), "Route-mark", "It carries a usable navigation line, but cannot speak for every traveler who meets it."], [new Vector3(5.6, 0.33, 1.45), "Shore-voice", "It holds lived testimony, which still asks how it travels beside changing water."]].forEach(([position, label, limit], index) => {
      const root = new TransformNode(`salt-casket-${index}`, this.scene); root.position.copyFrom(position as Vector3);
      const base = MeshBuilder.CreateBox(`salt-casket-base-${index}`, { width: 1.42, height: 0.28, depth: 0.98 }, this.scene); base.parent = root; base.position.y = 0.14; base.material = this.mat(`salt-casket-base-mat-${index}`, Color3.FromHexString("#6B5844"));
      const lid = MeshBuilder.CreateBox(`salt-casket-lid-${index}`, { width: 1.16, height: 0.16, depth: 0.72 }, this.scene); lid.parent = root; lid.position.y = 0.63; lid.rotation.z = 0.08; lid.material = this.mat(`salt-casket-lid-mat-${index}`, parchment, Color3.FromHexString("#4D2C14"));
      const ring = MeshBuilder.CreateTorus(`salt-casket-ring-${index}`, { diameter: 1.62, thickness: 0.11, tessellation: 34 }, this.scene); ring.parent = root; ring.position.y = 0.92; ring.rotation.x = Math.PI / 2; ring.material = this.mat(`salt-casket-ring-mat-${index}`, copper, this.newPlus ? Color3.Black() : Color3.FromHexString("#331409"));
      this.caskets.push({ root, ring, recorded: false, label: label as string, limit: limit as string, phase: index * 2.17 });
    });
  }

  private createCoreAndSteward() {
    this.libraryCore = new TransformNode("salt-library-memory-table", this.scene); this.libraryCore.position.copyFrom(this.corePosition);
    const plinth = MeshBuilder.CreateCylinder("salt-library-plinth", { diameter: 3.45, height: 0.25, tessellation: 34 }, this.scene); plinth.parent = this.libraryCore; plinth.position.y = 0.13; plinth.material = this.mat("salt-library-plinth-mat", Color3.FromHexString("#484B43"));
    [3.0, 2.08, 1.18].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`salt-library-ring-${index}`, { diameter, thickness: 0.07, tessellation: 36 }, this.scene); ring.parent = this.libraryCore; ring.position.y = 0.4 + index * 0.15; ring.rotation.x = Math.PI / 2; ring.rotation.z = index * 0.59; ring.material = this.mat(`salt-library-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#103B34") : Color3.FromHexString("#351609")); this.memoryRings.push(ring); });
    const annotation = MeshBuilder.CreatePolyhedron("salt-library-annotation-mark", { type: 1, size: 0.48 }, this.scene); annotation.parent = this.libraryCore; annotation.position.y = 1.14; annotation.material = this.mat("salt-library-annotation-mat", salt, saffron);
    this.steward = new TransformNode("salt-library-steward", this.scene); this.steward.position = new Vector3(7.45, 0, -5.25);
    this.stewardFigure = buildNpcFigure({ scene: this.scene, root: this.steward, name: "salt-steward", robeColor: Color3.FromHexString("#485C63"), robeHeight: 1.34, robeDiameterTop: 0.46, robeDiameterBottom: 0.66, robeEmissive: Color3.FromHexString("#485C63").scale(0.05), skinColor: Color3.FromHexString("#A37050"), eyeColor: salt, shawlColor: parchment, shawlWidth: 0.72, propColor: copper, propType: "staff", propHeight: 1.52, propRotationZ: -0.19, posture: "upright", reducedMotion: () => this.hud.reducedMotion });
    this.stewardBillboard = createPortraitBillboard(this.scene, this.steward, assets.saltLibrary, () => this.hud.reducedMotion);
  }

  update(delta: number) {
    const step = Math.min(delta, 0.05); const calm = this.hud.reducedMotion; this.time += step; this.pulseCooldown = Math.max(0, this.pulseCooldown - step); this.player.move(this.input.movement(), step, 4.7); this.player.update(step); if (!this.demo && this.input.consumePulse()) this.releasePulse(); if (!this.demo && this.input.consumeInteract()) this.interact(); this.ambient.update(step);
    this.caskets.forEach((casket) => { if (!casket.recorded) { casket.ring.rotation.z += calm ? step * 0.21 : step * 1.06; casket.root.position.y = calm ? 0.33 : 0.33 + Math.sin(this.time * 1.5 + casket.phase) * 0.07; } }); this.memoryRings.forEach((ring, index) => { ring.rotation.z += step * (index % 2 ? -0.72 : 0.54) * (this.stage === "complete" ? 1.7 : 1) * (calm ? 0.2 : 1); }); this.steward.position.y = calm ? 0 : Math.sin(this.time * 1.2) * 0.018; this.stewardFigure.update(step, this.time); this.stewardBillboard.update(this.player.root.position, this.camera.position);
    this.pulses = this.pulses.filter((pulse) => { pulse.age += step; pulse.ring.scaling.setAll(1 + pulse.age * 8); (pulse.ring.material as StandardMaterial).alpha = Math.max(0, 0.88 - pulse.age * 0.88); pulse.motes.forEach((mote, index) => { const angle = (Math.PI * 2 * index) / pulse.motes.length; mote.position.x += Math.cos(angle) * step * 2; mote.position.z += Math.sin(angle) * step * 2; mote.position.y += step * 0.72; mote.scaling.setAll(Math.max(0.05, 1 - pulse.age)); }); if (pulse.age > 1) { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; } return true; });
    this.cameraMotion.update(step, this.player, this.stage === "annotate" || this.stage === "memory" || this.stage === "complete" ? this.corePosition : this.stage === "records" ? this.caskets.find((casket) => !casket.recorded)?.root.position : undefined, this.input); this.hud.patch({ pulseReady: this.pulseCooldown <= 0 });
  }

  private releasePulse() {
    if (this.pulseCooldown > 0) return; this.pulseCooldown = 1.45; const ring = MeshBuilder.CreateTorus("salt-library-focus-pulse", { diameter: 0.86, thickness: 0.07, tessellation: 38 }, this.scene); ring.position = this.player.root.position.clone(); ring.position.y = 0.28; ring.rotation.x = Math.PI / 2; ring.material = this.mat("salt-library-pulse-mat", saffron, saffron, 0.88); const motes = Array.from({ length: 14 }, (_, index) => { const mote = MeshBuilder.CreateSphere(`salt-library-pulse-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene); const angle = (Math.PI * 2 * index) / 14; mote.position = ring.position.add(new Vector3(Math.cos(angle) * 0.5, 0.04, Math.sin(angle) * 0.5)); mote.material = this.mat(`salt-library-pulse-mote-mat-${index}`, saffron, saffron); return mote; }); this.pulses.push({ ring, motes, age: 0 }); this.cameraMotion.emphasize(); if (!this.demo) this.feedback.pulse();
    if (this.stage !== "records") { this.hud.patch({ notice: this.stage === "sealed" ? "The Salt Library needs the Estuary’s shared tide record before it can open its caskets." : "At the Salt Library, a focus pulse becomes a field mark only after the memory table is opened." }); return; }
    const casket = this.caskets.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!casket) { this.hud.patch({ notice: "Stand by an unopened memory casket. Watch-mark, route-mark, and shore-voice must remain distinct before they can be compared." }); return; }
    casket.recorded = true; casket.ring.material = this.mat(`salt-casket-recorded-${this.recorded}`, saffron, saffron); this.recorded += 1; if (!this.demo) this.feedback.collect();
    if (this.recorded === 3) { this.stage = "annotate"; this.hud.patch({ glyphs: 3, saltRecords: 3, questTitle: "Mark what the record cannot close", questDetail: "Return to the memory table and press E to make a Field Annotation. A useful record can preserve uncertainty without becoming silent.", notice: "Library Steward: all three records travel together, but none is complete by itself. Mark the gap before you make them public." }); }
    else this.hud.patch({ glyphs: this.recorded, saltRecords: this.recorded, notice: `${casket.label} is carried with its limit: ${casket.limit}` });
  }

  private interact() {
    if (this.stage === "sealed") { this.hud.patch({ notice: "Library Steward: bring the Estuary’s Mangrove Refuge and shared tide record. The salt wind preserves no warning that has not first become public." }); return; }
    if (this.stage === "approach" && Vector3.Distance(this.player.root.position, this.corePosition) < 3.2) { this.stage = "records"; if (!this.demo) this.feedback.speak(); this.hud.patch({ questTitle: "Compare three memory caskets", questDetail: "Use focus pulses at watch-mark, route-mark, and shore-voice. Each record has a use and a boundary.", glyphs: 0, glyphGoal: 3, notice: `${this.stewardVoice()} The memory table opens because a shared record must let different kinds of evidence remain visible.` }); return; }
    if (this.stage === "annotate" && Vector3.Distance(this.player.root.position, this.corePosition) < 3.2) { this.weaveAnnotation(); return; }
    if (this.stage === "complete" && Vector3.Distance(this.player.root.position, this.corePosition) < 3.2) { this.startSaltDrill(); return; }
    if (this.stage === "drill") { this.recordDrillCasket(); return; }
    if (Vector3.Distance(this.player.root.position, this.steward.position) < 3.2) { this.feedback.speak(); this.hud.patch({ notice: `${this.stewardVoice()} A record serves a coast only when its readers can name what it leaves uncounted.` }); }
  }

  private weaveAnnotation() { this.stage = "memory"; if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: true, choiceMode: "memory", fieldAnnotation: "Field Annotation · uncertainty marked before the record travels", questTitle: "Choose what the public memory copies first", questDetail: "The Library Steward asks which incomplete record should be made most legible before the salt wind changes the route.", notice: "The Field Annotation opens a space for disagreement. Tara asks whose knowledge is hardest to carry when a ledger becomes public." }); }

  chooseStance = (trait: TraitKey) => {
    if (this.stage !== "memory") return; this.stage = "complete";
    const decisions: Record<TraitKey, string> = { viveka: "Trade records are copied with their missing-weather annotations, so a route can be useful without claiming certainty it does not possess.", sahas: "Ecological warnings are copied first, making the changing shore visible before the next cargo schedule closes the question.", karuna: "Local testimony is copied beside the route record, giving a reader a reason to ask who bears the risk the chart cannot show." };
    const chapterEightSignal = trait === "viveka" ? "Chapter VIII · the Mirror Step receives a ledger that knows how to show its own uncertainty." : trait === "sahas" ? "Chapter VIII · the Mirror Step receives a wind warning that refuses to be filed after the shoreline changes." : "Chapter VIII · the Mirror Step receives a testimony map whose margins remain open for those still arriving.";
    if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: false, saltLibraryComplete: true, saltRecords: 3, fieldAnnotation: "Field Annotation · uncertainty marked before the record travels", saltMarshTechnique: "Salt-marsh Refuge", memoryStewardship: decisions[trait], taraBond: 6, taraSaltRoute: 1, chapterEightSignal, milestone: "Salt-marsh Refuge · shared record carried", questTitle: "The Salt Library stays open", questDetail: chapterEightSignal, notice: `${decisions[trait]} Tara ties a sixth knot: return routes begin by learning from the people who already keep a place legible.`, materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: 1, saltLeaf: 1 } });
  };

  private startSaltDrill() {
    const orders = [["Watch-mark", "Route-mark", "Shore-voice"], ["Route-mark", "Shore-voice", "Watch-mark"], ["Shore-voice", "Watch-mark", "Route-mark"]]; const index = this.saltSeason.includes("Varsha") ? 1 : this.saltSeason.includes("Hemanta") ? 2 : 0; this.drillOrder = orders[index]; this.drillProgress = 0; this.stage = "drill"; this.caskets.forEach((casket, casketIndex) => { casket.recorded = false; casket.ring.material = this.mat(`salt-drill-reset-${casketIndex}`, copper, Color3.FromHexString("#351609")); }); this.hud.patch({ glyphs: 0, glyphGoal: 3, questTitle: "Seasonal memory route", questDetail: `Place the caskets in this ${this.saltSeason.split(" · ")[0]} order: ${this.drillOrder.join(" → ")}. Stand by each one and press E.`, saltDrillSeason: this.saltSeason, notice: "Library Steward: replay is not repetition when the season changes what must be carried first." });
  }

  private recordDrillCasket() { const casket = this.caskets.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!casket) { this.hud.patch({ notice: "Stand beside the next unrecorded casket and press E to place it in the seasonal memory route." }); return; } const expected = this.drillOrder[this.drillProgress]; if (casket.label !== expected) { this.hud.patch({ notice: `${casket.label} arrived too early. This seasonal route still begins with ${expected}.` }); if (!this.demo) this.feedback.speak(); return; } casket.recorded = true; casket.ring.material = this.mat(`salt-drill-aligned-${this.drillProgress}`, saffron, saffron); this.drillProgress += 1; if (!this.demo) this.feedback.collect(); if (this.drillProgress === 3) { this.stage = "complete"; this.drillRecord += 1; this.hud.patch({ glyphs: 3, saltDrillBest: this.drillRecord, saltDrillSeason: this.saltSeason, milestone: `Salt route · ${this.saltSeason.split(" · ")[0]} sequence recorded`, questTitle: "The memory route is carried", questDetail: `Seasonal sequence ${this.drillRecord} recorded. Return later to test another order without erasing the first.`, notice: "Tara: a return plan changes when the wind does. The point is not to master the coast; it is to keep listening." }); } else this.hud.patch({ glyphs: this.drillProgress, saltDrillBest: this.drillRecord, notice: `${casket.label} carried. Next: ${this.drillOrder[this.drillProgress]}.` }); }

  private stewardVoice() { if (!this.context?.chapterSevenSignal) return "Library Steward: the caskets open only after the coast has carried a shared tide record."; if (this.context.chapterSevenSignal.includes("roots")) return "Library Steward: you carried a root-line from the Estuary. Here, ask whether an old memory becomes useful when it is copied without the people who kept it."; if (this.context.chapterSevenSignal.includes("shelter")) return "Library Steward: you carried shelter to the salt steps. Here, ask which account helps a reader see the people still outside the wall."; return "Library Steward: you carried a tide chart. Here, ask which part of a route becomes invisible when a record is too eager to be certain."; }
  advanceSeason = () => { const season = this.ambient.advanceSeason(); this.saltSeason = season; this.hud.patch({ season, saltDrillSeason: season, notice: `${season} changes the salt haze and casket order. A finished library route can now practice a different seasonal memory sequence.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time} shifts the reading surface on the memory table. Field Annotation keeps the page open where certainty would close it too soon.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: this.context?.returnObservatoryComplete ? "Aruna’s Observatory return note: the amendment does not overwrite the salt page; it makes the earlier margin and changed crossing visible as a lineage of readers." : this.context?.confluenceComplete ? "Aruna’s Salt Library return note: the Route Braid did not close the margin; it made the return condition another visible part of the shared page." : "Aruna’s Salt Library note: a useful claim shows the observation that supports it and the margin where it stops. That margin is part of the record.", muni: this.context?.returnObservatoryComplete ? "Laya’s Observatory return note: a return folio leaves enough quiet for another reader to speak a later line beside the first recitation." : this.context?.confluenceComplete ? "Laya’s Salt Library return note: the public table worked because it kept room for a later reader to sound the missing line." : "Laya’s Salt Library note: collective recitation is not performance here; it is the practice of attending together when one reader misses a line.", raja: `Somavrat’s Salt Library note: ${this.context?.amendmentChoice || this.context?.publicRouteChoice || this.context?.stewardshipChoice || "public memory begins when people can question the record made about their route."}` }; this.hud.patch({ notice: notes[guide] }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.stewardBillboard.dispose(); this.pulses.forEach((pulse) => { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}
