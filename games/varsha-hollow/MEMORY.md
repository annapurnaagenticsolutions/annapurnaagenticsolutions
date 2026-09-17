# Varsha Hollow: The Slime Shepherd — Memory

The existing WebDev project is a React 19 + Tailwind 4 + Express + tRPC + Drizzle fullstack scaffold with Manus OAuth already wired. It is hosted as a managed single-server project and should use the existing project conventions rather than introducing a second app shell.

The user wants an immersive narrative game, so the first release intentionally uses a polished story-reader interface rather than a combat-heavy 3D loop. Generated art is available through project-lifecycle `/manus-storage/...` URLs and should be referenced directly, never copied into the project tree.

The exact strings supplied by the user are contract-level content and must remain unchanged: arc names, companion names, slime names, prosperity stage names, stat labels, and the **Begin Journey** CTA.

Authentication is optional for the first playable pass. The game should make local progress immediately available, then sync to the protected database when the user is signed in. This avoids blocking the narrative on an account gate.

## Visual verification checkpoint

The landing page renders successfully after the auth state settles. Desktop preview shows the generated rain-shrine backdrop, readable dark teal/ivory typography, exact **Begin Journey** CTA, season metadata, and the field-note lore card. The first capture caught the intentional loading screen before auth resolved; the subsequent capture confirmed the full landing state. No browser console errors were present in the inspected log.

## Gameplay visual verification checkpoint

The deterministic `?demo=1` route renders chapter 06 / 25 with the exact arc label **Forty Roofs**, choice cards, visible stat rows, **Recovery** prosperity stage, and companion portraits. The mobile capture confirms the story column becomes the primary screen, with the journey-state pill available at the bottom to open the state rail. The chapter reader remains legible at 390px wide and the choice cards stay comfortably tappable.

## Save UX verification checkpoint

The explicit journal panel now renders with local and cloud save status, **Save now**, **Load local journal**, and **Load cloud journal** controls. Desktop and mobile captures show the panel remains readable, touch-friendly, and visually consistent with the rainy teal aesthetic. The project also preloads the hero asset and lazy-loads companion/slime images for a lighter first paint.

## Ambient audio verification checkpoint

The game now includes a browser-native rain ambience that only starts after the player presses the sound control, avoiding autoplay restrictions. The header exposes **Sound off** / **Rain on** state with a mute toggle, and the audio graph is stopped on unmount. The first visual pass showed a desktop header overlap; the grid was corrected and the follow-up screenshot shows the sound control, chapter progress, and save status aligned cleanly.
