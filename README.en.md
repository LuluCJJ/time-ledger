# Time Ledger · 时间账

[简体中文](README.md) · [Product principles](docs/PRODUCT.md) · [Data and privacy](docs/DATA.md) · [Contributing](CONTRIBUTING.md) · [Project and release boundaries](docs/PROJECT_GOVERNANCE.md) · [Android release](docs/ANDROID_RELEASE.md) · [Third-party components](docs/THIRD_PARTY.md)

**See where your time went, then choose what to do next.** Time Ledger is a local-first personal time log. Start an activity, close it when you switch, correct the actual times later, and review the shape of your days, weeks, and months.

> **Current backup status (2026-10-24):** Earlier phone trials produced 0-byte JSON files. A later complete backup supplied by the user was imported into a fresh, separate ledger and its record counts persisted after reload. This establishes that the supplied snapshot is restorable; newer phone records still need comparison, and an Android restore rehearsal remains open. Keep the installed app and its data. Do not uninstall, clear data, or move to a differently signed package. See [current status](docs/STATUS.md) and the [data rescue procedure](docs/ANDROID_DATA_RESCUE.md).

## Origin

The project began with [episode 38 of the Chinese podcast *Zong Heng Si Hai*, on time poverty](https://www.xiaoyuzhoufm.com/episode/657d53aa20d779b49d86d299). A recommendation in its comments led me to the Time Logger app (时间日志), which I used for a long time. As my records grew, I wanted a ledger that could also support notes, reflection, portable history, and my personal knowledge system. This project is an independent response to those needs.

Time Ledger is not affiliated with the podcast or the existing app. Their product code, APK, artwork, and user data are not included here.

## Design commitments

1. **Record facts before interpreting them.** Store actual start and end times. Compute elapsed time from the saved start and the current clock. Keep numerical summaries reproducible and reflections editable by the person.
2. **Leave gaps honest.** An unrecorded interval may stay unrecorded. The app does not invent activity to fill a chart.
3. **Make single-person use reliable first.** The Android app is the current primary ledger. Data stays on the device and can be exported as a complete backup. Cloud sync is not required.
4. **Use the ledger to reflect and act.** The timeline, weekly and monthly views, focus clock, and reviews should make patterns visible without scoring every minute.

## Current capabilities

- Start, finish, and switch activities; edit times and notes; review neighboring time changes.
- One hierarchical, color-coded category per record; daily timeline and weekly/monthly views.
- A focus clock based on actual elapsed time, with an optional expected end; Android supports keep-awake, landscape, and immersive full screen.
- Daily plans and summaries, category distributions, and written weekly/monthly reviews.
- Import legacy `.xls` or compatible `.xlsx`; export a readable five-sheet Excel workbook, a full JSON recovery backup, or CSV files. Time Ledger's readable workbook can also be imported to recover the main records, but it omits some internal provenance fields; use JSON for a complete restore. Every import has a preview.
- Optionally hand off a note or review to Flomo. Direct sending requires a webhook configured locally by the user.

Some behaviors still require device and migration validation. See [current status](docs/STATUS.md). A successful build alone does not prove that backup and restoration are safe.

## Run locally

Run `node scripts/verify-source.mjs` from the repository root for the local source checks: web tests, current tracked files, Git history, and diff formatting. Phone restoration, visual review, and release signing require separate verification.

Serve `web/` over HTTP: run `node dev-server.mjs` inside that directory, then open `http://127.0.0.1:4174/`. Browser and Android records are stored separately.

For Android and desktop builds, in `shells/` run `npm ci`, followed by `npm run android:debug-apk` or `npm run desktop:package`. Desktop packaging recreates its staging directories and checks the packaged app files and license texts against the current source. This check does not replace runtime testing or release review. Android builds require Java and the Android SDK. Run `node --test *.test.mjs` inside `web/` for the model checks. The optional `web/legacy_xls_converter.py` verifies legacy Excel conversions and needs Python with `xlrd`; importing Excel in the app does not require Python.

Before upgrading an existing test installation, obtain a nonempty complete backup and verify it through an isolated restore. Matching package ID and signing key make an over-install technically possible; they do not make an upgrade safe while backup verification is unresolved. Do not uninstall or clear app data. Moving to a formal release key requires a separate restore rehearsal and data-transfer plan.

To compare a legacy export without writing its contents to the repository, run `node web/excel-import-smoke.mjs <source.xls>`. The script defaults to `py -3` on Windows and `python3` elsewhere; an explicit Python executable can be supplied after the file path. It prints counts and a hash, never note text.

The Android launcher and splash artwork is generated from original shapes by `shells/scripts/generate-brand-assets.py`. Regeneration needs Python Pillow; a normal APK build uses the committed PNG assets.

## Repository boundaries

`web/` contains the app and tests; `shells/` contains Android and Windows wrappers; `docs/` contains product and data notes. The public source must not contain actual time records, old Excel exports, a private Wiki, screen recordings, Flomo webhooks, signing keys, or built APK/EXE files. See [data and privacy](docs/DATA.md).

The original project code and documentation are licensed under the [Apache License 2.0](LICENSE). Third-party components retain their own licenses; see [third-party components](docs/THIRD_PARTY.md). This public preview contains source code only; an installable package needs separate data-migration and signing checks.
