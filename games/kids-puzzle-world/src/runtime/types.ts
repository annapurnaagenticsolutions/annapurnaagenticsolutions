export type PuzzleStatus = 'idle' | 'playing' | 'paused' | 'won' | 'failed-safe'
export type HintTier = 1 | 2 | 3 | 4 | 5

export interface DifficultyConfig {
  level: number
  params: Record<string, number>
}

export interface PuzzleMetadata {
  id: string
  mechanicId: 'pattern' | 'path' | 'balance' | 'gear' | 'assembly'
  title: string
  regionId: string
  difficulty: DifficultyConfig
  seed?: number
}

export interface SerializedPuzzleState {
  schemaVersion: number
  mechanicId: string
  seed?: number
  payload: unknown
}

export interface PuzzleDefinition<S, A, H = unknown> {
  metadata: PuzzleMetadata
  createInitialState(seed?: number): S
  reducer(state: S, action: A): S
  isValidAction(state: S, action: A): boolean
  checkWin(state: S): boolean
  checkFailSafe?(state: S): boolean
  getHintState(state: S, tier: HintTier): H
  serialize(state: S): SerializedPuzzleState
  deserialize(data: SerializedPuzzleState): S
  reset(state: S): S
}

export interface PuzzleSubscriber<S, A> {
  (runtime: PuzzleRuntime<S, A>): void
}

export class PuzzleRuntime<S, A> {
  private state: S
  private subscribers: PuzzleSubscriber<S, A>[] = []
  private _status: PuzzleStatus = 'idle'
  private hintTierUsed: HintTier = 0 as HintTier
  private initialState: S

  constructor(
    private definition: PuzzleDefinition<S, A>,
    seed?: number,
  ) {
    this.initialState = this.definition.createInitialState(seed)
    this.state = this.definition.reset(this.initialState)
  }

  get status(): PuzzleStatus {
    return this._status
  }

  get currentState(): S {
    return this.state
  }

  getHintState(tier: HintTier) {
    return this.definition.getHintState(this.state, tier)
  }

  dispatch(action: A): void {
    if (!this.definition.isValidAction(this.state, action)) {
      return
    }

    this.state = this.definition.reducer(this.state, action)

    if (this._status === 'idle') {
      this._status = 'playing'
    }

    if (this.definition.checkWin(this.state)) {
      this._status = 'won'
    } else if (this.definition.checkFailSafe?.(this.state)) {
      this._status = 'failed-safe'
    }

    this.notifySubscribers()
  }

  reset(): void {
    this.state = this.definition.reset(this.initialState)
    this._status = 'idle'
    this.hintTierUsed = 0 as HintTier
    this.notifySubscribers()
  }

  requestHint(tier: HintTier): void {
    if (tier > this.hintTierUsed) {
      this.hintTierUsed = tier
    }
  }

  serialize(): SerializedPuzzleState {
    return this.definition.serialize(this.state)
  }

  subscribe(subscriber: PuzzleSubscriber<S, A>): () => void {
    this.subscribers.push(subscriber)
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== subscriber)
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((subscriber) => subscriber(this))
  }
}
