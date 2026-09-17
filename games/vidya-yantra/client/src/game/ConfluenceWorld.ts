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

type SourceStation = { root: TransformNode; ring: Mesh; recorded: boolean; label: string; condition: string; phase: number };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };
const saffron = Color3.FromHexString("#F26B38");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const parchment = Color3.FromHexString("#D7B77D");
const starBlue = Color3.FromHexString("#A8D7E8");

export class ConfluenceWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private sources: SourceStation[] = [];
  private pulses: Pulse[] = [];
  private table!: TransformNode;
  private steward!: TransformNode;
  private stewardFigure!: NpcFigure;
  private stewardBillboard!: PortraitBillboard;
  private tableRings: Mesh[] = [];
  private time = 0;
  private pulseCooldown = 0;
  private recorded = 0;
  private stage: "sealed" | "approach" | "sources" | "resolve" | "choice" | "complete" | "drill" = "approach";
  private readonly tablePosition = new Vector3(3.55, 0, -3.75);
  private drillOrder: string[] = [];
  private drillProgress = 0;
  private drillRecord = 0;
  private confluenceSeason = "Sharad · clear river";
  private newPlus = false;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.createTerrain();
    this.ambient = new AmbientLife(scene, "confluence", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-9, 0, 7.8), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "confluence", () => this.hud.reducedMotion);
    this.createStations();
    this.createTableAndSteward();
    const unlocked = Boolean(context?.confluenceReady && context?.mirrorStepComplete && context?.countermarkLens);
    if (!unlocked) this.stage = "sealed";
    this.drillRecord = context?.confluenceDrillBest ?? 0;
    if (context?.confluenceComplete) {
      this.stage = "complete";
      this.recorded = 3;
      this.sources.forEach((source, index) => { source.recorded = true; source.ring.material = this.mat(`confluence-return-source-${index}`, saffron, saffron); });
    }
    this.hud.patch({
      chapter: "Chapter IX · The Confluence Table",
      questTitle: context?.confluenceComplete ? "The public route remains amendable" : unlocked ? this.newPlus ? "Gather three route conditions · New Journey+ echo mode" : "Gather three route conditions" : "The Confluence Table awaits an accountable route",
      questDetail: context?.confluenceComplete ? context.publicRouteChoice || "Return to the table to practice a seasonal route order." : unlocked ? this.newPlus ? "New Journey+ · echo mode: guidance arrives in fragments. Synthesize the rest from the three sources themselves." : "Reach the copper table and press E. Then focus-pulse the river gauge, ridge signal, and shore record." : "Carry the Countermark Lens from Mirror Step before the table can receive a public route.",
      glyphs: context?.confluenceComplete ? 3 : 0,
      glyphGoal: 3,
      season: this.confluenceSeason,
      timeOfDay: "Public fieldwork",
      notice: context?.confluenceComplete ? context.publicRouteChoice || "Confluence Steward: a route can travel when its reader can see where to return and what could change it." : this.newPlus ? this.echo(this.stewardVoice()) : this.stewardVoice(),
      taraBond: context?.taraBond ?? 0,
      countermarkLens: context?.countermarkLens ?? "",
      corroborationChoice: context?.corroborationChoice ?? "",
      confluenceReady: unlocked,
      confluenceSources: context?.confluenceComplete ? 3 : 0,
      confluenceComplete: context?.confluenceComplete ?? false,
      routeBraid: context?.routeBraid ?? "",
      publicRouteChoice: context?.publicRouteChoice ?? "",
      confluenceDrillBest: context?.confluenceDrillBest ?? 0,
      confluenceDrillSeason: context?.confluenceDrillSeason ?? "",
      taraUnboundLine: context?.taraUnboundLine ?? false,
      chapterTenSignal: context?.chapterTenSignal ?? "",
      chapterTenReady: context?.chapterTenReady ?? false,
      materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: context?.estuaryComplete ? 1 : 0, saltLeaf: context?.saltLibraryComplete ? 1 : 0, confluenceSeal: context?.confluenceComplete ? 1 : 0 },
    });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }

  private createTerrain() {
    const ground = MeshBuilder.CreateGround("confluence-ground", { width: 31, height: 26, subdivisions: 14 }, this.scene); ground.material = this.mat("confluence-ground-mat", Color3.FromHexString("#253336"), Color3.FromHexString("#0A1519"));
    const undercourt = MeshBuilder.CreateCylinder("confluence-undercourt", { diameter: 22.8, height: 0.12, tessellation: 64 }, this.scene); undercourt.position.y = 0.02; undercourt.material = this.mat("confluence-undercourt-mat", Color3.FromHexString("#334244"), Color3.FromHexString("#102022"));
    [19.8, 15.4, 10.2].forEach((diameter, index) => { const inlay = MeshBuilder.CreateTorus(`confluence-ground-inlay-${index}`, { diameter, thickness: 0.035, tessellation: 64 }, this.scene); inlay.position.y = 0.1 + index * 0.012; inlay.rotation.x = Math.PI / 2; inlay.material = this.mat(`confluence-ground-inlay-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#123631") : Color3.FromHexString("#2E1308")); });
    const terraces = [[-7.2, 6.2, "#A98154", "#4A2C18"], [-2.8, 2.7, "#744737", "#2D170D"], [1.3, -0.9, "#9B7650", "#3E2714"], [5.3, -4.4, "#683E31", "#25150E"]];
    terraces.forEach(([x, z, color, edge], index) => { const terrace = MeshBuilder.CreateBox(`confluence-terrace-${index}`, { width: 5.35, height: 0.26 + index * 0.055, depth: 3.5 }, this.scene); terrace.position = new Vector3(x as number, 0.14 + index * 0.045, z as number); terrace.rotation.y = -0.49; terrace.material = this.mat(`confluence-terrace-mat-${index}`, Color3.FromHexString(color as string), Color3.FromHexString(edge as string)); const terraceEdge = MeshBuilder.CreateBox(`confluence-terrace-edge-${index}`, { width: 4.95, height: 0.035, depth: 0.12 }, this.scene); terraceEdge.position = new Vector3(x as number, 0.31 + index * 0.045, (z as number) - 1.44); terraceEdge.rotation.y = -0.49; terraceEdge.material = this.mat(`confluence-terrace-edge-mat-${index}`, copper, Color3.FromHexString("#301306")); });
    const path = MeshBuilder.CreateBox("confluence-diagonal-route", { width: 1.22, height: 0.07, depth: 22.5 }, this.scene); path.position = new Vector3(-0.8, 0.38, 0.35); path.rotation.y = -0.53; path.material = this.mat("confluence-route-mat", Color3.FromHexString("#AE8D5D"), Color3.FromHexString("#2E1D0C"));
    const thread = MeshBuilder.CreateBox("confluence-route-thread", { width: 0.11, height: 0.075, depth: 23 }, this.scene); thread.position = new Vector3(-1.56, 0.45, 0.18); thread.rotation.y = -0.53; thread.material = this.mat("confluence-thread-mat", starBlue, starBlue.scale(0.64), 0.82);
    [-1.38, -0.22].forEach((offset, edgeIndex) => { const edge = MeshBuilder.CreateBox(`confluence-route-edge-${edgeIndex}`, { width: 0.045, height: 0.035, depth: 22.85 }, this.scene); edge.position = new Vector3(offset, 0.46, 0.22); edge.rotation.y = -0.53; edge.material = this.mat(`confluence-route-edge-mat-${edgeIndex}`, copper, Color3.FromHexString("#321508")); });
    for (let index = 0; index < 10; index += 1) { const etch = MeshBuilder.CreateBox(`confluence-route-etch-${index}`, { width: 0.78, height: 0.022, depth: 0.09 }, this.scene); etch.position = new Vector3(-7 + index * 1.38, 0.46 + index * 0.012, 5.8 - index * 1.1); etch.rotation.y = -0.53; etch.material = this.mat(`confluence-route-etch-mat-${index}`, copper, Color3.FromHexString("#3A1708")); }
    const backdrop = MeshBuilder.CreatePlane("confluence-target", { width: 32, height: 18 }, this.scene); backdrop.position = new Vector3(0, 7.6, 14.55); const backdropMat = this.mat("confluence-target-mat", Color3.FromHexString("#35544E"), Color3.FromHexString("#1B3937"), 0.37); backdropMat.backFaceCulling = false; backdropMat.diffuseTexture = new Texture(assets.confluenceTable, this.scene); backdropMat.emissiveTexture = new Texture(assets.confluenceTable, this.scene); backdrop.material = backdropMat;
    for (let index = 0; index < 14; index += 1) { const marker = MeshBuilder.CreateBox(`confluence-mineral-marker-${index}`, { width: 0.18, height: 0.76, depth: 0.18 }, this.scene); marker.position = new Vector3(-10.2 + ((index * 2.13) % 21), 0.4, 8.7 - ((index * 3.17) % 17)); marker.rotation.y = index * 0.47; marker.material = this.mat(`confluence-mineral-marker-mat-${index}`, index % 3 === 0 ? jade : index % 3 === 1 ? parchment : starBlue, index % 3 === 0 ? Color3.FromHexString("#143C35") : Color3.FromHexString("#263E55")); }
  }

  private createStations() {
    [[new Vector3(-5.4, 0.36, 2.6), "River gauge", "water level", starBlue], [new Vector3(0.1, 0.36, -2.4), "Ridge signal", "wind corridor", copper], [new Vector3(6.35, 0.36, 1.8), "Shore record", "salinity window", jade]].forEach(([position, label, condition, color], index) => {
      const root = new TransformNode(`confluence-source-${index}`, this.scene); root.position.copyFrom(position as Vector3);
      const base = MeshBuilder.CreateCylinder(`confluence-source-base-${index}`, { diameter: 1.32, height: 0.26, tessellation: 20 }, this.scene); base.parent = root; base.position.y = 0.13; base.material = this.mat(`confluence-source-base-mat-${index}`, Color3.FromHexString("#565749"));
      const plate = MeshBuilder.CreateDisc(`confluence-source-plate-${index}`, { radius: 0.48, tessellation: 26 }, this.scene); plate.parent = root; plate.position.y = 0.29; plate.rotation.x = Math.PI / 2; plate.material = this.mat(`confluence-source-plate-mat-${index}`, color as Color3, (color as Color3).scale(0.4));
      const ring = MeshBuilder.CreateTorus(`confluence-source-ring-${index}`, { diameter: 1.65, thickness: 0.11, tessellation: 34 }, this.scene); ring.parent = root; ring.position.y = 0.87; ring.rotation.x = Math.PI / 2; ring.material = this.mat(`confluence-source-ring-mat-${index}`, copper, Color3.FromHexString("#351609"));
      this.sources.push({ root, ring, recorded: false, label: label as string, condition: condition as string, phase: index * 2.13 });
    });
  }

  private createTableAndSteward() {
    this.table = new TransformNode("confluence-public-table", this.scene); this.table.position.copyFrom(this.tablePosition);
    const plinth = MeshBuilder.CreateCylinder("confluence-plinth", { diameter: 5.35, height: 0.34, tessellation: 48 }, this.scene); plinth.parent = this.table; plinth.position.y = 0.17; plinth.material = this.mat("confluence-plinth-mat", Color3.FromHexString("#3C4A47"), Color3.FromHexString("#14201E"));
    const plinthEtch = MeshBuilder.CreateTorus("confluence-plinth-etch", { diameter: 4.9, thickness: 0.05, tessellation: 48 }, this.scene); plinthEtch.parent = this.table; plinthEtch.position.y = 0.36; plinthEtch.rotation.x = Math.PI / 2; plinthEtch.material = this.mat("confluence-plinth-etch-mat", copper, Color3.FromHexString("#351609"));
    const parchmentTable = MeshBuilder.CreateCylinder("confluence-parchment-table", { diameter: 3.82, height: 0.12, tessellation: 42 }, this.scene); parchmentTable.parent = this.table; parchmentTable.position.y = 0.42; parchmentTable.material = this.mat("confluence-parchment-table-mat", Color3.FromHexString("#C29E69"), Color3.FromHexString("#412A12"));
    [4.7, 3.55, 2.35].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`confluence-table-ring-${index}`, { diameter, thickness: 0.095, tessellation: 48 }, this.scene); ring.parent = this.table; ring.position.y = 0.64 + index * 0.08; ring.rotation.x = index === 1 ? 0 : Math.PI / 2; ring.rotation.z = index * 0.61; ring.material = this.mat(`confluence-table-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#113C35") : Color3.FromHexString("#351609")); this.tableRings.push(ring); });
    for (let index = 0; index < 8; index += 1) { const arm = MeshBuilder.CreateBox(`confluence-table-arm-${index}`, { width: 0.13, height: 0.07, depth: 1.78 }, this.scene); arm.parent = this.table; arm.position.y = 0.73; arm.rotation.y = (Math.PI * 2 * index) / 8; arm.material = this.mat(`confluence-table-arm-mat-${index}`, index % 2 ? copper : starBlue, index % 2 ? Color3.FromHexString("#3A1708") : Color3.FromHexString("#1A3A51")); }
    const revisionSeam = MeshBuilder.CreateBox("confluence-revision-seam", { width: 0.08, height: 0.055, depth: 2.45 }, this.scene); revisionSeam.parent = this.table; revisionSeam.position.y = 0.81; revisionSeam.rotation.y = -0.24; revisionSeam.material = this.mat("confluence-revision-seam-mat", saffron, saffron.scale(0.58));
    const routeCore = MeshBuilder.CreateSphere("confluence-route-core", { diameter: 0.54, segments: 12 }, this.scene); routeCore.parent = this.table; routeCore.position.y = 0.9; routeCore.material = this.mat("confluence-route-core-mat", starBlue, starBlue.scale(0.72));
    this.steward = new TransformNode("confluence-steward", this.scene); this.steward.position = new Vector3(6.8, 0, -5.5);
    this.stewardFigure = buildNpcFigure({ scene: this.scene, root: this.steward, name: "confluence-steward", robeColor: Color3.FromHexString("#6A5135"), robeHeight: 1.38, robeDiameterTop: 0.48, robeDiameterBottom: 0.72, robeEmissive: Color3.FromHexString("#6A5135").scale(0.05), skinColor: Color3.FromHexString("#A37050"), eyeColor: starBlue, shawlColor: copper, shawlWidth: 0.72, propColor: copper, propType: "ceremonial", propHeight: 1.55, propRotationZ: -0.17, braid: true, reducedMotion: () => this.hud.reducedMotion });
    this.stewardBillboard = createPortraitBillboard(this.scene, this.steward, assets.confluenceTable, () => this.hud.reducedMotion);
  }

  update(delta: number) {
    const step = Math.min(delta, 0.05); const calm = this.hud.reducedMotion; this.time += step; this.pulseCooldown = Math.max(0, this.pulseCooldown - step); this.player.move(this.input.movement(), step, 4.7); this.player.update(step); if (!this.demo && this.input.consumePulse()) this.releasePulse(); if (!this.demo && this.input.consumeInteract()) this.interact(); this.ambient.update(step);
    this.sources.forEach((source) => { if (!source.recorded) { source.ring.rotation.z += calm ? step * 0.2 : step * 1.02; source.root.position.y = calm ? 0.36 : 0.36 + Math.sin(this.time * 1.5 + source.phase) * 0.07; } }); this.tableRings.forEach((ring, index) => { ring.rotation.z += step * (index % 2 ? -0.72 : 0.56) * (this.stage === "complete" ? 1.48 : 1) * (calm ? 0.2 : 1); }); this.steward.position.y = calm ? 0 : Math.sin(this.time * 1.12) * 0.018; this.stewardFigure.update(step, this.time); this.stewardBillboard.update(this.player.root.position, this.camera.position);
    this.pulses = this.pulses.filter((pulse) => { pulse.age += step; pulse.ring.scaling.setAll(1 + pulse.age * 8); (pulse.ring.material as StandardMaterial).alpha = Math.max(0, 0.88 - pulse.age * 0.88); pulse.motes.forEach((mote, index) => { const angle = (Math.PI * 2 * index) / pulse.motes.length; mote.position.x += Math.cos(angle) * step * 2; mote.position.z += Math.sin(angle) * step * 2; mote.position.y += step * 0.72; mote.scaling.setAll(Math.max(0.05, 1 - pulse.age)); }); if (pulse.age > 1) { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; } return true; });
    this.cameraMotion.update(step, this.player, this.stage === "resolve" || this.stage === "choice" || this.stage === "complete" ? this.tablePosition : this.stage === "sources" ? this.sources.find((source) => !source.recorded)?.root.position : undefined, this.input); this.hud.patch({ pulseReady: this.pulseCooldown <= 0 });
  }

  private releasePulse() {
    if (this.pulseCooldown > 0) return; this.pulseCooldown = 1.42; const ring = MeshBuilder.CreateTorus("confluence-focus-pulse", { diameter: 0.86, thickness: 0.07, tessellation: 38 }, this.scene); ring.position = this.player.root.position.clone(); ring.position.y = 0.28; ring.rotation.x = Math.PI / 2; ring.material = this.mat("confluence-pulse-mat", saffron, saffron, 0.88); const motes = Array.from({ length: 14 }, (_, index) => { const mote = MeshBuilder.CreateSphere(`confluence-pulse-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene); const angle = (Math.PI * 2 * index) / 14; mote.position = ring.position.add(new Vector3(Math.cos(angle) * 0.5, 0.04, Math.sin(angle) * 0.5)); mote.material = this.mat(`confluence-pulse-mote-mat-${index}`, saffron, saffron); return mote; }); this.pulses.push({ ring, motes, age: 0 }); this.cameraMotion.emphasize(); if (!this.demo) this.feedback.pulse();
    if (this.stage !== "sources") { this.hud.patch({ notice: this.echo(this.stage === "sealed" ? "The public table needs Mirror Step’s Countermark Lens before it can accept a route braid." : "At the Confluence Table, a pulse becomes a route source only after the public instrument is addressed.") }); return; }
    const source = this.sources.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!source) { this.hud.patch({ notice: this.echo("Stand by an unrecorded station. River, ridge, and shore conditions must remain distinct before the table can braid them.") }); return; }
    source.recorded = true; source.ring.material = this.mat(`confluence-source-recorded-${this.recorded}`, saffron, saffron); this.recorded += 1; if (!this.demo) this.feedback.collect();
    if (this.recorded === 3) { this.stage = "resolve"; this.hud.patch({ glyphs: 3, confluenceSources: 3, questTitle: "Place a public return condition", questDetail: "Return to the copper table and press E. A usable route must name what can amend it.", notice: this.echo("Confluence Steward: the sources can meet now, but they must not be made to speak as though they came from the same condition.") }); } else this.hud.patch({ glyphs: this.recorded, confluenceSources: this.recorded, notice: this.echo(`${source.label} is carried with its condition: ${source.condition}.`) });
  }

  private interact() {
    if (this.stage === "sealed") { this.hud.patch({ notice: "Confluence Steward: bring the Countermark Lens from Mirror Step. A public route cannot be shared until its reader can see what may revise it." }); return; }
    if (this.stage === "approach" && Vector3.Distance(this.player.root.position, this.tablePosition) < 3.3) { this.stage = "sources"; if (!this.demo) this.feedback.speak(); this.hud.patch({ questTitle: "Gather three incoming conditions", questDetail: "Use focus pulses at the River Gauge, Ridge Signal, and Shore Record. Each one carries a source and a condition.", glyphs: 0, glyphGoal: 3, notice: this.echo(`${this.stewardVoice()} The public table needs three incoming conditions before any route can be offered outward.`) }); return; }
    if (this.stage === "resolve" && Vector3.Distance(this.player.root.position, this.tablePosition) < 3.3) { this.openPublicChoice(); return; }
    if (this.stage === "complete" && Vector3.Distance(this.player.root.position, this.tablePosition) < 3.3) { this.startConfluenceDrill(); return; }
    if (this.stage === "drill") { this.recordDrillSource(); return; }
    if (Vector3.Distance(this.player.root.position, this.steward.position) < 3.2) { this.feedback.speak(); this.hud.patch({ notice: this.echo(`${this.stewardVoice()} The strongest public map is not the loudest. It leaves an address where another traveler can return with the condition that changes it.`) }); }
  }

  private openPublicChoice() { this.stage = "choice"; if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: true, choiceMode: "confluence", questTitle: "Choose the first public route braid", questDetail: "The Confluence Steward asks which route should be shared first, and what explicit return condition will remain beside it.", notice: this.echo("Tara: six knots taught us how to return. Now name the reader who must be able to amend the route when the ground changes.") }); }

  chooseStance = (trait: TraitKey) => {
    if (this.stage !== "choice") return; this.stage = "complete";
    const decisions: Record<TraitKey, string> = { viveka: "The river gauge is published beside its water-level condition; the table asks readers to return when the next rise changes its reach.", sahas: "The ridge warning is shared with its wind corridor and a return marker, so urgency does not erase the condition that could redraw the path.", karuna: "The shore record is carried beside its salinity window and a named reader, so a public route keeps its use accountable to those living the change." };
    const routeBraid = trait === "viveka" ? "Route Braid · source, water level, and return marker held together" : trait === "sahas" ? "Route Braid · warning, wind corridor, and return marker held together" : "Route Braid · shore account, salinity window, and named reader held together";
    const chapterTenSignal = trait === "viveka" ? "Chapter X · the Return Observatory receives a gauge record that knows when its reach will change." : trait === "sahas" ? "Chapter X · the Return Observatory receives a warning that remains urgent without hiding its weather condition." : "Chapter X · the Return Observatory receives a public route that names who must still be able to amend it.";
    if (!this.demo) this.feedback.align(); this.hud.patch({ choiceOpen: false, confluenceComplete: true, confluenceSources: 3, routeBraid, publicRouteChoice: decisions[trait], taraUnboundLine: true, chapterTenSignal, chapterTenReady: true, milestone: "Route Braid · public route remains amendable", questTitle: "The route carries its return", questDetail: routeBraid, notice: this.echo(`${decisions[trait]} Confluence Steward: a route travels farther when it keeps the return condition visible to the next reader.`), materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: this.context?.estuaryComplete ? 1 : 0, saltLeaf: this.context?.saltLibraryComplete ? 1 : 0, confluenceSeal: 1 } });
  };

  private startConfluenceDrill() {
    const orders = [["River gauge", "Ridge signal", "Shore record"], ["Ridge signal", "Shore record", "River gauge"], ["Shore record", "River gauge", "Ridge signal"]]; const index = this.confluenceSeason.includes("Varsha") ? 1 : this.confluenceSeason.includes("Hemanta") ? 2 : 0; this.drillOrder = orders[index]; this.drillProgress = 0; this.stage = "drill"; this.sources.forEach((source, sourceIndex) => { source.recorded = false; source.ring.material = this.mat(`confluence-drill-reset-${sourceIndex}`, copper, Color3.FromHexString("#351609")); }); this.hud.patch({ glyphs: 0, glyphGoal: 3, questTitle: "Seasonal public-route order", questDetail: `Trace the ${this.confluenceSeason.split(" · ")[0]} source order: ${this.drillOrder.join(" → ")}. Stand by each station and press E.`, confluenceDrillSeason: this.confluenceSeason, notice: "Confluence Steward: a return condition shifts with the season. Replay is a way to see which source must arrive before a public decision." });
  }

  private recordDrillSource() { const source = this.sources.find((entry) => !entry.recorded && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (!source) { this.hud.patch({ notice: "Stand beside the next unrecorded source station and press E to place it in the seasonal public-route order." }); return; } const expected = this.drillOrder[this.drillProgress]; if (source.label !== expected) { this.hud.patch({ notice: `${source.label} arrived too early. This seasonal route still begins with ${expected}.` }); if (!this.demo) this.feedback.speak(); return; } source.recorded = true; source.ring.material = this.mat(`confluence-drill-aligned-${this.drillProgress}`, saffron, saffron); this.drillProgress += 1; if (!this.demo) this.feedback.collect(); if (this.drillProgress === 3) { this.stage = "complete"; this.drillRecord += 1; this.hud.patch({ glyphs: 3, confluenceDrillBest: this.drillRecord, confluenceDrillSeason: this.confluenceSeason, milestone: `Confluence route · ${this.confluenceSeason.split(" · ")[0]} public order recorded`, questTitle: "The public route is carried again", questDetail: `Seasonal public route ${this.drillRecord} recorded. Return later to test another order without erasing the first.`, notice: "Tara: an unbound line does not forget where it started. It keeps a way back for the reader who sees the next change." }); } else this.hud.patch({ glyphs: this.drillProgress, confluenceDrillBest: this.drillRecord, notice: `${source.label} carried. Next: ${this.drillOrder[this.drillProgress]}.` }); }

  private stewardVoice() { if (!this.context?.chapterNineSignal) return "Confluence Steward: this table opens when a route has learned to carry a source and the condition that can revise it."; if (this.context.chapterNineSignal.includes("framed observation")) return "Confluence Steward: you carried an observation with its frame. Here, ask what water, wind, or reader must be named before that frame becomes a public route."; if (this.context.chapterNineSignal.includes("provisional warning")) return "Confluence Steward: you carried a warning that stayed usable beside uncertainty. Here, give it a return condition before it crosses three paths."; return "Confluence Steward: you carried a testimony map with its margin open. Here, make the reader who can amend the route visible beside the public line."; }
  private echo(text: string): string { if (!this.newPlus) return text; const sentences = text.split(". "); const fragments = sentences.map((s) => { const words = s.trim().split(" "); if (words.length <= 3) return s; const keep = Math.max(2, Math.ceil(words.length * 0.45)); return words.slice(0, keep).join(" ") + " …"; }); return fragments.join(". ").trim(); }
  advanceSeason = () => { const season = this.ambient.advanceSeason(); this.confluenceSeason = season; this.hud.patch({ season, confluenceDrillSeason: season, notice: `${season} changes the first source in the optional public-route order. A finished braid can return with a different condition in view.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time} changes the table’s reading surface. The Route Braid keeps a source, condition, and return marker together.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: this.context?.returnObservatoryComplete ? "Aruna’s Observatory return note: the public table now shows its earlier braid beside the changed condition that gave an amendment a practical reason to travel." : "Aruna’s Confluence note: a source becomes more useful when its reach is written beside it, not hidden beneath a neat route line.", muni: this.context?.returnObservatoryComplete ? "Laya’s Observatory return note: the return instrument leaves an interval where a later reader can carry a changed line back to this table." : "Laya’s Confluence note: a public decision needs enough quiet for the return condition to be heard before the group moves on.", raja: `Somavrat’s Confluence note: ${this.context?.amendmentChoice || this.context?.corroborationChoice || "a public route must state who can question it when conditions change."}` }; this.hud.patch({ notice: this.echo(notes[guide]) }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.stewardBillboard.dispose(); this.pulses.forEach((pulse) => { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}
