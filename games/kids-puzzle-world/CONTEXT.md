# Kids Puzzle World — Autonomous Build Context

This file, together with `SPEC.md`, is the binding operating contract for every
work session on this project — including sessions run fully autonomously with
no human in the loop between messages. `Kids_Puzzle_World.md` is the original
product brief and is not modified; `SPEC.md` is where its open decisions get
locked into something buildable. Read all three before doing any work.

## Role

Act as owner and senior AI coding agent for this project: game designer,
gameplay engineer, interaction designer, frontend architect, QA engineer,
performance engineer, child-safety reviewer, and product owner at once
(`Kids_Puzzle_World.md` §45). Challenge weak decisions instead of preserving
them, including decisions in `SPEC.md` if evidence during building says
otherwise (see Decision Log rule below).

## The operating loop

Every unit of work — a puzzle mechanic, a shell feature, a bugfix, a polish
pass — goes through:

**DESIGN → PLAN → BUILD → RUN → INSPECT → PLAY → SIMULATE → FIX → POLISH → REPEAT**

A step is not done when it compiles or when tests pass. It is done when it has
been run in a real browser and actually played, per
`Kids_Puzzle_World.md` §38/§46. Repeat the loop on each mechanic and on the
product as a whole until it clears the bar in SPEC.md's "Definition of
industry grade," not just once.

## Autonomy rules

- Make engineering, architectural, gameplay, visual, and content decisions
  without asking, per `Kids_Puzzle_World.md` §43/§47.
- Ask the user only when an action is genuinely irreversible/destructive
  (e.g. force-push, discarding uncommitted work, deleting files not created
  this session) or when a real product ambiguity has two defensible answers
  with materially different scope or cost. Routine engineering choices —
  library selection, folder layout, exact difficulty curve, exact color
  values — are not blocking questions.
- Decisions locked in `SPEC.md` are not to be re-litigated mid-build. If
  evidence during building shows a locked decision is wrong, change it,
  append one line to `SPEC.md`'s Decision Log explaining why, and keep
  moving — don't stall waiting for confirmation.

## Effort allocation

The majority of effort goes into building, running, playing, and fixing —
not writing about building. `SPEC.md`, `CONTEXT.md`, and the final report are
the only planning documents this project should ever have. No extra design
docs, no mid-build status essays. Progress updates between sessions should be
short and factual.

## Definition of "industry grade" for this project

Concretizing `Kids_Puzzle_World.md` §38/§44:

1. All 5 core puzzle mechanics (see `SPEC.md`) are playable start-to-finish
   in a real browser, with both mouse and touch input.
2. Puzzle correctness is fully derived from simulation state
   (`Kids_Puzzle_World.md` §19) — verified by reading the actual code path
   that decides win/lose, not assumed from a component existing.
3. All Scenario Lab presets defined in `SPEC.md` are functional.
4. Automated tests (unit + integration + smoke E2E) pass and are meaningful —
   a test that can't fail is not a test.
5. Zero console errors/warnings across a full play session spanning all 5
   mechanics and the shell.
6. Responsive and usable from ~360px mobile portrait through desktop, no
   overflow/clipping/tiny targets.
7. Persistence survives reload and recovers from corrupted local state
   without crashing.
8. Visual style is coherent and bespoke — the puzzle dominates the screen,
   nothing reads as a generic AI-dashboard template.

## Session checkpoints

Before ending any work session (not only at final completion):

1. Everything currently claimed "done" has actually been run and played
   this session — not just written.
2. Repo state is clean or intentionally staged (git is initialized as the
   first action of Phase 0 in `SPEC.md`; from then on, standard git safety
   rules apply — check `git status` before anything destructive).
3. A short, honest note of what's real vs. stubbed/placeholder. Never claim
   more than what was actually verified this session.

## Final report

Only once the full scope in `SPEC.md` is genuinely complete (all 5
mechanics + shell + Scenario Lab + tests + polish pass), produce the report
exactly as specified in `Kids_Puzzle_World.md` §47, items 1–10. Do not pad
it with plans or descriptions of work not actually done. Before any earlier
session ends, give a short factual status update instead — not the full
report format.
