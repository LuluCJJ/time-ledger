# Project boundaries and release workflow

## One development source

This repository is the source of truth for app code, tests, public documentation and build configuration. Change `web/` and `shells/` here, run the checks here, and build packages from this checkout. Generated Android assets and desktop staging files are build outputs, not independent development sources.

## Three project levels

| Place | Responsibility |
| --- | --- |
| Personal knowledge base | Original research, personal decisions, test evidence, lessons and user records. |
| Product exploration | Portfolio-level ideas and reusable methods across products. |
| This repository | Time Ledger source, tests, public product rationale, build and contribution instructions. |

Link across these levels. Do not copy personal records or private research into this repository. Public descriptions must stand on their own without requiring Wiki access.

## Change and release sequence

1. Make app changes in this checkout. Update tests and public documentation for changed behavior.
2. Run `node --test *.test.mjs` from `web/`; build Android and desktop artifacts from `shells/` when affected.
3. Check the Git diff and full committed history for private records, tokens, local paths, third-party assets and generated files. Review images visually as well as metadata.
4. On the user's existing phone, preserve and verify a complete backup before any upgrade or historical import. Test restore in a separate environment. Record real-phone results privately.
5. Before a public release, choose a license, repository identity, version numbering and release signing. Review third-party notices and prepare a clean release artifact. Publication is a separate explicit step.

Debug APKs built with the existing signing key are trial builds. A source release can precede a downloadable release, but must state the phone-data and migration limits accurately. Never replace an installed app with a package that has an incompatible signing identity without a verified data transfer plan.

## Current release boundary

- Public repository: [`LuluCJJ/time-ledger`](https://github.com/LuluCJJ/time-ledger).
- Original project license: Apache-2.0.
- Source and signed Android preview APK are public; see the [release page](https://github.com/LuluCJJ/time-ledger/releases/tag/v1.0.0-preview.1).
- The formal Android package is separate from the earlier trial package. Migration between them is not automatic or independently verified on Android.

See [current status](STATUS.md) for verification still outstanding.
