# Varsha Hollow: The Slime Shepherd - Development TODO

## Phase 1: Visual Direction and Assets
- [x] Generate visual reference image for dark fantasy-monsoon aesthetic
- [x] Generate hero background image for landing page
- [x] Generate atmospheric UI elements (borders, glows, textures)
- [x] Generate companion character portraits (Meera, Leela, Tara, Kabir, Dev)
- [x] Generate slime illustrations (Dew, Clay, Lantern, Herb, Echo)
- [x] Upload all assets to S3 via manus-upload-file

## Phase 2: Database Schema and Backend
- [x] Design database schema (GameProgress, Chapter, Choice, Stats, Relationships, SlimeCollection)
- [x] Create Drizzle schema in drizzle/schema.ts
- [x] Generate and apply database migrations
- [x] Implement backend procedures in server/routers.ts (save progress, load game, etc.)
- [x] Write vitest tests for backend procedures

## Phase 3: Landing Page and Core UI
- [x] Design and build landing page with title, lore intro, and "Begin Journey" CTA
- [x] Create base layout components (Header, Footer, Navigation)
- [x] Build stats display component (Empathy, Wisdom, Practicality)
- [x] Build village prosperity meter component (Survival → Recovery → Connection → Growth → Identity)
- [x] Build companion relationship tracker component
- [x] Build slime collection panel component
- [x] Implement smooth page transitions and animations

## Phase 4: Narrative Engine
- [x] Design chapter data structure (chapter ID, text, choices, consequences)
- [x] Build narrative engine to handle branching logic
- [x] Create chapter display component with story text and choice buttons
- [x] Implement choice consequence system (stat updates, relationship changes, etc.)
- [x] Build chapter summary screen component
- [x] Test branching logic across multiple paths

## Phase 5: Story Content Integration
- [x] Write all 25 chapters with full narrative text
- [x] Define all choices and their consequences for each chapter
- [x] Map stat impacts for each choice (Empathy, Wisdom, Practicality)
- [x] Map relationship impacts for each choice (Meera, Leela, Tara, Kabir, Dev)
- [x] Map village prosperity progression through story arcs
- [x] Define slime unlocks at appropriate chapters
- [x] Integrate all content into narrative engine

## Phase 6: Stats, Relationships, Village Progression, Slimes
- [x] Implement player stats system with dynamic updates
- [x] Implement companion relationship tracking
- [x] Implement village prosperity meter with visual progression
- [x] Implement slime collection system with unlock logic
- [x] Create detailed slime lore descriptions
- [x] Display all systems in game UI

## Phase 7: Save System, Animations, Polish
- [x] Implement persistent save system (auto-save after each chapter)
- [x] Build save/load UI
- [x] Implement smooth chapter transition animations
- [x] Add atmospheric sound/music (if applicable)
- [x] Polish UI animations and micro-interactions
- [x] Optimize performance and loading times

## Phase 8: Testing and Deployment
- [x] Test all 25 chapters and branching paths
- [x] Test save/load functionality
- [x] Test responsive design on mobile and desktop
- [x] Run full vitest suite
- [x] Create checkpoint before deployment
- [ ] Deploy to production via WebDev Publish
