// ONEIRIC — Dream stack management
// Manages the stack of nested dream layers (descend/push, kick/pop).

import type { DreamLayer, MemoryObjectKind } from '../types';
import { ProceduralGen } from './ProceduralGen';

export class DreamStack {
  /**
   * Create the initial layer stack: generates layers 1..maxDepth using ProceduralGen.
   * Only the first layer is "active" on entry; deeper layers exist for descent.
   * Optional memoryObjects are passed to generateLayer for environmental storytelling.
   */
  static createInitialStack(maxDepth: number, seed: number, memoryObjects?: MemoryObjectKind[]): DreamLayer[] {
    const gen = new ProceduralGen(seed);
    const stack: DreamLayer[] = [];
    for (let depth = 1; depth <= maxDepth; depth++) {
      stack.push(gen.generateLayer(depth, memoryObjects));
    }
    return stack;
  }

  /** Push a new layer onto the stack (descending deeper). */
  static pushLayer(stack: DreamLayer[], layer: DreamLayer): DreamLayer[] {
    return [...stack, layer];
  }

  /**
   * Pop the top layer off the stack (a successful kick).
   * Returns the new stack and the popped layer (or null if empty).
   */
  static popLayer(
    stack: DreamLayer[]
  ): { stack: DreamLayer[]; popped: DreamLayer | null } {
    if (stack.length === 0) {
      return { stack, popped: null };
    }
    const popped = stack[stack.length - 1];
    return { stack: stack.slice(0, -1), popped };
  }

  /** Get the current (top) layer, or null if the stack is empty. */
  static getCurrentLayer(
    stack: DreamLayer[],
    currentLayer: number
  ): DreamLayer | null {
    // currentLayer is 1-indexed depth; index in stack = currentLayer - 1.
    const idx = currentLayer - 1;
    if (idx < 0 || idx >= stack.length) {
      return stack.length > 0 ? stack[stack.length - 1] : null;
    }
    return stack[idx];
  }

  /** Current stack depth (number of layers). */
  static getDepth(stack: DreamLayer[]): number {
    return stack.length;
  }
}
