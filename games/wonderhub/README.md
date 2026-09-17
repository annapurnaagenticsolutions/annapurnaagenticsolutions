# WonderHub by Annapurna

A mission-led, static discovery hub for Annapurna learning websites.

WonderHub is intentionally designed as an index, not a content-heavy platform. It helps users discover dedicated learning websites for study, play, stories, creativity, activities, life skills, and future skills.

## Version

v1.1 — Mission and sustainability upgrade

## What is included

- `index.html` — single-page homepage
- `assets/styles.css` — visual design and responsive layout
- `assets/script.js` — data loading, search, category filtering, and card rendering
- `data/sites.json` — editable website index

## Main sections

- Hero section with mission-led positioning
- Why WonderHub exists
- Learning philosophy
- Audience framing for children, parents, teachers, schools, and partners
- Live and future platform cards
- Search and category filters
- Free-first sustainability model
- Add-future-site JSON example

## How to add a new website

Edit `data/sites.json` and add a new object:

```json
{
  "title": "Animal & Dinosaur World",
  "category": "Stories",
  "subCategory": "Nature & Imagination",
  "ageRange": "Class 1–5",
  "status": "Coming Soon",
  "url": "#",
  "description": "A child-friendly gateway for animal facts, dinosaur stories, and nature learning.",
  "missionNote": "Build curiosity for nature through stories, observation, and simple facts.",
  "bestFor": ["Children", "Parents"],
  "tags": ["Animals", "Dinosaurs", "Nature"],
  "icon": "🦕",
  "featured": false
}
```

Use `status: "Live"` and a real `url` when the website is ready.

## Deployment on GitHub Pages

1. Upload the folder contents to a GitHub repository.
2. Go to repository Settings → Pages.
3. Select deployment from branch.
4. Choose the root folder.
5. Save and open the published GitHub Pages URL.

## Design principle

Keep WonderHub lightweight. Add only enough content to explain the mission and direct people to the right platform. Full lessons, stories, games, activities, and modules should stay inside their dedicated websites.
