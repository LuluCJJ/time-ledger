# Contributing · 参与贡献

## 中文

时间账正在作为个人本地账本试用。欢迎围绕记录、分类、复盘、数据可携带性和无障碍体验提出问题或改进。请先阅读[产品原则](docs/PRODUCT.md)、[数据与隐私](docs/DATA.md)和[当前限制](docs/STATUS.md)。

修改应用请以本仓库的 `web/` 与 `shells/` 为准。提交前在仓库根目录运行 `node scripts/verify-source.mjs`；改动 Android 或 Windows 容器时，再从 `shells/` 构建相应平台。请描述改动对应的使用场景、验证方式和仍未验证的部分。

问题复现和测试只能使用虚构或经充分脱敏的数据。不要提交真实时间记录、旧 Excel、备份、个人截图、Flomo 接入地址、签名密钥或本机路径。涉及导入、覆盖、删除、同步或升级的改动，请写清数据保留和恢复路径；不要用真实主账本做破坏性试验。

仓库默认忽略新的 JSON 和图片文件；公开检查仅允许已知构建配置和原有 Android 图标路径。确实需要新增此类公开资源时，先审阅内容和来源，再有意调整白名单。自动检查不能代替提交前人工核对。

## English

Time Ledger is in personal local-ledger use. Issues and contributions about recording, categories, reflection, portability and accessibility are welcome. Read the [product principles](docs/PRODUCT.md), [data boundary](docs/DATA.md) and [current limitations](docs/STATUS.md) first.

Make app changes in this repository's `web/` and `shells/` directories. Before submitting, run `node scripts/verify-source.mjs` from the root; build the affected platform from `shells/` for wrapper changes. Explain the user scenario, verification and remaining limits.

Use fictional or fully anonymized reproduction data. Never submit real time records, legacy exports, backups, personal screenshots, Flomo webhooks, signing keys or local user paths. For import, replacement, deletion, sync or upgrade changes, document how data is preserved and recovered. Do not test destructive paths on an active personal ledger.

New JSON and image files are ignored by default. Public checks allow only known build configuration and existing Android artwork paths. Review content and provenance before deliberately extending the allowlist. Automated checks do not replace manual review before a push.
