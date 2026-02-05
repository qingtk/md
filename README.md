# QingMD - 纯情Markdown编辑器

https://md.qing.tk


1. 左侧文件树（像 VSCode Web一样：用 File System Access API 目录授权 + 文件读写 ）
2. 多文件 Tab
3. 自动保存
4. 用 StackEdit.js 实现 Markdown 编辑
5. PWA（离线 + 桌面化）
6. GitHub 同步（走 API，不是本地 git）

## 特点：
- 可读写本地目录树里的文件
- 界面简洁紧凑

## 部署 Deploy
- Github Pages: (Fork)[https://github.com/qingtk/md/fork] then Settings>Pages setup.   
    demo: <https://md.qing.tk>
- Netlify: https://app.netlify.com/start/deploy?repository=https://github.com/qingtk/md  
    demo: <https://qingmd.netlify.app>

- Local: 
```
git clone https://github.com/qingtk/md md 
cd md
npx serve . # py -m http.server 80 
```

## 更新记录
1. 2026-02-04 用WARP cli生成初始版 v1.0.0