# Safari 试用指南 · v0.3.1

目标是 Mac 和 iPhone 的**前台预约辅助**。用户已反馈 iPhone Safari + Userscripts 的 v0.3.0 基本功能可用，设备与系统版本尚未记录；Mac Safari 仍待验证。朋友使用 Mac Chrome，属于 Chromium 测试，不能作为 Mac Safari 的验证。v0.3.1 修复了原网址 `Signup` / `SignUp` 大小写差异，请更新脚本后复核。请在 [Issue #4](https://github.com/os-till-go/HKU-Fitness-Watcher/issues/4) 分别记录设备结果。

## 安装与启动

完整步骤已统一放到主 README，按设备选择即可：

- [iPhone / iPad Safari：下载、文件夹、启用扩展、安装脚本和网站授权](../README.md#install-iphone)
- [Mac Safari：下载、启用扩展、安装脚本和启动](../README.md#install-mac-safari)
- [Mac Chrome：使用 Chrome 安装教程](../README.md#install-chrome)
- [安装排错](../README.md#install-help) · [每天怎么启动](../README.md#daily-use)

当前正式脚本已合并至 main，使用 [main 的完整脚本](https://raw.githubusercontent.com/os-till-go/HKU-Fitness-Watcher/main/fitness-watcher.user.js)，安装后应显示 **v0.3.1**（或后续更新版本）。Safari 默认推荐免费的 [Userscripts](https://apps.apple.com/hk/app/userscripts/id1463298887)。

下面保留设备验收和反馈表，供安装成功后测试使用。

## 测试顺序

1. **安装 / 权限**：刷新后仅出现一个 v0.3.1 面板，未操作时不自动查询或预填。
2. **日期 / 场次**：切换两天日期，查看星期和场次；选择可订场次，确认原网页日期保留原格式，原生下拉框仍可使用。
3. **资料**：先用演示资料测试。点「填写资料」，核对三个字段；勾选保存后再点填写，刷新检查是否恢复；清除后再刷新检查是否已删除。不要提交演示资料。
4. **蹲位**：点满位时段或蹲任意时段，保持页面前台；可以停止和更改日期，不应被旧响应覆盖。自然退位不可控制，不必为测试占位或取消预约。
5. **提醒**：点击通知 / 声音测试按钮，记录是否听到声音、是否出现系统权限提示；系统通知不可用时，界面应给出页内提醒的降级说明。有位时，页内提示不应自行消失。
6. **手机布局**：竖屏、横屏、打开键盘、滚动面板、收起后操作原表单，各试一次。
7. **后台行为**：记录切后台或锁屏约一分钟后返回的状态；返回后重新点「查场次」。该项用于记录限制，不作为锁屏持续蹲位的通过标准。

## 提醒与后台限制

- iPhone 普通 Safari 标签页的通知能力不能等同于桌面浏览器。代码会检查 API；不支持时保留页内常驻提示。声音仍受用户点击、静音设置和浏览器策略影响。
- [Apple 的 Web Push 文档](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)描述了 Service Worker / 推送服务以及 iOS 主屏幕 Web App 的路线。当前脚本没有实现这套架构。
- 不承诺 iPhone 锁屏后持续查询或系统推送。无需为了测试关闭设备保护或修改 Safari 实验性设置。
- 此次视口高度和触控 CSS 通过模拟测试；真实设备缩放、地址栏、键盘及原网站布局仍需实测。

## 回填测试结果

复制到 Issue #4 评论区，Mac 和 iPhone 各一份：

```text
设备型号：
系统版本：
Safari 版本（若可查）：
脚本管理器 + 版本：
脚本版本：v0.3.1

安装 / 权限：通过 / 失败
日期切换与场次查询：通过 / 失败
原表单选场与日期格式：通过 / 失败
独立填写资料：通过 / 失败
保存 → 刷新恢复 → 清除 → 刷新不恢复：通过 / 失败
前台蹲位 / 停止 / 日期切换：通过 / 失败
声音：有 / 无
系统通知：可用 / 不支持 / 拒绝 / 其他
页内有位提示：通过 / 尚未遇到放位 / 失败
手机键盘 / 滚动 / 横竖屏 / 收起：通过 / 失败 / 不适用
后台或锁屏后返回：观察到的行为

问题复现步骤：
预期结果：
实际结果：
截图（遮挡姓名、邮箱、学号）：
```

即使本地测试通过，也应等到你和朋友完成相关设备验收后，才将 Safari 标为已支持。Issue #4 保留设备测试记录，代码合并不代表所有设备组合都完成了实机验收。
