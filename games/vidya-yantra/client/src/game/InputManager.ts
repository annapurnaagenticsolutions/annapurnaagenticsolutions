// Rasa Engine design reminder: movement and study actions are semantic, never scattered raw key checks.
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

// ── Touch input bridge ────────────────────────────────────────────────
// The on-screen TouchControls (React) write into this module-level state,
// and every InputManager instance reads it inside its semantic accessors.
// This keeps touch additive: keyboard/mouse continue to work unchanged,
// and the Babylon worlds do not need to be threaded with new constructors.
type TouchAction = "pulse" | "interact" | "cameraOrbitLeft" | "cameraOrbitRight" | "focus" | "resetCamera";

const touchState = {
  moveX: 0,
  moveY: 0,
  queuedPulse: false,
  queuedInteract: false,
  queuedCameraOrbit: 0,
  queuedFocus: false,
  queuedResetCamera: false,
};

/** Set the normalized movement vector from the virtual joystick (x: strafe, y: forward). */
export function setTouchMoveVector(x: number, y: number) {
  touchState.moveX = Math.max(-1, Math.min(1, x));
  touchState.moveY = Math.max(-1, Math.min(1, y));
}

/** Reset the touch movement vector (e.g. when the joystick is released). */
export function clearTouchMoveVector() {
  touchState.moveX = 0;
  touchState.moveY = 0;
}

/**
 * Drive a semantic action from a touch button. Pressed transitions queue a
 * one-shot (matching keyboard keydown semantics) for pulse/interact/orbit/
 * focus/reset, so they integrate with the existing consume* accessors.
 */
export function setTouchAction(action: TouchAction, pressed: boolean) {
  if (!pressed) return;
  switch (action) {
    case "pulse": touchState.queuedPulse = true; break;
    case "interact": touchState.queuedInteract = true; break;
    case "cameraOrbitLeft": touchState.queuedCameraOrbit = -1; break;
    case "cameraOrbitRight": touchState.queuedCameraOrbit = 1; break;
    case "focus": touchState.queuedFocus = true; break;
    case "resetCamera": touchState.queuedResetCamera = true; break;
  }
}

/** Clear all touch input state (used when the touch controls unmount). */
export function resetTouchInput() {
  touchState.moveX = 0;
  touchState.moveY = 0;
  touchState.queuedPulse = false;
  touchState.queuedInteract = false;
  touchState.queuedCameraOrbit = 0;
  touchState.queuedFocus = false;
  touchState.queuedResetCamera = false;
}

export class InputManager {
  private held = new Set<string>();
  private pulseQueued = false;
  private interactQueued = false;
  private cameraOrbitQueued = 0;
  private focusQueued = false;
  private resetCameraQueued = false;

  private onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }
    this.held.add(key);
    if (key === "q" && !event.repeat) this.pulseQueued = true;
    if (key === "e" && !event.repeat) this.interactQueued = true;
    if (key === "z" && !event.repeat) this.cameraOrbitQueued = -1;
    if (key === "x" && !event.repeat) this.cameraOrbitQueued = 1;
    if (key === "c" && !event.repeat) this.focusQueued = true;
    if (key === "r" && !event.repeat) this.resetCameraQueued = true;
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.held.delete(event.key.toLowerCase());
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
  }

  movement() {
    const x = Number(this.held.has("d") || this.held.has("arrowright")) - Number(this.held.has("a") || this.held.has("arrowleft"));
    const z = Number(this.held.has("s") || this.held.has("arrowdown")) - Number(this.held.has("w") || this.held.has("arrowup"));
    // Merge keyboard direction with the touch joystick vector. Touch y is
    // forward (up on the joystick => +y), which maps to -z in-world, matching
    // the W/ArrowUp convention above.
    const combinedX = x + touchState.moveX;
    const combinedZ = z - touchState.moveY;
    const direction = new Vector3(combinedX, 0, combinedZ);
    return direction.lengthSquared() > 0 ? direction.normalize() : direction;
  }

  consumePulse() {
    const result = this.pulseQueued || touchState.queuedPulse;
    this.pulseQueued = false;
    touchState.queuedPulse = false;
    return result;
  }

  consumeInteract() {
    const result = this.interactQueued || touchState.queuedInteract;
    this.interactQueued = false;
    touchState.queuedInteract = false;
    return result;
  }

  consumeCameraOrbit() {
    const result = this.cameraOrbitQueued || touchState.queuedCameraOrbit;
    this.cameraOrbitQueued = 0;
    touchState.queuedCameraOrbit = 0;
    return result;
  }

  consumeFocus() {
    const result = this.focusQueued || touchState.queuedFocus;
    this.focusQueued = false;
    touchState.queuedFocus = false;
    return result;
  }

  consumeCameraReset() {
    const result = this.resetCameraQueued || touchState.queuedResetCamera;
    this.resetCameraQueued = false;
    touchState.queuedResetCamera = false;
    return result;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.held.clear();
  }
}
