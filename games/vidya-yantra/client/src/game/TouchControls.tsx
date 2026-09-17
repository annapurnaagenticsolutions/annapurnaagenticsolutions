// TouchControls — an additive on-screen control layer for coarse-pointer
// (touch) devices. Renders a left-side virtual joystick for movement and
// right-side Pulse / Interact / Stance buttons. The joystick writes a
// normalized 2D vector into the InputManager touch bridge; the action buttons
// queue one-shot semantic actions. Keyboard/mouse input remains fully
// functional alongside these controls.
import { useCallback, useEffect, useRef, useState } from "react";
import { clearTouchMoveVector, resetTouchInput, setTouchAction, setTouchMoveVector } from "./InputManager";

type JoystickState = { active: boolean; knobX: number; knobY: number };

const JOY_RADIUS = 52; // px — max travel of the knob from the base center

export function TouchControls({ choiceOpen, onStance }: { choiceOpen: boolean; onStance: () => void }) {
  const joyRef = useRef<HTMLDivElement>(null);
  const joyPointerId = useRef<number | null>(null);
  const joyCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joy, setJoy] = useState<JoystickState>({ active: false, knobX: 0, knobY: 0 });

  // Clamp the knob within the joystick radius and emit a normalized vector.
  const updateJoystick = useCallback((clientX: number, clientY: number) => {
    let dx = clientX - joyCenter.current.x;
    let dy = clientY - joyCenter.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOY_RADIUS) {
      dx = (dx / dist) * JOY_RADIUS;
      dy = (dy / dist) * JOY_RADIUS;
    }
    setJoy({ active: true, knobX: dx, knobY: dy });
    // Normalize to -1..1. Invert y so up on screen => forward (+y).
    setTouchMoveVector(dx / JOY_RADIUS, -dy / JOY_RADIUS);
  }, []);

  const onJoyPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== null) return;
    joyPointerId.current = event.pointerId;
    const rect = event.currentTarget.getBoundingClientRect();
    joyCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(event.clientX, event.clientY);
  }, [updateJoystick]);

  const onJoyPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== event.pointerId) return;
    updateJoystick(event.clientX, event.clientY);
  }, [updateJoystick]);

  const endJoystick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== event.pointerId) return;
    joyPointerId.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    setJoy({ active: false, knobX: 0, knobY: 0 });
    clearTouchMoveVector();
  }, []);

  // Action buttons: queue a one-shot on pointer down. We use pointer events so
  // the press registers immediately and does not wait for a synthetic click.
  const pressAction = useCallback((action: "pulse" | "interact" | "cameraOrbitLeft" | "cameraOrbitRight" | "focus" | "resetCamera") => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setTouchAction(action, true);
  }, []);

  // Clear touch state on unmount so a removed control layer never leaves a
  // stuck movement vector or queued action.
  useEffect(() => () => resetTouchInput(), []);

  return (
    <div className="touch-controls" aria-hidden="false">
      {/* Virtual movement joystick (left side) */}
      <div
        ref={joyRef}
        className={`touch-joystick ${joy.active ? "is-active" : ""}`}
        onPointerDown={onJoyPointerDown}
        onPointerMove={onJoyPointerMove}
        onPointerUp={endJoystick}
        onPointerCancel={endJoystick}
        role="group"
        aria-label="Movement joystick"
      >
        <span className="touch-joystick-base" aria-hidden="true" />
        <span
          className="touch-joystick-knob"
          aria-hidden="true"
          style={{ transform: `translate(${joy.knobX}px, ${joy.knobY}px)` }}
        />
      </div>

      {/* Action buttons (right side) */}
      <div className="touch-actions">
        <button
          type="button"
          className="touch-action touch-action--pulse"
          aria-label="Focus pulse"
          onPointerDown={pressAction("pulse")}
        >
          <span aria-hidden="true">◌</span>
          <small>Pulse</small>
        </button>
        <button
          type="button"
          className="touch-action touch-action--interact"
          aria-label="Speak or activate"
          onPointerDown={pressAction("interact")}
        >
          <span aria-hidden="true">↗</span>
          <small>Interact</small>
        </button>
        {choiceOpen && (
          <button
            type="button"
            className="touch-action touch-action--stance"
            aria-label="Open stance choice"
            onPointerDown={(event) => { event.preventDefault(); onStance(); }}
          >
            <span aria-hidden="true">✦</span>
            <small>Stance</small>
          </button>
        )}
      </div>

      {/* Secondary camera controls (bottom-right, smaller) */}
      <div className="touch-camera">
        <button type="button" aria-label="Orbit camera left" onPointerDown={pressAction("cameraOrbitLeft")}>⟲</button>
        <button type="button" aria-label="Orbit camera right" onPointerDown={pressAction("cameraOrbitRight")}>⟳</button>
        <button type="button" aria-label="Focus landmark" onPointerDown={pressAction("focus")}>◎</button>
        <button type="button" aria-label="Reset view" onPointerDown={pressAction("resetCamera")}>⌂</button>
      </div>
    </div>
  );
}
