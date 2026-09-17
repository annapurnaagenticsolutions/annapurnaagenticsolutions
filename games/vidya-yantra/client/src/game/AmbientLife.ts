// Environment-life design reminder: every motion cue is a quiet navigation or story signal, never empty decoration.
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";

type Biome = "ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory";
type Mote = { mesh: Mesh; phase: number; base: Vector3 };
// When reducedMotion is enabled the ambient layer stays alive but far calmer:
// motes drift at a fraction of their speed/amplitude and roughly half are
// hidden, so the world reads as still-but-present rather than frozen or busy.
type ReducedMotionAccessor = () => boolean;
const seasons = [{ name: "Vasanta · renewal", mote: "#E8C66E", banner: "#B66A35" }, { name: "Grishma · high sun", mote: "#F4B25F", banner: "#B55A32" }, { name: "Varsha · rain", mote: "#93C8DD", banner: "#3A7968" }, { name: "Sharad · clear river", mote: "#F1D1A0", banner: "#3A7968" }, { name: "Hemanta · gold mist", mote: "#D7B77D", banner: "#81513B" }, { name: "Shishira · cool quiet", mote: "#A8D7E8", banner: "#314C70" }];
const times = [{ name: "Dawn study", energy: 0.5 }, { name: "Midday fieldwork", energy: 0.18 }, { name: "Dusk gathering", energy: 0.35 }, { name: "Starfall night", energy: 0.72 }];

const configs: Record<Biome, { mote: string; banner: string; count: number; height: number; speed: number }> = {
  ashram: { mote: "#E8C66E", banner: "#B66A35", count: 28, height: 3.2, speed: 0.7 },
  road: { mote: "#F1D1A0", banner: "#3A7968", count: 24, height: 2.8, speed: 0.95 },
  rasa: { mote: "#A8D7E8", banner: "#B66A35", count: 34, height: 5.3, speed: 0.48 },
  monsoon: { mote: "#93C8DD", banner: "#3A7968", count: 20, height: 3.5, speed: 1.1 },
  archive: { mote: "#D7B77D", banner: "#B66A35", count: 30, height: 5.2, speed: 0.56 },
  estuary: { mote: "#A8D7E8", banner: "#3A7968", count: 32, height: 3.7, speed: 0.82 },
  saltLibrary: { mote: "#DCE4DD", banner: "#B66A35", count: 34, height: 4.6, speed: 0.68 },
  mirrorStep: { mote: "#A8D7E8", banner: "#B66A35", count: 31, height: 5.2, speed: 0.5 },
  confluence: { mote: "#E8C66E", banner: "#3A7968", count: 36, height: 5.7, speed: 0.54 },
  returnObservatory: { mote: "#E8C66E", banner: "#B66A35", count: 38, height: 5.9, speed: 0.48 },
};

export class AmbientLife {
  private motes: Mote[] = [];
  private banners: Mesh[] = [];
  private time = 0;
  private seasonIndex = 0;
  private timeIndex = 0;
  private moteMaterial: StandardMaterial;
  private bannerMaterial: StandardMaterial;
  private reducedMotion: ReducedMotionAccessor = () => false;

  constructor(private scene: Scene, biome: Biome, reducedMotion?: ReducedMotionAccessor) {
    if (reducedMotion) this.reducedMotion = reducedMotion;
    const config = configs[biome];
    this.moteMaterial = new StandardMaterial(`ambient-${biome}-mote-mat`, scene);
    this.moteMaterial.diffuseColor = Color3.FromHexString(config.mote);
    this.moteMaterial.emissiveColor = Color3.FromHexString(config.mote).scale(0.55);
    this.moteMaterial.specularColor = Color3.Black();
    this.bannerMaterial = new StandardMaterial(`ambient-${biome}-banner-mat`, scene);
    this.bannerMaterial.diffuseColor = Color3.FromHexString(config.banner);
    this.bannerMaterial.emissiveColor = Color3.FromHexString(config.banner).scale(0.08);
    this.bannerMaterial.specularColor = Color3.Black();
    for (let index = 0; index < config.count; index += 1) {
      const mote = MeshBuilder.CreateSphere(`ambient-${biome}-mote-${index}`, { diameter: biome === "rasa" || biome === "archive" || biome === "estuary" || biome === "saltLibrary" || biome === "mirrorStep" || biome === "confluence" ? 0.07 : 0.055, segments: 6 }, scene);
      const base = new Vector3(-11 + ((index * 2.91) % 22), 0.7 + ((index * 1.47) % config.height), -10 + ((index * 3.63) % 20));
      mote.position.copyFrom(base);
      mote.material = this.moteMaterial;
      this.motes.push({ mesh: mote, phase: index * 0.51, base });
    }
    [-7.8, -1.2, 5.5].forEach((x, index) => {
      const pole = MeshBuilder.CreateCylinder(`ambient-${biome}-pole-${index}`, { height: 1.7, diameter: 0.045, tessellation: 6 }, scene);
      pole.position = new Vector3(x, 0.86, index === 1 ? -8.5 : 8.2);
      pole.material = this.bannerMaterial;
      const banner = MeshBuilder.CreatePlane(`ambient-${biome}-banner-${index}`, { width: 0.55, height: 0.86 }, scene);
      banner.position = pole.position.add(new Vector3(0.3, 0.32, 0));
      banner.material = this.bannerMaterial;
      this.banners.push(banner);
    });
  }

  update(delta: number) {
    const calm = this.reducedMotion();
    // Advance the shared clock far more slowly when calmed so the rare motion
    // that remains reads as a near-still breath rather than a busy drift.
    this.time += calm ? delta * 0.12 : delta;
    const motionScale = calm ? 0.12 : 1;
    this.motes.forEach((mote, index) => {
      // Hide roughly every other mote when calmed so the air thins without
      // becoming empty; the survivors drift at a fraction of their range.
      const hidden = calm && index % 2 === 0;
      mote.mesh.isVisible = !hidden;
      mote.mesh.position.x = mote.base.x + Math.sin(this.time * 0.55 + mote.phase) * 0.45 * motionScale;
      mote.mesh.position.z = mote.base.z + Math.cos(this.time * 0.48 + mote.phase) * 0.28 * motionScale;
      mote.mesh.position.y = mote.base.y + Math.sin(this.time * 0.92 + mote.phase) * 0.18 * motionScale;
      mote.mesh.scaling.setAll(calm ? 0.78 : 0.8 + Math.sin(this.time * 1.8 + index) * 0.24);
    });
    this.banners.forEach((banner, index) => { banner.rotation.y = Math.sin(this.time * (0.9 + index * 0.12)) * (calm ? 0.04 : 0.23); banner.rotation.z = Math.sin(this.time * 1.7 + index) * (calm ? 0.015 : 0.08); });
  }

  advanceSeason() {
    this.seasonIndex = (this.seasonIndex + 1) % seasons.length;
    const season = seasons[this.seasonIndex];
    this.moteMaterial.diffuseColor = Color3.FromHexString(season.mote);
    this.moteMaterial.emissiveColor = Color3.FromHexString(season.mote).scale(0.55);
    this.bannerMaterial.diffuseColor = Color3.FromHexString(season.banner);
    return season.name;
  }

  advanceTime() {
    this.timeIndex = (this.timeIndex + 1) % times.length;
    const phase = times[this.timeIndex];
    this.moteMaterial.emissiveColor = this.moteMaterial.diffuseColor.scale(phase.energy);
    this.bannerMaterial.emissiveColor = this.bannerMaterial.diffuseColor.scale(phase.energy * 0.18);
    return phase.name;
  }

  dispose() { this.motes.forEach((mote) => mote.mesh.dispose()); this.banners.forEach((banner) => banner.dispose()); }
}
