// ONEIRIC — Input
// Keyboard + mouse input manager.
// Tracks currently-held keys and "just pressed" keys for single-press
// detection. `update()` must be called at the end of each frame to clear
// the just-pressed set so a press only registers for one frame.

export class Input {
  private keys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private mouse = { x: 0, y: 0, down: false };

  private canvas: HTMLCanvasElement;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onMouseDown: (e: MouseEvent) => void;
  private onMouseUp: (e: MouseEvent) => void;
  private onBlur: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.onKeyDown = (e: KeyboardEvent) => {
      const key = this.normalize(e.key);
      // Prevent page scroll on space / arrows during gameplay.
      if (
        key === ' ' ||
        key === 'arrowup' ||
        key === 'arrowdown' ||
        key === 'arrowleft' ||
        key === 'arrowright'
      ) {
        e.preventDefault();
      }
      if (!this.keys.has(key)) {
        this.justPressed.add(key);
      }
      this.keys.add(key);
    };

    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(this.normalize(e.key));
    };

    this.onMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    };

    this.onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.mouse.down = true;
    };

    this.onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this.mouse.down = false;
    };

    // Release everything when the window loses focus to avoid stuck keys.
    this.onBlur = () => {
      this.keys.clear();
      this.mouse.down = false;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Lowercase key name; treat space consistently as ' '; strip 'key' prefix if present. */
  private normalize(key: string): string {
    if (key === 'Spacebar' || key === 'Space') return ' ';
    let lower = key.toLowerCase();
    if (lower.startsWith('key') && lower.length === 4) {
      lower = lower.slice(3);
    }
    return lower;
  }

  /** True while the key is held down. */
  isDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  /** True only on the frame the key transitioned from up to down. */
  wasPressed(key: string): boolean {
    return this.justPressed.has(key.toLowerCase());
  }

  /** Current mouse state in canvas-local coordinates. */
  getMouse(): { x: number; y: number; down: boolean } {
    return { x: this.mouse.x, y: this.mouse.y, down: this.mouse.down };
  }

  /** Call at the end of each frame to clear single-press state. */
  update(): void {
    this.justPressed.clear();
  }

  /** Snapshot of input state for passing to entity update functions. */
  getState(): { keys: Set<string>; justPressed: Set<string>; mouse: { x: number; y: number; down: boolean } } {
    return {
      keys: this.keys,
      justPressed: this.justPressed,
      mouse: { x: this.mouse.x, y: this.mouse.y, down: this.mouse.down },
    };
  }

  /** Remove all listeners — call when tearing down the input manager. */
  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
