# SentimentIQ Landing Page (Angular)

This is a premium, high-performance landing page for SentimentIQ, built with Angular 17. It serves as a marketing entry point for the AI Dashboard.

## Quick Start (Development)

1.  Navigate to the `landing/` directory.
2.  Run `cmd /c "npm start"` (or `cmd /c npx ng serve`).
3.  Open `http://localhost:4200` in your browser.

## Build for Production

1.  Run `cmd /c "npm run build"` (or `cmd /c npx ng build`).
2.  The output will be in `dist/landing/browser`.

## Architecture & Features

- **Angular 17 Standalone**: No modules, fast and clean.
- **Lite Bubbles Engine**: A custom Canvas-based physics engine (found in `BubblesPreviewComponent`) for organic background animations.
- **Premium White UI**: Design tokens synchronized with the main Dashboard.
- **SEO Optimized**: Meta tags and semantic HTML included.
- **Discreet Integration**: "Open dashboard" links in header and footer connect to the local Vanilla JS dashboard.

## Integration with Node.js Server

The main server (`server.js`) can be configured to serve this build at the root path (`/`) while keeping the Dashboard at `/app`.

1. Dist CP: `server.js` should serve static files from `landing/dist/landing/browser` for `/`.
2. Dashboard CP: `server.js` should serve static files from `public/` for `/app`.
