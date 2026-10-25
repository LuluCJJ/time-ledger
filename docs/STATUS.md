# 当前状态

更新：2026-10-25。源码已公开于 [LuluCJJ/time-ledger](https://github.com/LuluCJJ/time-ledger)，现有签名 APK 已作为 [1.0 预览版](https://github.com/LuluCJJ/time-ledger/releases/tag/v1.0.0-preview.1) 发布。Windows 安装包尚未公开。

## 已实现

- 本地时间记录、起止时间修正、空档补记、中途切换和两级彩色分类。
- 日时间线、周月预览、每日计划、日周月总结及专注时钟。
- 旧时间日志 Excel 导入预览、时间账可读 Excel 导出／导入、完整 JSON 备份与恢复、可选 Flomo 发送。
- Android APK 与 Windows 桌面包可从源码构建。记录留在各自设备；当前没有自动云同步。

## 已核对

- 试用版已在手机真实使用；用户确认 v41 的最近导出打开、分享和可读 Excel 导入预览正常。此前的 0 B 导出不是有效备份。
- 用户提供的完整 JSON 与旧 Excel 已在私人目录核对。修复候选在隔离浏览器中经产品导入入口恢复，并核对数量、字段与刷新后的持久保存；私人数据不进入公开仓库。
- 现有正式签名 APK 已核对包名 `app.personal.timeledger.official`、显示名“时间账 正式版”、签名、版本和包内许可与依赖归属。构建源码为提交 `4caa50f`；APK SHA-256 为 `2447E5C92696630E67C3FB1EC1B8A163FED1E193DAE337C520977BF771C43EE8`。公开源码与 Windows 打包检查持续在 CI 运行。

## 发布预览版时需说明

- 正式版与现用试用版是不同包名，**不会自动共享记录**。用户须自行保留原应用和完整备份，再决定是否迁入。
- 正式版在独立 Android 安装上的 JSON 恢复与试用版并行迁移没有做真机验证；仓库所有者决定跳过这次复测，[发布说明](https://github.com/LuluCJJ/time-ledger/releases/tag/v1.0.0-preview.1)已明示此限制。
- 备份若含仍在进行中的活动，导入后会沿用旧起点继续计时。正式迁移宜在结束当前活动后重新导出。
- 永久签名材料尚无离线副本；Windows 包尚未作为公开安装包发布。

发布与验收细节见[发布验收表](RELEASE_READINESS.md)、[Android 发布说明](ANDROID_RELEASE.md)和[第三方归属](THIRD_PARTY.md)。
