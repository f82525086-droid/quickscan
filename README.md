# 秒验 QuickScan

二手电脑一键检测工具，帮您识别配置造假、评估整机状况。

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 下载

访问 [下载页面](https://f82525086-droid.github.io/quickscan/) 或直接前往 [Releases](https://github.com/f82525086-droid/quickscan/releases) 下载最新版本。

## 功能特性

- **硬件匹配检测** - 自动检测 CPU、内存、硬盘等真实配置
- **电池健康评估** - 检测电池健康度、循环次数
- **硬盘状态检测** - 读取 SMART 状态、通电时长
- **交互式功能检测** - 屏幕坏点、键盘、触控板、摄像头
- **翻新检测** - 检测官方翻新标记、第三方部件更换
- **PDF 报告导出** - 生成专业检测报告

## 系统要求

- **macOS**: 10.13 (High Sierra) 或更高版本，支持 Intel 和 Apple Silicon
- **Windows**: Windows 10 (1809) 或更高版本

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev

# 构建应用
npm run tauri build
```

## 发布新版本

1. 更新 `package.json` 和 `src-tauri/tauri.conf.json` 中的版本号
2. 创建并推送标签：
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. GitHub Actions 会自动构建并发布

## 技术栈

- [Tauri 2.0](https://tauri.app/) - 跨平台桌面应用框架
- [React 19](https://react.dev/) + TypeScript - 前端框架
- [Vite](https://vitejs.dev/) - 构建工具

## 许可证

MIT License
