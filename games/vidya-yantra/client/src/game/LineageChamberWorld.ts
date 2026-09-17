/* Open Almanac Chapter XII: four physical route leaves remain separate until a public notation names their relation. */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { AmbientLife } from "./AmbientLife";
import { CinematicCamera } from "./CinematicCamera";
import { HudBridge, type TraitKey } from "./HudBridge";
import { InputManager } from "./InputManager";
import { Player, buildNpcFigure, createPortraitBillboard, type NpcFigure, type PortraitBillboard } from "./Player";
import { SoundFeedback } from "./SoundFeedback";
import { assets } from "./assets";
import type { JourneyContext } from "./scene";

type LeafId = "earlier" | "amendment" | "variance" | "reader";
type Leaf = { id: LeafId; root: TransformNode; plate: Mesh; copy: string; inspected: boolean; phase: number };

const indigo = Color3.FromHexString("#071025");
const parchment = Color3.FromHexString("#D7B77D");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const saffron = Color3.FromHexString("#F26B38");
const starBlue = Color3.FromHexString("#A8D7E8");

export class LineageChamberWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private ambient: AmbientLife;
  private cameraMotion: CinematicCamera;
  private keeper!: TransformNode;
  private keeperFigure!: NpcFigure;
  private keeperBillboard!: PortraitBillboard;
  private table!: TransformNode;
  private leaves: Leaf[] = [];
  private time = 0;
  private stage: "sealed" | "approach" | "inspect" | "choice" | "complete" | "drill" = "approach";
  private season = "Sharad · open chart";
  private drillOrder: LeafId[] = [];
  private drillProgress = 0;
  private drillBest = 0;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.createTerrain();
    this.createBuiltCourt();
    this.ambient = new AmbientLife(scene, "returnObservatory", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-9.1, 0, 7.2), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "returnObservatory", () => this.hud.reducedMotion);
    this.createTable();
    this.createLeaves();
    this.createKeeper();
    const unlocked = Boolean(context?.livingSurveyComplete);
    if (!unlocked) this.stage = "sealed";
    if (context?.lineageChamberComplete) { this.stage = "complete"; this.leaves.forEach((leaf) => { leaf.inspected = true; leaf.plate.material = this.mat(`open-almanac-complete-${leaf.id}`, saffron, saffron.scale(0.46)); }); }
    this.drillBest = context?.lineageDrillBest ?? 0;
    this.hud.patch({
      chapter: "Chapter XII · Lineage Chamber",
      questTitle: context?.lineageChamberComplete ? "The fourfold comparison can travel" : unlocked ? "Enter the Lineage Chamber" : "The chamber awaits a new field mark",
      questDetail: context?.lineageChamberComplete ? context.fourfoldComparison || "Return to the copper table for a seasonal four-leaf comparison order." : unlocked ? "Approach the central table, then inspect the earlier line, amendment, variance, and next reader as separate physical leaves." : "Set a new field mark beside its lineage in the Living Survey before the next season can begin its comparison practice.",
      glyphs: context?.lineageChamberComplete ? 4 : 0,
      glyphGoal: 4,
      season: this.season,
      timeOfDay: "Dusk comparison",
      notice: this.keeperVoice(),
      openAlmanacReady: context?.openAlmanacReady ?? false,
      lineageChamberLayers: context?.lineageChamberComplete ? 4 : 0,
      lineageChamberComplete: context?.lineageChamberComplete ?? false,
      fourfoldComparison: context?.fourfoldComparison ?? "",
      chapterTwelveSignal: context?.chapterTwelveSignal ?? "",
      lineageDrillBest: this.drillBest,
      lineageDrillSeason: context?.lineageDrillSeason ?? "",
      journeyMode: context?.journeyMode ?? "new",
      materials: { mapFragment: 0, copperFitting: 0, waterReed: 0, shelterCloth: 0, mangroveResin: 0, saltLeaf: 0, confluenceSeal: 0, observatoryFolio: 0 },
    });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }

  private createTerrain() {
    const ground = MeshBuilder.CreateGround("lineage-chamber-ground", { width: 31, height: 27, subdivisions: 12 }, this.scene); ground.material = this.mat("lineage-chamber-ground-mat", Color3.FromHexString("#1C2D34"), indigo.scale(0.7));
    const basin = MeshBuilder.CreateCylinder("lineage-chamber-basin", { diameter: 22.8, height: 0.16, tessellation: 64 }, this.scene); basin.position.y = 0.05; basin.material = this.mat("lineage-chamber-basin-mat", Color3.FromHexString("#3A4A46"), Color3.FromHexString("#10211F"));
    [18.5, 13.4, 8.3].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`lineage-chamber-ring-${index}`, { diameter, thickness: 0.05, tessellation: 56 }, this.scene); ring.position.y = 0.18 + index * 0.025; ring.rotation.x = Math.PI / 2; ring.material = this.mat(`lineage-chamber-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? jade.scale(0.2) : copper.scale(0.18)); });
    [[-9.7, 0.4, -5.1], [-6.4, 0.4, -7.4], [8.8, 0.4, 4.8], [7.4, 0.4, 7.3]].forEach((point, index) => { const marker = MeshBuilder.CreateBox(`lineage-record-panel-${index}`, { width: 0.34, height: 2.5, depth: 1.4 }, this.scene); marker.position = new Vector3(point[0], point[1] + 1.12, point[2]); marker.rotation.y = index * 0.52; marker.material = this.mat(`lineage-record-panel-mat-${index}`, index % 2 ? Color3.FromHexString("#51442E") : Color3.FromHexString("#325146"), indigo.scale(0.18)); });
  }

  private createBuiltCourt() {
    const pilgrimage = MeshBuilder.CreateBox("lineage-chamber-pilgrimage-path", { width: 1.08, height: 0.13, depth: 20.5 }, this.scene); pilgrimage.position = new Vector3(-0.65, 0.28, 0.55); pilgrimage.rotation.y = -0.58; pilgrimage.material = this.mat("lineage-chamber-pilgrimage-path-mat", parchment, parchment.scale(0.12));
    [[-8.2, 0.31, 6.4, 4.4, 1.25, 3.2], [-5.1, 0.3, 2.7, 3.0, 1.0, 2.4], [5.9, 0.31, -5.7, 4.0, 1.25, 3.0], [8.0, 0.28, -1.3, 2.7, 1.0, 3.8]].forEach(([x, y, z, width, height, depth], index) => { const terrace = MeshBuilder.CreateBox(`lineage-chamber-terrace-${index}`, { width, height, depth }, this.scene); terrace.position = new Vector3(x, y, z); terrace.material = this.mat(`lineage-chamber-terrace-mat-${index}`, index % 2 ? Color3.FromHexString("#6A4A34") : Color3.FromHexString("#4B554C"), index % 2 ? copper.scale(0.12) : jade.scale(0.08)); const stair = MeshBuilder.CreateBox(`lineage-chamber-stair-${index}`, { width: width * .72, height: .16, depth: .54 }, this.scene); stair.position = new Vector3(x, y + height / 2 + .08, z + depth / 2 + .25); stair.material = this.mat(`lineage-chamber-stair-mat-${index}`, parchment, parchment.scale(.12)); });
    [-6.4, -3.1, .2, 3.5, 6.8].forEach((offset, index) => { const mark = MeshBuilder.CreateTorus(`lineage-chamber-etched-mark-${index}`, { diameter: .62, thickness: .035, tessellation: 24 }, this.scene); mark.position = new Vector3(-.65 + offset * .4, .37, .45 - offset); mark.rotation.x = Math.PI / 2; mark.material = this.mat(`lineage-chamber-etched-mark-mat-${index}`, index % 2 ? jade : copper, index % 2 ? jade.scale(.22) : copper.scale(.22)); });
  }

  private createTable() {
    this.table = new TransformNode("lineage-chamber-table", this.scene); this.table.position = new Vector3(1.6, 0, -1.5);
    const plinth = MeshBuilder.CreateCylinder("lineage-chamber-plinth", { diameter: 5.65, height: 0.4, tessellation: 48 }, this.scene); plinth.parent = this.table; plinth.position.y = 0.2; plinth.material = this.mat("lineage-chamber-plinth-mat", Color3.FromHexString("#3B4C46"), indigo.scale(0.2));
    const register = MeshBuilder.CreateCylinder("lineage-chamber-register", { diameter: 4.25, height: 0.14, tessellation: 42 }, this.scene); register.parent = this.table; register.position.y = 0.47; register.material = this.mat("lineage-chamber-register-mat", Color3.FromHexString("#B99763"), copper.scale(0.2));
    [5.4, 4.15, 2.95, 1.74].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`lineage-chamber-armillary-${index}`, { diameter, thickness: 0.09, tessellation: 48 }, this.scene); ring.parent = this.table; ring.position.y = 0.68 + index * 0.1; ring.rotation.x = index % 2 ? 0 : Math.PI / 2; ring.rotation.z = index * 0.45; ring.material = this.mat(`lineage-chamber-armillary-mat-${index}`, index === 1 ? jade : copper, index === 1 ? jade.scale(0.28) : copper.scale(0.18)); });
  }

  private createLeaves() {
    const data: { id: LeafId; color: Color3; position: Vector3; copy: string; phase: number }[] = [
      { id: "earlier", color: parchment, position: new Vector3(-2.65, 0, -4.8), copy: "Earlier line · the route’s first source, condition, and return marker remain legible.", phase: 0 },
      { id: "amendment", color: jade, position: new Vector3(2.2, 0, -5.9), copy: "Amendment · changed ground stays beside the earlier reach rather than replacing it.", phase: 1.4 },
      { id: "variance", color: saffron, position: new Vector3(5.95, 0, -2.55), copy: "Variance · this reader’s field mark names a difference without declaring the route complete.", phase: 2.8 },
      { id: "reader", color: starBlue, position: new Vector3(4.25, 0, 2.15), copy: "Next reader · another traveler receives enough context to compare and revise with care.", phase: 4.2 },
    ];
    data.forEach((entry, index) => { const root = new TransformNode(`lineage-chamber-leaf-${entry.id}`, this.scene); root.position.copyFrom(entry.position); const base = MeshBuilder.CreateCylinder(`lineage-chamber-leaf-base-${entry.id}`, { diameter: 1.7, height: 0.25, tessellation: 24 }, this.scene); base.parent = root; base.position.y = 0.15; base.material = this.mat(`lineage-chamber-leaf-base-mat-${entry.id}`, Color3.FromHexString("#485249"), indigo.scale(0.16)); const plate = MeshBuilder.CreateBox(`lineage-chamber-leaf-plate-${entry.id}`, { width: 1.18, height: 0.09, depth: 0.84 }, this.scene); plate.parent = root; plate.position.y = 0.39; plate.rotation.y = index * 0.48; plate.material = this.mat(`lineage-chamber-leaf-plate-mat-${entry.id}`, entry.color, entry.color.scale(0.24)); const thread = MeshBuilder.CreateBox(`lineage-chamber-thread-${entry.id}`, { width: 0.05, height: 0.04, depth: 2.4 }, this.scene); thread.parent = root; thread.position = new Vector3(0, 0.48, 0.92); thread.rotation.y = index * 0.48; thread.material = this.mat(`lineage-chamber-thread-mat-${entry.id}`, entry.color, entry.color.scale(0.46), 0.86); this.leaves.push({ id: entry.id, root, plate, copy: entry.copy, inspected: false, phase: entry.phase }); });
  }

  private createKeeper() { this.keeper = new TransformNode("open-almanac-keeper", this.scene); this.keeper.position = new Vector3(-0.75, 0, 1.8); this.keeperFigure = buildNpcFigure({ scene: this.scene, root: this.keeper, name: "open-almanac-keeper", robeColor: Color3.FromHexString("#4B5C52"), robeHeight: 1.5, robeDiameterTop: 0.52, robeDiameterBottom: 0.72, robeEmissive: Color3.FromHexString("#4B5C52").scale(0.05), skinColor: Color3.FromHexString("#A37050"), eyeColor: jade, shawlColor: parchment, shawlWidth: 0.76, propColor: copper, propType: "ceremonial", propHeight: 1.72, propRotationZ: 0.16, posture: "upright", reducedMotion: () => this.hud.reducedMotion }); this.keeperBillboard = createPortraitBillboard(this.scene, this.keeper, assets.livingSurvey, () => this.hud.reducedMotion); }

  update(delta: number) { const step = Math.min(delta, 0.05); const calm = this.hud.reducedMotion; this.time += step; this.player.move(this.input.movement(), step, 4.75); this.player.update(step); if (!this.demo && this.input.consumePulse()) this.hud.patch({ notice: this.stage === "sealed" ? "A pulse cannot open the chamber without a published variance." : "The Chamber asks for inspection and relation, not a stronger pulse." }); if (!this.demo && this.input.consumeInteract()) this.interact(); this.ambient.update(step); this.leaves.forEach((leaf) => { if (!leaf.inspected) { leaf.root.position.y = calm ? 0 : Math.sin(this.time * 1.1 + leaf.phase) * 0.05; leaf.plate.rotation.y += calm ? step * 0.03 : step * 0.15; } }); this.keeper.position.y = calm ? 0 : Math.sin(this.time) * 0.02; this.keeperFigure.update(step, this.time); this.keeperBillboard.update(this.player.root.position, this.camera.position); const target = this.stage === "inspect" || this.stage === "choice" || this.stage === "complete" ? this.table.position : this.stage === "drill" ? this.leaves.find((leaf) => !leaf.inspected)?.root.position : undefined; this.cameraMotion.update(step, this.player, target, this.input); }

  private interact() { if (this.stage === "sealed") { this.hud.patch({ notice: "Keeper of Margins: the chamber opens after the Living Survey publishes a visible variance." }); return; } if (this.stage === "approach" && Vector3.Distance(this.player.root.position, this.table.position) < 3.8) { this.stage = "inspect"; this.hud.patch({ questTitle: "Inspect four lineage leaves", questDetail: "Walk to each copper leaf and press E. Earlier line, amendment, variance, and next reader must each remain visible.", notice: "Keeper of Margins: a useful relation starts by refusing to let one leaf speak for the entire table." }); if (!this.demo) this.feedback.speak(); return; } if (this.stage === "inspect") { this.inspectLeaf(); return; } if (this.stage === "complete" && Vector3.Distance(this.player.root.position, this.table.position) < 3.8) { this.startDrill(); return; } if (this.stage === "drill") { this.recordDrill(); return; } if (Vector3.Distance(this.player.root.position, this.keeper.position) < 3.1) { this.hud.patch({ notice: this.keeperVoice() }); if (!this.demo) this.feedback.speak(); } }

  private inspectLeaf() { const leaf = this.leaves.find((entry) => !entry.inspected && Vector3.Distance(entry.root.position, this.player.root.position) < 2.25); if (!leaf) { const next = this.leaves.find((entry) => !entry.inspected); this.hud.patch({ notice: next ? `Walk to the ${next.id} leaf and press E. It must be read before the public notation can travel.` : "All leaves are held apart. Return to the table to choose a public notation." }); if (!next && Vector3.Distance(this.player.root.position, this.table.position) < 3.8) this.openChoice(); return; } else { leaf.inspected = true; leaf.plate.material = this.mat(`lineage-chamber-inspected-${leaf.id}`, saffron, saffron.scale(0.54)); const count = this.leaves.filter((entry) => entry.inspected).length; this.hud.patch({ glyphs: count, lineageChamberLayers: count, questTitle: "Inspect four lineage leaves", questDetail: `${count} / 4 leaves compared. ${leaf.copy}`, notice: `Leaf held separately: ${leaf.copy}` }); if (!this.demo) this.feedback.collect(); if (count === 4) this.hud.patch({ questTitle: "Return to the fourfold table", questDetail: "All four leaves are visible. Return to the central table and press E to choose a public notation.", notice: "Keeper of Margins: comparison is ready when the table can show relation without erasing difference." }); } }

  private openChoice() { if (this.leaves.some((leaf) => !leaf.inspected)) return; this.stage = "choice"; this.hud.patch({ choiceOpen: true, choiceMode: "survey", questTitle: "Name the fourfold comparison", questDetail: "Choose which reader-facing relation should carry the four leaves into the next season.", notice: "Tara: the next route should inherit our care, not our certainty." }); }

  chooseStance = (trait: TraitKey) => { if (this.stage !== "choice") return; this.stage = "complete"; const outcomes: Record<TraitKey, string> = { viveka: "Fourfold Comparison · publish the earlier line and its changed condition with a clear variance frame for the next reader.", sahas: "Fourfold Comparison · publish the amendment and new variance before the route hardens into a false certainty.", karuna: "Fourfold Comparison · publish the route beside the reader whose daily passage bears the difference first." }; const comparison = outcomes[trait]; this.hud.patch({ choiceOpen: false, openAlmanacReady: true, lineageChamberComplete: true, lineageChamberLayers: 4, fourfoldComparison: comparison, chapterTwelveSignal: "Chapter XII · the Lineage Chamber opens the Wind Ledger Terrace, where seasonal readings must become a usable forecast without false certainty.", lineageDrillBest: this.drillBest, milestone: "Open Almanac · fourfold comparison recorded", questTitle: "The Open Almanac begins", questDetail: comparison, notice: `${comparison} Keeper of Margins: the next season can now ask what changes when a record meets wind, repair, and a different community.` }); if (!this.demo) this.feedback.align(); };

  private startDrill() { const orders: LeafId[][] = [["earlier", "amendment", "variance", "reader"], ["amendment", "variance", "reader", "earlier"], ["variance", "reader", "earlier", "amendment"], ["reader", "earlier", "amendment", "variance"], ["earlier", "variance", "amendment", "reader"], ["reader", "amendment", "variance", "earlier"]]; const index = this.season.includes("Vasanta") ? 0 : this.season.includes("Grishma") ? 1 : this.season.includes("Varsha") ? 2 : this.season.includes("Sharad") ? 3 : this.season.includes("Hemanta") ? 4 : 5; this.drillOrder = orders[index]; this.drillProgress = 0; this.stage = "drill"; this.leaves.forEach((leaf) => { leaf.inspected = false; leaf.plate.material = this.mat(`lineage-chamber-drill-${leaf.id}`, copper, copper.scale(0.18)); }); this.hud.patch({ glyphs: 0, questTitle: "Seasonal fourfold order", questDetail: `Trace the ${this.season.split(" · ")[0]} order: ${this.drillOrder.join(" → ")}. Stand beside each leaf and press E.`, lineageDrillSeason: this.season, notice: this.context?.journeyMode === "new-plus" ? "New Journey+ · carried mastery is present, but the season still chooses the order of attention." : "Keeper of Margins: replay changes the route through the leaves, not the need to keep each one visible." }); }

  private recordDrill() { const leaf = this.leaves.find((entry) => !entry.inspected && Vector3.Distance(entry.root.position, this.player.root.position) < 2.25); if (!leaf) { this.hud.patch({ notice: "Stand beside the next unrecorded leaf before pressing E." }); return; } const expected = this.drillOrder[this.drillProgress]; if (leaf.id !== expected) { this.hud.patch({ notice: `${leaf.id} arrived too early. This seasonal comparison begins with ${expected}.` }); return; } leaf.inspected = true; leaf.plate.material = this.mat(`lineage-chamber-drill-recorded-${leaf.id}`, saffron, saffron.scale(0.45)); this.drillProgress += 1; if (this.drillProgress === 4) { this.stage = "complete"; this.drillBest += 1; this.hud.patch({ glyphs: 4, lineageDrillBest: this.drillBest, lineageDrillSeason: this.season, milestone: `Lineage Chamber · ${this.season.split(" · ")[0]} comparison order recorded`, notice: "Tara: a changed order can make a return route more careful, if each leaf still keeps its own name." }); } else this.hud.patch({ glyphs: this.drillProgress, notice: `${leaf.id} carried. Next: ${this.drillOrder[this.drillProgress]}.` }); }

  private keeperVoice() { if (this.context?.journeyMode === "new-plus") return "Keeper of Margins: a carried skill is a companion, not a shortcut. Let the new season choose what must be read again."; return this.context?.livingSurveyComplete ? "Keeper of Margins: the Living Survey showed a new mark. This chamber asks how four related records can remain distinct in public." : "Keeper of Margins: the first leaf cannot enter before a visible variance has been published."; }
  advanceSeason = () => { this.season = this.ambient.advanceSeason(); this.hud.patch({ season: this.season, lineageDrillSeason: this.season, notice: `${this.season} changes the order in which the four leaves request attention.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time} changes the table’s reading surface without changing the four leaves.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: "Aruna’s Chamber note: distinguish the source of a line from the condition that later changed its reach.", muni: "Laya’s Chamber note: practice leaves room for another reader to name a difference without turning it into a verdict.", raja: "Somavrat’s Chamber note: a shared record must name the reader who will rely on the comparison before the council treats it as settled." }; this.hud.patch({ notice: notes[guide] }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.keeperBillboard.dispose(); }
}
