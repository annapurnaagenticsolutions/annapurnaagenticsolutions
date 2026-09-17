// Cinematic camera design reminder: the frame travels with Ila, leads the route, and briefly honours world landmarks without stealing control.
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Player } from "./Player";
import { InputManager } from "./InputManager";

type CameraBiome = "ashram" | "road" | "rasa" | "monsoon" | "archive" | "estuary" | "saltLibrary" | "mirrorStep" | "confluence" | "returnObservatory";
// When reducedMotion is enabled the camera keeps its orbit/zoom/target
// behaviour but drops the decorative drift bob and emphasis shake so the frame
// stays still while remaining fully controllable.
type ReducedMotionAccessor = () => boolean;
const presets: Record<CameraBiome, { alpha: number; beta: number; radius: number; lead: number; drift: number }> = {
  ashram: { alpha: -Math.PI / 2.34, beta: 1.07, radius: 18.3, lead: 0.8, drift: 0.035 },
  road: { alpha: -Math.PI / 2.08, beta: 1.03, radius: 18.8, lead: 1.15, drift: 0.052 },
  rasa: { alpha: -Math.PI / 2.54, beta: 1.11, radius: 18.1, lead: 0.72, drift: 0.045 },
  monsoon: { alpha: -Math.PI / 2.46, beta: 1.08, radius: 18.7, lead: 0.95, drift: 0.065 },
  archive: { alpha: -Math.PI / 2.16, beta: 1.02, radius: 19.1, lead: 1.18, drift: 0.042 },
  estuary: { alpha: -Math.PI / 2.26, beta: 1.04, radius: 19.3, lead: 1.2, drift: 0.058 },
  saltLibrary: { alpha: -Math.PI / 2.06, beta: 1.01, radius: 19.6, lead: 1.28, drift: 0.046 },
  mirrorStep: { alpha: -Math.PI / 2.22, beta: 1.08, radius: 19.05, lead: 1.02, drift: 0.038 },
  confluence: { alpha: -Math.PI / 2.3, beta: 1.02, radius: 19.35, lead: 1.25, drift: 0.047 },
  returnObservatory: { alpha: -Math.PI / 2.28, beta: 1.01, radius: 19.65, lead: 1.3, drift: 0.044 },
};
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

export class CinematicCamera {
  private time = 0;
  private arrival = 1.25;
  private preset;
  private orbitOffset = 0;
  private closeFocus = false;
  private emphasis = 0;
  private reducedMotion: ReducedMotionAccessor = () => false;

  constructor(private camera: ArcRotateCamera, biome: CameraBiome, reducedMotion?: ReducedMotionAccessor) {
    if (reducedMotion) this.reducedMotion = reducedMotion;
    this.preset = presets[biome];
    camera.alpha = this.preset.alpha + 0.78;
    camera.beta = this.preset.beta + 0.22;
    camera.radius = this.preset.radius + 4.1;
  }

  emphasize() { this.emphasis = Math.max(this.emphasis, 0.42); }

  update(delta: number, player: Player, landmark?: Vector3, input?: InputManager) {
    this.time += delta;
    this.arrival = Math.max(0, this.arrival - delta);
    if (input) {
      const orbit = input.consumeCameraOrbit();
      if (orbit) this.orbitOffset = Math.max(-0.72, Math.min(0.72, this.orbitOffset + orbit * 0.22));
      if (input.consumeFocus()) this.closeFocus = !this.closeFocus;
      if (input.consumeCameraReset()) { this.orbitOffset = 0; this.closeFocus = false; this.arrival = 0.45; }
    }
    this.emphasis = Math.max(0, this.emphasis - delta);
    const calm = this.reducedMotion();
    const moving = player.isMoving();
    const forward = player.getForward();
    const lead = player.root.position.add(forward.scale(moving ? this.preset.lead : this.preset.lead * 0.35));
    lead.y = 0.58;
    const target = landmark ? Vector3.Lerp(lead, landmark.add(new Vector3(0, 0.3, 0)), 0.16) : lead;
    const ease = Math.min(1, delta * (landmark ? 1.85 : 2.55));
    this.camera.target = Vector3.Lerp(this.camera.target, target, ease);
    const arrivalBlend = this.arrival > 0 ? this.arrival / 1.25 : 0;
    // Decorative drift and emphasis shake are suppressed under reduced motion;
    // the camera still settles, orbits, and zooms exactly as before.
    const drift = calm ? 0 : Math.sin(this.time * (moving ? 0.95 : 0.45)) * this.preset.drift;
    const shake = !calm && this.emphasis > 0 ? Math.sin(this.time * 70) * this.emphasis * 0.028 : 0;
    this.camera.alpha = lerp(this.camera.alpha, this.preset.alpha + this.orbitOffset + drift + arrivalBlend * 0.78 + shake, Math.min(1, delta * 1.45));
    this.camera.beta = lerp(this.camera.beta, this.preset.beta + arrivalBlend * 0.22, Math.min(1, delta * 1.3));
    this.camera.radius = lerp(this.camera.radius, this.preset.radius + (moving ? -0.45 : 0) + arrivalBlend * 4.1 - (this.closeFocus ? 3.4 : 0) - (!calm && this.emphasis > 0 ? 0.7 : 0), Math.min(1, delta * (this.emphasis > 0 ? 4.7 : 1.4)));
  }
}
