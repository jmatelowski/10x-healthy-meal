# HealthyMeal

[![Node Version](https://img.shields.io/badge/node-22.14.0-blue.svg)](https://nodejs.org)

A web application that helps users adapt existing recipes to their individual dietary needs. HealthyMeal combines straightforward recipe management with AI-powered modification according to declared dietary preferences. User accounts link data to individuals and store their choices.

---

## Table of Contents

1. [Project Name](#healthymeal)
2. [Project Description](#project-description)
3. [Tech Stack](#tech-stack)
4. [Getting Started Locally](#getting-started-locally)
5. [Available Scripts](#available-scripts)
6. [Testing](#testing)
7. [Project Scope](#project-scope)
8. [Project Status](#project-status)
9. [License](#license)

---

## Project Description

HealthyMeal addresses the common challenge of adjusting publicly available recipes to fit dietary restrictions such as vegetarianism, veganism, gluten-free diets, diabetes, nut allergies or low-FODMAP requirements. Instead of manually searching for substitutions, users can store recipes in the app and let an AI model instantly propose ingredient and step changes that match their saved dietary preferences.

---

## Tech Stack

- **Astro 5** – static-first site generator.
- **React 19** – interactive components within Astro islands.
- **TypeScript 5** – type safety.
- **Tailwind CSS 4** – utility-first styling.
- **shadcn/ui** – accessible React component library (via Radix UI & class-variance-authority).
- **Supabase** – PostgreSQL database + Auth (BaaS) _(planned backend)_.
- **OpenRouter.ai** – gateway to free LLM models for recipe adaptation.
- **Vitest** – fast unit test framework for JavaScript/TypeScript.
- **React Testing Library** – testing utilities for React components.
- **Playwright** – end-to-end testing framework for web applications.

> See `.ai/tech-stack.md` for a detailed rationale.

Runtime & tooling versions:

```text
Node  : 22.14.0
Astro : ^5.13.7
React : ^19.1.1
```

---

## Getting Started Locally

1. **Clone the repo**
   ```bash
   git clone https://github.com/your-org/10x-healthy-meal.git
   cd 10x-healthy-meal
   ```
2. **Install Node 22** (or use the version in `.nvmrc`). For `nvm` run:
   ```bash
   nvm use
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Start the dev server**
   ```bash
   npm run dev
   ```
5. Visit `http://localhost:4321` (default Astro port).

### Building for production

```bash
npm run build   # output to ./dist
npm run preview # serve production build locally
```

---

## Available Scripts

From `package.json`:
| Script | Purpose |
|--------|---------|
| `dev` | Start Astro in dev mode with hot-reload |
| `build` | Generate a static production build |
| `preview` | Preview the production build locally |
| `astro` | Run arbitrary Astro CLI commands |
| `lint` | Lint all files with ESLint |
| `lint:fix` | Auto-fix lint errors |
| `format` | Format files with Prettier |
| `test` | Run unit and integration tests with Vitest |
| `test:e2e` | Run end-to-end tests with Playwright |
| `test:coverage` | Generate test coverage report |

---

## Testing

The project uses a comprehensive testing strategy with multiple layers:

### Unit & Integration Tests

- **Vitest** – Fast and modern test runner for JavaScript/TypeScript
- **React Testing Library** – Testing utilities focused on user interactions
- Tests cover utility functions, validation schemas, and React components

### End-to-End Tests

- **Playwright** – Cross-browser automation for complete user flows
- Tests simulate real user scenarios from recipe creation to AI integration

### Additional Testing Tools

- **Axe** – Automated accessibility testing
- **GitHub Actions** – Continuous integration and automated test execution

Run tests locally:

```bash
npm run test          # Unit/integration tests
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report
```

---

## Project Scope

HealthyMeal MVP delivers the following core capabilities (see PRD §3 “Wymagania funkcjonalne”):

Key features:

- **User accounts** – registration, login and permanent deletion of profile & recipes.
- **Dietary profile** – multi-select of predefined preferences (6 options). Changes take effect immediately.
- **Recipe management** – add, edit, view and hard-delete up to 10 000-character recipes with title ≤ 50 characters.
- **AI integration** – send a recipe to a AI model, receive an adapted version, accept to save or reject to discard.
- **Analytics** – `recipe_saved` event timestamped only on first creation.

The MVP purposefully leaves out advanced features such as multimedia, URL import, social sharing, encryption at rest and WCAG compliance.

---

## Project Status

🚧 **In Development** – Core MVP functionalities are being implemented.

---

## License

This project is licensed under the **MIT License**. See the [`LICENSE`](LICENSE) file for details.
