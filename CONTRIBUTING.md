# Contributing to PageFire

Thanks for your interest! Contributions are welcome.

## Ways to contribute

- **Bug reports** — open an [issue](https://github.com/bradyliuY/page-fire/issues) with steps to reproduce
- **Feature requests** — open an issue describing the use case
- **Code** — fork → branch → PR (see below)
- **Docs** — fixes, clarifications, translations

## Development setup

```bash
git clone https://github.com/bradyliuY/page-fire.git
cd page-fire
pnpm install
cp .env.example .env      # fill in your local values
pnpm dev                  # tsx watch — server reloads on save
```

Run tests:

```bash
pnpm test                 # all tests (vitest)
pnpm test:unit
pnpm test:integration
```

For the `pagefire-mcp` CLI package:

```bash
cd packages/mcp-client
pnpm install
pnpm test
```

## Pull request guidelines

1. One logical change per PR — keep diffs small and reviewable.
2. Run `pnpm test` and `pnpm build` locally before pushing; CI must pass.
3. Follow the existing code style (TypeScript strict, no extra comments).
4. Add or update tests for any new behaviour.
5. Update relevant docs if your change affects user-facing behaviour.

## Architecture constraints

Before submitting a PR that touches the server, read the constraints in [CLAUDE.md](CLAUDE.md) and [docs/design.md](docs/design.md). Key rules:

- The server never executes user-uploaded code (pure static hosting).
- Token secrets (`pf_xxx`) must never appear in URLs or logs; only hashes are stored in the DB.
- Upload paths must use the atomic write pattern (tmp → validate → rename).

## Questions?

Open an issue or start a Discussion — happy to help.
