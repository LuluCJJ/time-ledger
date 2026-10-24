# Reading data from an installed debug APK

Use this only for a device you own and have explicitly authorized for USB debugging. It is a contingency when the installed app still has records but its JSON export creates an empty file. It does **not** install, uninstall, clear, or modify the phone app. The current user's phone has not yet been tested with this procedure.

The v35 trial APK's compiled manifest confirms package `app.personal.timeledger` and `android:debuggable=true`; the installed phone APK still needs its own check. Android's `run-as` command can read that app's private files only while a debuggable build remains installed. A later signed release build will not support this route. The manifest disables Android's automatic backup and the data extraction rules exclude app data, so device cloud restore must not be assumed to cover these records. The archive may contain full time records, private notes, and the locally saved Flomo webhook; never upload it to a public repository or support ticket.

## Procedure

1. Keep the existing app installed and continue to avoid clearing its data. Connect exactly one authorized device with USB debugging enabled. Approve the device trust prompt on the phone.
2. Choose a private folder **outside every Git repository**. On the local development machine, run `py -3 scripts/backup-debug-android.py --adb "C:\path\to\Android\Sdk\platform-tools\adb.exe" --output-dir "C:\private\time-ledger-backups"` from the repository root. Replace both paths with the real local paths. The script refuses to write inside a Git repository.
3. Record the archive path, byte count, and SHA-256 printed by the script. A positive byte count and a valid TAR structure are only first checks. A rerun with the same timestamp refuses to overwrite an existing archive. Do not delete or upgrade the app yet.
4. In an isolated local environment, inspect the archived WebView storage for the ledger key, parse it, and compare event, category, log, and period-review counts plus sample records against the still-running phone. Any exported JSON restored in a separate test profile must match those checks before treating it as a recovery backup.
5. Turn USB debugging off after the copy if it is no longer needed. Keep the raw archive and any derived backup in private storage with controlled access.

If `run-as` is denied, the installed APK may not be debuggable or the package ID may differ; stop and diagnose without uninstalling. If the archive lacks `app_webview`, the script rejects it. This procedure has local fixture tests only; device execution and restore validation remain required.
