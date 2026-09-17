// Chapter V design reminder: copper warning lenses, parchment records, jade refuge terraces, and the climb from shelter to high observatory make knowledge visibly public care.
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

type SignalLens = { root: TransformNode; core: Mesh; aligned: boolean; label: string; phase: number };
type Pulse = { ring: Mesh; motes: Mesh[]; age: number };

const saffron = Color3.FromHexString("#F26B38");
const copper = Color3.FromHexString("#B66A35");
const jade = Color3.FromHexString("#3A7968");
const parchment = Color3.FromHexString("#D7B77D");
const rainBlue = Color3.FromHexString("#93C8DD");

export class ArchiveWorld {
  private input = new InputManager();
  private feedback = new SoundFeedback();
  private player: Player;
  private cameraMotion: CinematicCamera;
  private ambient: AmbientLife;
  private lenses: SignalLens[] = [];
  private pulses: Pulse[] = [];
  private rings: Mesh[] = [];
  private ledger!: TransformNode;
  private keeper!: TransformNode;
  private keeperFigure!: NpcFigure;
  private keeperBillboard!: PortraitBillboard;
  private time = 0;
  private pulseCooldown = 0;
  private aligned = 0;
  private stage: "sealed" | "approach" | "read" | "ledger" | "drill" | "complete" = "approach";
  private traits = { viveka: 48, sahas: 36, karuna: 42 };
  private readonly ledgerPosition = new Vector3(5.7, 0, -4.4);
  private drillOrder: string[] = [];
  private drillProgress = 0;
  private drillRecord = 0;
  private archiveSeason = "Hemanta · high-ridge clarity";
  private newPlus = false;

  constructor(private scene: Scene, private camera: ArcRotateCamera, private hud: HudBridge, private demo: boolean, private context?: JourneyContext) {
    this.newPlus = context?.journeyMode === "new-plus";
    this.createRidge();
    this.ambient = new AmbientLife(scene, "archive", () => this.hud.reducedMotion);
    this.player = new Player(scene, new Vector3(-8.1, 0, 7.1), () => this.hud.reducedMotion);
    this.cameraMotion = new CinematicCamera(camera, "archive", () => this.hud.reducedMotion);
    this.createLenses();
    this.createLedgerAndKeeper();
    const unlocked = Boolean(context?.stormfrontComplete && context?.chapterFiveSignal);
    if (!unlocked) this.stage = "sealed";
    this.drillRecord = context?.archiveDrillBest ?? 0;
    if (context?.archiveComplete) {
      this.stage = "complete";
      this.aligned = 3;
      this.lenses.forEach((lens, index) => { lens.aligned = true; lens.core.material = this.mat(`returned-archive-lens-${index}`, saffron, saffron); });
    }
    this.hud.patch({
      chapter: "Chapter V · High-Ridge Warning Archive",
      questTitle: context?.archiveComplete ? "The ledger keeps its promise" : unlocked ? this.newPlus ? "The ridge receives the warning · New Journey+ no-pulse" : "The ridge receives the warning" : "The Archive waits behind weather",
      questDetail: context?.archiveComplete ? context.chapterSixSignal || "The archive has sent its first shared warning beyond the ridge." : unlocked ? this.newPlus ? "New Journey+ · no-pulse mode: walk to each warning lens and press E to read it. The focus pulse is silent here; careful reading replaces it." : "Reach the Resonance Ledger at the upper terrace and press E to begin comparing the three warning lenses." : "Complete the Monsoon stormfront route and make a public water decision before the High-Ridge Archive opens.",
      glyphs: context?.archiveComplete ? 3 : 0,
      glyphGoal: 3,
      season: this.archiveSeason,
      timeOfDay: "Ridge watch",
      notice: context?.archiveComplete ? context.chapterSixSignal || "The Archive Keeper records a route only when it can warn someone beyond the reader." : this.archiveVoice(),
      taraBond: context?.taraBond ?? 0,
      taraStormQuest: context?.taraStormQuest ?? 0,
      stormfrontComplete: context?.stormfrontComplete ?? false,
      publicChoice: context?.publicChoice ?? "",
      chapterFiveSignal: context?.chapterFiveSignal ?? "",
      archiveUnlocked: unlocked,
      archiveSignals: context?.archiveComplete ? 3 : 0,
      archiveComplete: context?.archiveComplete ?? false,
      archiveShard: context?.archiveShard ?? 0,
      chapterSixSignal: context?.chapterSixSignal ?? "",
      taraArchiveRoute: context?.taraArchiveRoute ?? 0,
      archiveDrillBest: context?.archiveDrillBest ?? 0,
      archiveDrillSeason: context?.archiveDrillSeason ?? "",
    });
  }

  private mat(name: string, color: Color3, emissive = Color3.Black(), alpha = 1) { const material = new StandardMaterial(name, this.scene); material.diffuseColor = color; material.emissiveColor = emissive; material.specularColor = Color3.Black(); material.alpha = alpha; return material; }
  private createRidge() {
    const ridge = MeshBuilder.CreateGround("archive-ridge-ground", { width: 27, height: 24, subdivisions: 14 }, this.scene);
    ridge.material = this.mat("archive-ridge-stone", Color3.FromHexString("#283137"), Color3.FromHexString("#0A121B"));
    const terraceMaterial = this.mat("archive-terrace-parchment", Color3.FromHexString("#C7965D"));
    [-7.2, -2.5, 2.4, 6.4].forEach((x, index) => {
      const terrace = MeshBuilder.CreateBox(`archive-terrace-${index}`, { width: 4.5, height: 0.24 + index * 0.06, depth: 3.2 }, this.scene);
      terrace.position = new Vector3(x, 0.12 + index * 0.06, 5.6 - index * 3.45);
      terrace.rotation.y = -0.16;
      terrace.material = index % 2 ? this.mat(`archive-terrace-jade-${index}`, Color3.FromHexString("#2D655C"), Color3.FromHexString("#102A28")) : terraceMaterial;
    });
    const diagonalPath = MeshBuilder.CreateBox("archive-diagonal-path", { width: 1.15, height: 0.05, depth: 19.5 }, this.scene);
    diagonalPath.position = new Vector3(-0.35, 0.26, 0.2);
    diagonalPath.rotation.y = -0.52;
    diagonalPath.material = this.mat("archive-path-material", parchment, Color3.FromHexString("#2D190C"));
    const channel = MeshBuilder.CreateBox("archive-wind-rain-channel", { width: 0.46, height: 0.04, depth: 18.2 }, this.scene);
    channel.position = new Vector3(-2.9, 0.3, -0.6);
    channel.rotation.y = -0.52;
    channel.material = this.mat("archive-channel-material", rainBlue, Color3.FromHexString("#15394A"), 0.92);
    const horizon = MeshBuilder.CreatePlane("archive-visual-target", { width: 32, height: 18 }, this.scene);
    horizon.position = new Vector3(0, 7.6, 14.2);
    horizon.material = this.mat("archive-visual-target-mat", Color3.FromHexString("#12253A"), Color3.FromHexString("#071025"), 0.52);
    const horizonMat = horizon.material as StandardMaterial;
    horizonMat.diffuseTexture = new Texture(assets.warningArchive, this.scene);
    horizonMat.emissiveTexture = new Texture(assets.warningArchive, this.scene);
    horizonMat.emissiveColor = Color3.FromHexString("#1B344A");
    for (let index = 0; index < 13; index += 1) {
      const angle = (Math.PI * 2 * index) / 13;
      const rock = MeshBuilder.CreateSphere(`archive-ridge-rock-${index}`, { diameter: 0.9 + (index % 3) * 0.65, segments: 7 }, this.scene);
      rock.scaling.y = 0.64;
      rock.position = new Vector3(Math.cos(angle) * (10.1 + (index % 2)), 0.3, Math.sin(angle) * (10.1 + (index % 2)));
      rock.material = this.mat(`archive-rock-mat-${index}`, Color3.FromHexString(index % 2 ? "#202A31" : "#39434A"));
    }
  }

  private createLenses() {
    [[new Vector3(-5.6, 0.28, 2.4), "River evidence"], [new Vector3(-0.2, 0.28, -2.7), "Wind reading"], [new Vector3(5.8, 0.28, 1.6), "Settlement memory"]].forEach(([position, label], index) => {
      const root = new TransformNode(`archive-lens-${index}`, this.scene);
      root.position.copyFrom(position as Vector3);
      const base = MeshBuilder.CreateCylinder(`archive-lens-base-${index}`, { height: 0.22, diameter: 1.5, tessellation: 22 }, this.scene);
      base.parent = root; base.position.y = 0.11; base.material = this.mat(`archive-lens-base-mat-${index}`, Color3.FromHexString("#24333A"));
      const core = MeshBuilder.CreateTorus(`archive-lens-core-${index}`, { diameter: 1.6, thickness: 0.1, tessellation: 36 }, this.scene);
      core.parent = root; core.position.y = 1.08; core.rotation.x = Math.PI / 2; core.material = this.mat(`archive-lens-core-mat-${index}`, copper, Color3.FromHexString("#341608"));
      const axis = MeshBuilder.CreateBox(`archive-lens-axis-${index}`, { width: 1.95, height: 0.06, depth: 0.1 }, this.scene);
      axis.parent = root; axis.position.y = 1.08; axis.material = this.mat(`archive-lens-axis-mat-${index}`, parchment, Color3.FromHexString("#2E1D0B"));
      this.lenses.push({ root, core, aligned: false, label: label as string, phase: index * 2.1 });
    });
  }

  private createLedgerAndKeeper() {
    this.ledger = new TransformNode("resonance-ledger", this.scene);
    this.ledger.position.copyFrom(this.ledgerPosition);
    const plinth = MeshBuilder.CreateCylinder("ledger-plinth", { diameter: 3.2, height: 0.24, tessellation: 32 }, this.scene);
    plinth.parent = this.ledger; plinth.position.y = 0.12; plinth.material = this.mat("ledger-plinth-mat", Color3.FromHexString("#1A252B"));
    [2.6, 1.82, 1.05].forEach((diameter, index) => { const ring = MeshBuilder.CreateTorus(`ledger-ring-${index}`, { diameter, thickness: 0.07, tessellation: 34 }, this.scene); ring.parent = this.ledger; ring.position.y = 0.42 + index * 0.12; ring.rotation.x = Math.PI / 2; ring.rotation.z = index * 0.64; ring.material = this.mat(`ledger-ring-mat-${index}`, index === 1 ? jade : copper, index === 1 ? Color3.FromHexString("#123A35") : Color3.FromHexString("#311407")); this.rings.push(ring); });
    const scroll = MeshBuilder.CreateBox("ledger-parchment-scroll", { width: 1.45, height: 0.08, depth: 0.82 }, this.scene);
    scroll.parent = this.ledger; scroll.position.y = 0.86; scroll.material = this.mat("ledger-scroll-mat", parchment, Color3.FromHexString("#5C351B"));
    this.keeper = new TransformNode("archive-keeper", this.scene);
    this.keeper.position = new Vector3(7.35, 0, -5.35);
    this.keeperFigure = buildNpcFigure({ scene: this.scene, root: this.keeper, name: "archive-keeper", robeColor: Color3.FromHexString("#253C4B"), robeHeight: 1.3, robeDiameterTop: 0.42, robeDiameterBottom: 0.6, robeEmissive: Color3.FromHexString("#253C4B").scale(0.05), skinColor: Color3.FromHexString("#A06B4B"), eyeColor: rainBlue, shawlColor: parchment, shawlWidth: 0.72, propColor: copper, propType: "staff", propHeight: 1.45, propRotationZ: -0.18, posture: "hunched", reducedMotion: () => this.hud.reducedMotion });
    this.keeperBillboard = createPortraitBillboard(this.scene, this.keeper, assets.warningArchive, () => this.hud.reducedMotion);
  }

  update(delta: number) {
    const step = Math.min(delta, 0.05);
    this.time += step;
    this.pulseCooldown = Math.max(0, this.pulseCooldown - step);
    this.player.move(this.input.movement(), step, 4.75);
    this.player.update(step);
    if (!this.demo && this.input.consumePulse()) this.releasePulse();
    if (!this.demo && this.input.consumeInteract()) this.interact();
    this.ambient.update(step);
    const calm = this.hud.reducedMotion;
    this.lenses.forEach((lens) => { if (!lens.aligned) { lens.core.rotation.z += calm ? step * 0.26 : step * 1.3; lens.root.position.y = calm ? 0.28 : 0.28 + Math.sin(this.time * 1.7 + lens.phase) * 0.08; } });
    this.rings.forEach((ring, index) => { ring.rotation.z += step * (index % 2 ? -0.72 : 0.54) * (this.stage === "complete" ? 2 : 1) * (calm ? 0.2 : 1); });
    this.keeper.position.y = calm ? 0 : Math.sin(this.time * 1.2) * 0.018;
    this.keeperFigure.update(step, this.time);
    this.keeperBillboard.update(this.player.root.position, this.camera.position);
    this.pulses = this.pulses.filter((pulse) => { pulse.age += step; pulse.ring.scaling.setAll(1 + pulse.age * 8); (pulse.ring.material as StandardMaterial).alpha = Math.max(0, 0.88 - pulse.age * 0.88); pulse.motes.forEach((mote, index) => { const angle = (Math.PI * 2 * index) / pulse.motes.length; mote.position.x += Math.cos(angle) * step * 2.1; mote.position.z += Math.sin(angle) * step * 2.1; mote.position.y += step * 0.74; mote.scaling.setAll(Math.max(0.05, 1 - pulse.age)); }); if (pulse.age > 1) { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); return false; } return true; });
    this.cameraMotion.update(step, this.player, this.stage === "ledger" || this.stage === "complete" ? this.ledgerPosition : this.stage === "read" || this.stage === "drill" ? this.lenses.find((lens) => !lens.aligned)?.root.position : undefined, this.input);
    this.hud.patch({ pulseReady: this.pulseCooldown <= 0 });
  }

  private releasePulse() {
    if (this.pulseCooldown > 0) return;
    this.pulseCooldown = 1.45;
    const ring = MeshBuilder.CreateTorus("archive-focus-pulse", { diameter: 0.86, thickness: 0.07, tessellation: 38 }, this.scene);
    ring.position = this.player.root.position.clone(); ring.position.y = 0.28; ring.rotation.x = Math.PI / 2; ring.material = this.mat("archive-pulse-mat", saffron, saffron, 0.88);
    const motes = Array.from({ length: 14 }, (_, index) => { const mote = MeshBuilder.CreateSphere(`archive-pulse-mote-${index}`, { diameter: 0.09, segments: 6 }, this.scene); const angle = (Math.PI * 2 * index) / 14; mote.position = ring.position.add(new Vector3(Math.cos(angle) * 0.5, 0.04, Math.sin(angle) * 0.5)); mote.material = this.mat(`archive-pulse-mote-mat-${index}`, saffron, saffron); return mote; });
    this.pulses.push({ ring, motes, age: 0 });
    this.cameraMotion.emphasize();
    if (!this.demo) this.feedback.pulse();
    if (this.stage !== "read") { this.hud.patch({ notice: this.stage === "sealed" ? "The ridge will not open without a shared Monsoon consequence in the Chronicle." : this.stage === "drill" ? "The seasonal signal route uses E at each lens; it tests the order in which a warning must travel." : "At the Archive, focus pulses become evidence only when a signal lens has been named." }); return; }
    if (this.newPlus) { this.hud.patch({ notice: "New Journey+ · no-pulse mode: the focus pulse is silent at the Archive. Walk to each warning lens and press E to read it carefully." }); return; }
    const lens = this.lenses.find((entry) => !entry.aligned && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8);
    if (!lens) { this.hud.patch({ notice: "Stand by an unaligned warning lens. River evidence, wind readings, and settlement memory must each be compared." }); return; }
    lens.aligned = true; lens.core.material = this.mat(`archive-lens-aligned-${this.aligned}`, saffron, saffron); this.aligned += 1;
    if (!this.demo) this.feedback.collect();
    if (this.aligned === 3) { this.stage = "ledger"; this.hud.patch({ glyphs: 3, archiveSignals: 3, questTitle: "The Resonance Ledger receives", questDetail: "All three readings agree. Return to the upper ledger and press E to send the warning beyond the ridge.", notice: "The Archive Keeper: Evidence becomes a warning only when it can travel farther than its first reader." }); }
    else this.hud.patch({ glyphs: this.aligned, archiveSignals: this.aligned, notice: `${lens.label} has been compared. The Ledger still needs ${3 - this.aligned} signal${3 - this.aligned === 1 ? "" : "s"}.` });
  }

  private interact() {
    if (this.stage === "sealed") { this.hud.patch({ notice: "Archive Keeper: Return when the Monsoon instrument has carried a public promise into your Chronicle." }); return; }
    if (this.newPlus && this.stage === "read") { const lens = this.lenses.find((entry) => !entry.aligned && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8); if (lens) { lens.aligned = true; lens.core.material = this.mat(`archive-lens-aligned-${this.aligned}`, saffron, saffron); this.aligned += 1; if (!this.demo) this.feedback.collect(); if (this.aligned === 3) { this.stage = "ledger"; this.hud.patch({ glyphs: 3, archiveSignals: 3, questTitle: "The Resonance Ledger receives", questDetail: "All three readings agree. Return to the upper ledger and press E to send the warning beyond the ridge.", notice: "The Archive Keeper: Evidence becomes a warning only when it can travel farther than its first reader." }); } else this.hud.patch({ glyphs: this.aligned, archiveSignals: this.aligned, notice: `${lens.label} has been read carefully. The Ledger still needs ${3 - this.aligned} signal${3 - this.aligned === 1 ? "" : "s"}.` }); return; } this.hud.patch({ notice: "New Journey+ · no-pulse mode: stand by an unaligned warning lens and press E to read it." }); return; }
    if (this.stage === "approach" && Vector3.Distance(this.player.root.position, this.ledgerPosition) < 3.2) { this.stage = "read"; if (!this.demo) this.feedback.speak(); this.hud.patch({ questTitle: "Compare the warning lenses", questDetail: this.newPlus ? "New Journey+ · no-pulse: walk to each lens and press E. River evidence, wind reading, and settlement memory must each be compared." : "Use focus pulses at the three lenses: river evidence, wind reading, and settlement memory.", glyphs: 0, glyphGoal: 3, notice: `${this.archiveVoice()} The Keeper opens the Resonance Ledger and asks what the mountain must say before danger arrives.` }); return; }
    if (this.stage === "ledger" && Vector3.Distance(this.player.root.position, this.ledgerPosition) < 3.2) { this.resolveLedger(); return; }
    if (this.stage === "complete" && Vector3.Distance(this.player.root.position, this.ledgerPosition) < 3.2) { this.startArchiveDrill(); return; }
    if (this.stage === "drill") { this.recordDrillLens(); return; }
    if (Vector3.Distance(this.player.root.position, this.keeper.position) < 3.2) { this.feedback.speak(); this.hud.patch({ notice: `${this.archiveVoice()} The Keeper refuses to treat a warning as property; it must reach the people whose tomorrow it describes.` }); }
  }

  private resolveLedger() {
    this.stage = "complete";
    if (!this.demo) this.feedback.align();
    const publicChoice = this.context?.publicChoice || "The Archive records a future warning for whoever lives nearest the next risk.";
    const chapterSixSignal = this.context?.publicChoice.includes("warning") ? "Chapter VI · The Listening Estuary replies: bring the Archive Shard to a coast where tide, trade, and warning meet." : this.context?.publicChoice.includes("passage") ? "Chapter VI · The Listening Estuary replies: a storm corridor reaches the coast, where passage must become a shared signal." : "Chapter VI · The Listening Estuary replies: the Common Roof’s warning has reached the coast, where shelter must become a living map.";
    this.hud.patch({ archiveComplete: true, archiveShard: 1, archiveSignals: 3, taraBond: 4, taraArchiveRoute: 1, milestone: "Archive Shard · shared warning carried", questTitle: "The first warning leaves the ridge", questDetail: chapterSixSignal, chapterSixSignal, notice: `${publicChoice} Tara adds a fourth knot to the compass cord: a route should be planned before the first traveler needs it.` });
  }

  private startArchiveDrill() {
    const orders = [["River evidence", "Wind reading", "Settlement memory"], ["Wind reading", "Settlement memory", "River evidence"], ["Settlement memory", "River evidence", "Wind reading"]];
    const index = this.archiveSeason.includes("Varsha") ? 1 : this.archiveSeason.includes("Hemanta") ? 2 : 0;
    this.drillOrder = orders[index]; this.drillProgress = 0; this.stage = "drill";
    this.lenses.forEach((lens, lensIndex) => { lens.aligned = false; lens.core.material = this.mat(`archive-drill-reset-${lensIndex}`, copper, Color3.FromHexString("#341608")); });
    this.hud.patch({ glyphs: 0, glyphGoal: 3, questTitle: "Seasonal signal route", questDetail: `Carry the ${this.archiveSeason.split(" · ")[0]} warning order: ${this.drillOrder.join(" → ")}. Stand by each lens and press E.`, archiveDrillSeason: this.archiveSeason, notice: "Archive Keeper: replay is not repetition. Wind and season change which account must travel before the next warning can be trusted." });
  }

  private recordDrillLens() {
    const lens = this.lenses.find((entry) => !entry.aligned && Vector3.Distance(entry.root.position, this.player.root.position) < 3.8);
    if (!lens) { this.hud.patch({ notice: "Stand beside the next unaligned lens and press E to place it in the seasonal warning route." }); return; }
    const expected = this.drillOrder[this.drillProgress];
    if (lens.label !== expected) { this.hud.patch({ notice: `${lens.label} arrived too early. This seasonal warning still begins with ${expected}.` }); if (!this.demo) this.feedback.speak(); return; }
    lens.aligned = true; lens.core.material = this.mat(`archive-drill-aligned-${this.drillProgress}`, saffron, saffron); this.drillProgress += 1; if (!this.demo) this.feedback.collect();
    if (this.drillProgress === 3) { this.stage = "complete"; this.drillRecord += 1; this.hud.patch({ glyphs: 3, archiveDrillBest: this.drillRecord, archiveDrillSeason: this.archiveSeason, milestone: `Archive route · ${this.archiveSeason.split(" · ")[0]} signal recorded`, questTitle: "The seasonal warning travels", questDetail: `Seasonal signal sequence ${this.drillRecord} recorded. Return to the Ledger to test another order without erasing the first.`, notice: this.context?.mirrorStepComplete ? `The Countermark Lens changes the replay: ${this.context.corroborationChoice || "the warning now carries its source and limit together."}` : "Archive Keeper: a warning changes with its season, yet remains answerable to the people who must use it." }); }
    else this.hud.patch({ glyphs: this.drillProgress, archiveDrillBest: this.drillRecord, notice: `${lens.label} carried. Next: ${this.drillOrder[this.drillProgress]}.` });
  }

  private archiveVoice() {
    if (!this.context?.publicChoice) return "Archive Keeper: A clear instrument is not enough. It must know whom it is trying to reach.";
    if (this.context.publicChoice.includes("warning")) return "Archive Keeper: You sent the instrument toward a public warning. The ridge will test whether that warning remains legible in wind.";
    if (this.context.publicChoice.includes("passage")) return "Archive Keeper: You held passage open first. The ridge will test whether the path still speaks to people delayed behind you.";
    return "Archive Keeper: You chose shelter for the exposed. The ridge will test whether care can become a signal rather than a private comfort.";
  }

  chooseStance = (_trait: TraitKey) => undefined;
  advanceSeason = () => { const season = this.ambient.advanceSeason(); this.archiveSeason = season; this.hud.patch({ season, archiveDrillSeason: season, notice: `${season} changes the Archive’s mote color and the optional signal order, while the warning lenses remain accountable to the same evidence.` }); };
  advanceTime = () => { const time = this.ambient.advanceTime(); this.hud.patch({ timeOfDay: time, notice: `${time} shifts the ridge light. Copper lenses become easier to distinguish from a convenient reflection.` }); };
  inquireGuide = (guide: "rishi" | "muni" | "raja") => { const notes = { rishi: this.context?.returnObservatoryComplete ? "Aruna’s Observatory return note: the ridge warning keeps its earlier wind corridor beside the later shift, so urgency does not erase the amendment lineage." : this.context?.confluenceComplete ? "Aruna’s archive return note: the warning now keeps its wind corridor and return marker beside the signal that crosses the ridge." : this.context?.mirrorStepComplete ? "Aruna’s archive note: the Countermark Lens makes a warning stronger when it shows the source and limit together." : "Aruna’s archive note: a warning must name what it knows and what it cannot yet prove.", muni: this.context?.returnObservatoryComplete ? "Laya’s Observatory return note: a returning warning makes a measured interval where another ridge reader can name a new wind change." : this.context?.confluenceComplete ? "Laya’s archive return note: a shared warning is strongest when another reader can enter its interval before the weather closes in." : "Laya’s archive note: collective calm is not silence; it is a rhythm people can share under pressure.", raja: `Somavrat’s archive note: ${this.context?.amendmentChoice || this.context?.publicRouteChoice || this.context?.corroborationChoice || this.context?.publicChoice || "a signal is only public when the people most exposed can use it."}` }; this.hud.patch({ notice: notes[guide] }); };
  dispose() { this.input.dispose(); this.player.dispose(); this.feedback.dispose(); this.ambient.dispose(); this.keeperBillboard.dispose(); this.pulses.forEach((pulse) => { pulse.ring.dispose(); pulse.motes.forEach((mote) => mote.dispose()); }); }
}
