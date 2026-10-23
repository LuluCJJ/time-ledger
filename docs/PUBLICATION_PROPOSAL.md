# Proposed first publication

Status: first source-only publication completed on 2026-10-23. This document records the decision and the later Android release path.

## First milestone: public source preview

Suggested repository slug: `time-ledger`. Publish the reviewed source, bilingual README, product/data boundaries, tests and third-party notices. Mark the first release as a **source preview**. Do not attach the current debug APK or the unsigned release artifact. Keep `docs/STATUS.md` explicit about phone backup, restoration and migration still needing verified evidence.

The owner chose Apache-2.0 and a source-only first publication under the personal account [`LuluCJJ`](https://github.com/LuluCJJ). The public repository is [`LuluCJJ/time-ledger`](https://github.com/LuluCJJ/time-ledger). The Android installation package remains a separate release decision.

### Owner decisions, with suggested defaults

- **Repository:** [`LuluCJJ/time-ledger`](https://github.com/LuluCJJ/time-ledger), public.
- **Project license:** Apache-2.0, with the full official text at the root `LICENSE`. SheetJS retains its own Apache-2.0 notice.
- **First publication:** source preview without a downloadable APK. The debug-signed and unsigned artifacts are unsuitable as formal releases, and phone restoration has not been evidenced.

## Later milestone: installable Android release

The current trial installation is signed with an Android Debug certificate. A new release key produces a package that cannot be installed over it as an update. Before shipping a differently signed APK:

1. Export a complete JSON backup from the phone currently holding the records; locate the file and retain another copy off-device.
2. Restore that backup into an isolated installation and compare event, category, log and review counts plus selected notes.
3. Verify the latest legacy Excel export against entries created in Time Ledger so that import cannot silently replace newer records.
4. Choose a signing key custody plan and version numbering; build a signed release artifact, inspect its signature and package identity, then rehearse the actual device transition.

Do not ask the user to uninstall the active app until the transfer has been demonstrated and its data independently backed up. A public source preview can proceed while this Android migration remains open, provided the README and release notes describe the limitation plainly.
