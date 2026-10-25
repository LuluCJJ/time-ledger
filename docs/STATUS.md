# 当前状态

时间账仍在预览阶段。[Android 预览版 APK](https://github.com/LuluCJJ/time-ledger/releases/tag/v1.0.0-preview.1)已公开；Windows 安装包暂未公开。

## 可以做什么

- 在设备上记录、修改和补记活动，使用两级彩色分类，按日、周、月回看。
- 使用专注时钟，填写每日计划、日周月总结。
- 导入旧时间日志 Excel；导出可读 Excel、CSV 和完整 JSON 备份。
- 选择性地将备注或总结填入 Flomo 草稿；直接发送需自行配置接入地址。

## 使用前应知道

- 数据保存在当前设备，浏览器、Android 和 Windows 之间没有自动同步。
- 完整恢复应使用 JSON；Excel 适合阅读与筛选，无法保留全部内部字段。请确认导出文件非空，并在独立环境演练恢复。
- Android 预览版的包名是 `app.personal.timeledger.official`，与早期试用版独立安装，**不会自动继承试用版记录**。两者之间的真实数据迁移尚未经过独立 Android 真机验收。
- 从旧备份恢复仍在进行中的活动时，计时会沿用旧起点；迁移前宜先结束该活动，再导出新备份。

开发与发布流程见 [Android 发布说明](ANDROID_RELEASE.md)、[数据与隐私](DATA.md)及[第三方组件](THIRD_PARTY.md)。
