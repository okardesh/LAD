# Copilot Instructions for LAD Codebase

## Overview
This repository contains a multi-component system for LAD, with a focus on backend services (Java) and a Node.js/Express-based UI (smartaggregator-ui). The architecture is split between Java backend logic and a web UI, each with its own conventions and workflows.

## Key Components
- **Java Backend**: Top-level `.java` files and the `smartaggregator/` directory contain backend logic, configuration, and deployment scripts.
- **Node.js UI**: `smartaggregator-ui/app/` contains the Express app, controllers, views (Pug templates), and static assets. The UI communicates with backend services via REST APIs defined in `rest/api.js`.

## Developer Workflows
- **Backend (Java)**: Build and deployment scripts are in `smartaggregator/deploy.sh`. Configuration is managed via `smartaggregator/config/*.properties`.
- **Frontend (Node.js/Express)**:
  - Start the app with `node app.js` or use `gulp` for development tasks (see `gulpfile.js`).
  - JWT generation scripts: `gen_jwt.js` and `gen_jwt_v2.js`.
  - Deploy with `smartaggregator-ui/deploy.sh`.

## Project-Specific Patterns
- **Controllers**: All API endpoints are defined in `controllers/` (one file per domain area). Follow the existing file structure for new endpoints.
- **Views**: Use Pug templates in `views/` for UI rendering. Organize by feature (e.g., `views/pages/`, `views/account/`).
- **Localization**: Add translations in `locales/en.json` and `locales/tr.json`.
- **Configuration**: Use `config/` for environment-specific settings (e.g., `passport.js`, `s3config.js`).

## Integration & Communication
- **REST API**: UI communicates with backend via REST endpoints in `rest/api.js`.
- **Authentication**: JWT-based, with helper scripts for token generation.
- **Deployment**: Use provided `deploy.sh` scripts for both backend and frontend.

## Conventions
- **Do not modify files in `node_modules/` or `public/assets/extra-libs/`**.
- **Follow the existing directory structure for new features**.
- **Use environment-specific config files for secrets and credentials**.

## References
- Example controller: `controllers/announcements.js`
- Example view: `views/pages/announcements.pug`
- Example config: `config/passport.js`

---
For questions about architecture or workflow, review the relevant scripts and configs in each component directory.
