# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

middy-appsync provides router, middlewares, and utilities for AWS AppSync Lambda Resolvers, powered by [Middy.js](https://middy.js.org). It targets AppSync GraphQL (in progress) and AppSync Events (planned).

## Commands

All commands run from the repo root via Turborepo:

- **Build:** `npm run build`
- **Test all:** `npm run test`
- **Lint all:** `npm run lint`
- **Dev (watch):** `npm run dev`
- **Test single package:** `cd packages/<name> && npx vitest run`
- **Test single file:** `npx vitest run packages/<name>/src/<file>.test.ts`
- **Dev/watch single package:** `cd packages/<name> && npx vitest watch`

## Architecture

- **Monorepo** using npm workspaces (`packages/*`) with Turborepo for orchestration
- **Packages** are published under the `@middy-appsync/*` scope (e.g., `@middy-appsync/graphql`)
- Each package has its own `package.json`, `tsconfig.json` (extends root), and `vitest.config.ts`
- Peer dependency on `@middy/core >=7`
- **Changesets** for versioning and publishing — run `npm run changeset` to create a changeset before publishing
- **Husky** pre-commit hook runs `npm run lint`

## TypeScript & Build

- ESM-only (`"type": "module"`, `"module": "nodenext"`)
- Strict mode enabled
- Each package compiles with `tsc` from `src/` to `dist/`
- Node >= 22.16.0, npm >= 10.9.0

## Code Style

- Prettier: double quotes, semicolons, 2-space indent, trailing commas (es5), 100 char width, LF line endings
- ESLint: strict + stylistic TypeScript rules via `typescript-eslint`, with Prettier and Turbo configs
- Tests use Vitest with globals enabled (no need to import `describe`, `it`, `expect`)
