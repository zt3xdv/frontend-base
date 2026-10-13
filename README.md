# create-frontend-base

[![Build and deploy](https://github.com/zt3xdv/frontend-base/actions/workflows/build.yml/badge.svg)](https://github.com/zt3xdv/frontend-base/actions/workflows/build.yml)
[![License](https://img.shields.io/github/license/zt3xdv/frontend-base)](LICENSE)
[![Preact](https://img.shields.io/badge/UI-Preact-673ab8?logo=preact)](https://preactjs.com/)
[![Rollup](https://img.shields.io/badge/bundler-Rollup-ec4a3f?logo=rollup.js&logoColor=white)](https://rollupjs.org/)

Scaffolds a lightweight and fast frontend base built with Preact, TypeScript, and Rollup. [demo](https://zt3xdv.github.io/frontend-base/)

## Usage

```bash
npm create frontend-base@latest
```

The CLI asks for the project name and app title, then for a description, author (defaults to your `git config`), whether to initialize a git repository, and whether to install dependencies. It rewrites `package.json` (name, description, author) and `rollup.config.ts` (HTML title) in the generated project.

Once scaffolded:

```bash
cd my-app
npm install
npm run dev
```

## Template

- Preact
- TypeScript
- Rollup
- SWC

## License

MIT
