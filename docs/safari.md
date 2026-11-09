# Safari 试用指南 · v0.3.1

目标是 Mac 和 iPhone 的**前台预约辅助**。用户已反馈 iPhone Safari + Userscripts 的 v0.3.0 基本功能可用，设备与系统版本尚未记录；Mac Safari 仍待验证。朋友使用 Mac Chrome，属于 Chromium 测试，不能作为 Mac Safari 的验证。v0.3.1 修复了原网址 `Signup` / `SignUp` 大小写差异，请更新脚本后复核。请在 [Issue #4](https://github.com/os-till-go/HKU-Fitness-Watcher/issues/4) 分别记录设备结果。

## 选择脚本管理器

| 方案 | 安装入口 | 本次处理 |
| --- | --- | --- |
| Tampermonkey Safari | [官方 Safari 下载页](https://www.tampermonkey.net/index.php?browser=safari&locale=en) | 兼容同步旧 API 与异步 GM API |
| Userscripts | [App Store](https://apps.apple.com/app/id1463298887) · [官方项目文档](https://github.com/quoid/userscripts) | 兼容异步 `GM.getValue / setValue / deleteValue` |

任选一个开始测试，不要同时让两个管理器运行同一脚本。不要将 Chrome / Edge 的开发者模式步骤套到 Safari。

## 安装试用脚本

**未合并的试用版：** 使用 [fix/apple-support-signup 的 Raw 脚本](https://raw.githubusercontent.com/os-till-go/HKU-Fitness-Watcher/fix/apple-support-signup/fitness-watcher.user.js)。合并后才使用主 README 的 main 安装链接。无论哪一种管理器，先确认面板显示 **v0.3.1**。

### Mac

1. 从上述官方入口安装脚本管理器，在 Safari「设置 → 扩展」启用它。
2. 允许扩展访问 `fcbooking.cse.hku.hk`。
3. 打开试用脚本链接，从管理器完成安装；Tampermonkey 也可新建脚本后粘贴完整源码，Userscripts 可将 `.user.js` 文件存入它配置的脚本目录。
4. 打开或刷新 [原预约页](https://fcbooking.cse.hku.hk/Form/SignUp)，确认助手出现。

### iPhone

1. 安装并打开脚本管理器 App，按 App 提示完成初始设置。Userscripts 需要确认用于读取脚本的目录；不同版本可能已经有默认目录。
2. 在系统设置中找到 Safari 的「扩展」，启用管理器；在 Safari 中授予它此预约网站的访问权限。系统版本不同，设置入口的位置可能不同，可搜索 Safari。
3. 在 Safari 打开试用脚本链接。使用 Userscripts 时，打开 Safari 的扩展菜单，从 Userscripts 的安装提示安装；也可将下载的 `.user.js` 放入已配置目录。
4. 返回预约页并刷新。先展开面板确认版本；打开键盘编辑资料时检查按钮是否仍可操作。
5. 使用顶部「收起助手」或面板标题收起它，再操作原网页声明与验证码。点击标题可重新展开。

Userscripts 的安装方式和异步 API 以 [发布分支文档](https://github.com/quoid/userscripts/tree/release/4.x.x) 为依据；请在反馈中带上实际安装的管理器版本。

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

即使本地测试通过，也应等到你和朋友完成相关设备验收后，才将 Safari 标为已支持。关联 PR 使用 `Refs #4` 保留 issue，避免合并代码就自动关闭未完成的实机验证。
