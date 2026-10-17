# Agora

[![Deploy](https://github.com/DavideCarvalho/agora/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/DavideCarvalho/agora/actions/workflows/deploy.yml) [![Docs](https://img.shields.io/badge/docs-davidecarvalho.github.io%2Fagora-6d5dfc)](https://davidecarvalho.github.io/agora/)

> A family of production-grade libraries for **AdonisJS**. Each ships on its own, but they
> compose: they share context, emit to one diagnostics bus and surface in one observability
> console. This repository is the documentation site that brings them together.

**Docs: https://davidecarvalho.github.io/agora/**

## The libraries

| Library | Package | Version | Source |
| --- | --- | --- | --- |
| [Context](https://davidecarvalho.github.io/agora/docs/context) | [`@adonis-agora/context`](https://www.npmjs.com/package/@adonis-agora/context) | [![npm](https://img.shields.io/npm/v/@adonis-agora/context)](https://www.npmjs.com/package/@adonis-agora/context) | [repo](https://github.com/DavideCarvalho/adonis-agora-context) |
| [Diagnostics](https://davidecarvalho.github.io/agora/docs/diagnostics) | [`@adonis-agora/diagnostics`](https://www.npmjs.com/package/@adonis-agora/diagnostics) | [![npm](https://img.shields.io/npm/v/@adonis-agora/diagnostics)](https://www.npmjs.com/package/@adonis-agora/diagnostics) | [repo](https://github.com/DavideCarvalho/adonis-agora-diagnostics) |
| [Resilience](https://davidecarvalho.github.io/agora/docs/resilience) | [`@adonis-agora/resilience`](https://www.npmjs.com/package/@adonis-agora/resilience) | [![npm](https://img.shields.io/npm/v/@adonis-agora/resilience)](https://www.npmjs.com/package/@adonis-agora/resilience) | [repo](https://github.com/DavideCarvalho/adonis-agora-resilience) |
| [Durable](https://davidecarvalho.github.io/agora/docs/durable) | [`@adonis-agora/durable`](https://www.npmjs.com/package/@adonis-agora/durable) | [![npm](https://img.shields.io/npm/v/@adonis-agora/durable)](https://www.npmjs.com/package/@adonis-agora/durable) | [repo](https://github.com/DavideCarvalho/adonis-agora-durable) |
| [Telescope](https://davidecarvalho.github.io/agora/docs/telescope) | [`@adonis-agora/telescope`](https://www.npmjs.com/package/@adonis-agora/telescope) | [![npm](https://img.shields.io/npm/v/@adonis-agora/telescope)](https://www.npmjs.com/package/@adonis-agora/telescope) | [repo](https://github.com/DavideCarvalho/adonis-agora-telescope) |
| [Authz](https://davidecarvalho.github.io/agora/docs/authz) | [`@adonis-agora/authz`](https://www.npmjs.com/package/@adonis-agora/authz) | [![npm](https://img.shields.io/npm/v/@adonis-agora/authz)](https://www.npmjs.com/package/@adonis-agora/authz) | [repo](https://github.com/DavideCarvalho/adonis-agora-authz) |
| [Collaboration](https://davidecarvalho.github.io/agora/docs/collaboration) | [`@adonis-agora/collaboration`](https://www.npmjs.com/package/@adonis-agora/collaboration) | [![npm](https://img.shields.io/npm/v/@adonis-agora/collaboration)](https://www.npmjs.com/package/@adonis-agora/collaboration) | [repo](https://github.com/DavideCarvalho/adonis-agora-collaboration) |
| [Media](https://davidecarvalho.github.io/agora/docs/media) | [`@adonis-agora/media`](https://www.npmjs.com/package/@adonis-agora/media) | [![npm](https://img.shields.io/npm/v/@adonis-agora/media)](https://www.npmjs.com/package/@adonis-agora/media) | [repo](https://github.com/DavideCarvalho/adonis-agora-media) |
| [Filter](https://davidecarvalho.github.io/agora/docs/filter) | [`@adonis-agora/filter`](https://www.npmjs.com/package/@adonis-agora/filter) | [![npm](https://img.shields.io/npm/v/@adonis-agora/filter)](https://www.npmjs.com/package/@adonis-agora/filter) | [repo](https://github.com/DavideCarvalho/adonis-agora-filter) |
| [Payments](https://davidecarvalho.github.io/agora/docs/payments) | [`@adonis-agora/payments`](https://www.npmjs.com/package/@adonis-agora/payments) | [![npm](https://img.shields.io/npm/v/@adonis-agora/payments)](https://www.npmjs.com/package/@adonis-agora/payments) | [repo](https://github.com/DavideCarvalho/adonis-agora-payments) |
| [Agent](https://davidecarvalho.github.io/agora/docs/agent) | [`@adonis-agora/agent`](https://www.npmjs.com/package/@adonis-agora/agent) | [![npm](https://img.shields.io/npm/v/@adonis-agora/agent)](https://www.npmjs.com/package/@adonis-agora/agent) | [repo](https://github.com/DavideCarvalho/adonis-agora-agent) |
| [AuthKit](https://davidecarvalho.github.io/agora/docs/authkit) | [`@adonis-agora/authkit-server`](https://www.npmjs.com/package/@adonis-agora/authkit-server) | [![npm](https://img.shields.io/npm/v/@adonis-agora/authkit-server)](https://www.npmjs.com/package/@adonis-agora/authkit-server) | [repo](https://github.com/DavideCarvalho/adonis-agora-authkit) |
| [Sail](https://davidecarvalho.github.io/agora/docs/sail) | [`@adonis-agora/sail`](https://www.npmjs.com/package/@adonis-agora/sail) | [![npm](https://img.shields.io/npm/v/@adonis-agora/sail)](https://www.npmjs.com/package/@adonis-agora/sail) | [repo](https://github.com/DavideCarvalho/adonis-agora-sail) |

Running Agora in production? [Tell us about it](https://github.com/DavideCarvalho/agora/issues/61).

## The site

Built with Next.js and Fumadocs, exported statically to GitHub Pages. Each library keeps its docs
in its own repository (`docs/`); `scripts/sync-docs.mjs` pulls them into `content/docs/<slug>/`
before every build, and the site redeploys on a schedule and on a `lib-docs-updated` dispatch from
a library repo.

```sh
pnpm install
pnpm dev            # syncs the docs from your local library checkouts, then starts Next.js
pnpm build          # syncs from GitHub, checks links, exports to out/
```
