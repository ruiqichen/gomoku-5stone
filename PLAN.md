# Project Review and Optimization Plan

## 1. PWA & Metadata Configuration (High Priority)
**Issue:** The project was restructured into a multi-game portal, but the Service Worker (`sw.js`) and Web Manifest (`manifest.json`) are still hardcoded for the single Gomoku game. This breaks offline capabilities and PWA installation.
**Action Items:**
- [ ] Update `manifest.json`: Change `name` and `short_name` to "经典游戏中心" (Classic Games Hub). Update the description.
- [ ] Update `sw.js`: Modify `ASSETS_TO_CACHE` to include the root `index.html` and all files within `gomoku/`, `snake/`, and `xiangqi/` directories.

## 2. Electron Desktop App Configuration (Medium Priority)
**Issue:** The Electron entry point (`main.js`) tries to load `icon.png`, which does not exist (we only have `icon.svg`). `package.json` still refers to the app as "gomoku-5stone".
**Action Items:**
- [ ] Update `main.js`: Fix the icon path to gracefully handle the `.svg` or use a default if not supported on the OS without conversion.
- [ ] Update `package.json`: Change `name`, `description`, and `productName` to reflect the multi-game portal.

## 3. Snake Game Engine Optimization (Medium Priority)
**Issue:** The Snake game loop relies on `setInterval(drawGame, 120)`. While functional, professional games use `requestAnimationFrame` coupled with a delta-time accumulator for smoother rendering and better battery efficiency.
**Action Items:**
- [ ] Refactor `snake/script.js` to use `requestAnimationFrame`.

## 4. UI/UX Consistency (Low Priority)
**Issue:** The "Back to Portal" buttons in the games lack a perfectly unified style. The Gomoku and Xiangqi modals are nearly identical but duplicated.
**Action Items:**
- [ ] Review modal CSS z-indexing and ensure no overlap bugs.
- [ ] (Optional) Abstract shared logic into a `lib/` or `shared/` directory. *Decision: For this scale, keeping directories self-contained is acceptable and makes them easily extractable, so we will skip heavy abstraction unless requested, focusing on bug fixes.*

## Execution Strategy
I will execute Steps 1, 2, and 3 sequentially to finalize the professional polish of the repository.