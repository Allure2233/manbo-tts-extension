# 🎙️ 曼波配音 - 浏览器扩展

鼠标划过网页文字时，自动用曼波 AI 语音朗读出来。

支持 **Chrome / Edge / Firefox / Zen Browser**。

## ✨ 功能

- 🖱️ 鼠标悬停文字 **0.3 秒** 自动朗读
- 🔊 音量、语速、悬停延迟可调
- 💡 朗读时元素出现蓝色边框闪烁提示
- ⚡ 双引擎：火山引擎直连（快）+ milorapart 中转站（稳）
- 🔄 引擎智能回退，一个挂了自动切另一个
- 📦 纯本地设置存储，不上传任何数据

## 📥 安装

### Chrome / Edge
1. 打开 `chrome://extensions/` 或 `edge://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展」→ 选择本项目文件夹
4. 完成！

### Firefox / Zen Browser
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」→ 选择 `manifest.json`
3. 或从 [Releases](https://github.com/你的用户名/manbo-tts-extension/releases) 下载签名的 `.xpi`

## ⚙️ 火山引擎（可选）

如果你有自己的曼波声音复刻，可以在扩展弹窗填写 API Key 和音色 ID，自动走火山引擎直连，更快更稳。

1. 注册 [火山引擎](https://console.volcengine.com)
2. 声音复刻 → 训练曼波音色
3. 拿到 `x-api-key` 和音色 ID 填入弹窗

不填则默认走中转站，无需任何配置。

## 🛠️ 技术栈

- Manifest V3
- 纯 JS，零依赖
- 兼容 Chrome / Firefox / Edge / Zen

## 📄 License

MIT
