# Graph 字体与字号 · 2026-11-15

沿用本地系统无衬线与等宽字体，不新增字体下载。范围是 Graph 全屏的文字层级和共享 DAG 渲染器；页面结构、相机、节点尺寸与数据契约保持原有语义。

## 阅读层级

| 角色 | 改前 | 改后 |
| --- | --- | --- |
| 顶部 run | 14px / 700 | 15px / 650 |
| 当前步骤引导 | 12px | 13px |
| 工具带 / 节点搜索 | 12px | 13px |
| 工作区与证据标签 | 11px | 12px / 500–600 |
| Inspector 标题 | 13px / 700 | 14px / 600 |
| 当前节点名 | 14px / 700 | 16px / 600 |
| 元数据标签 / 值 | 11px / 12px | 12px / 13px；Source ID 保留 12px 等宽 |
| 代码 | 12px，22.2px 行高 | 13px，22.1px 行高 |
| 状态栏 / Playback 辅助信息 | 约 10–11px | 12px |
| DAG 节点标题 / 元数据 | 12px / 10px | 13px / 11px |
| 合并节点标题 / 内容概括 | 12.5px / 11px | 14px / 12px |

用字号、字重和间距区分当前证据与辅助信息。窄检查器中代码每行容纳的字符有限，保留局部横向滚动；说明和长路径可以换行。100px 标签列避免 Type / Category 被挤成两行，完整大整数可以复制。代码增大后收紧相对行高，保持接近原有的实际行距。

SVG 不再用 `textLength` 横向挤压字形。标题、摘要、源信息按字号和不同轮廓的安全宽度自然省略；展开分组标题也保留计数空间。完整原文仍在节点可访问描述和 Inspector。共享 Drawing 同时用于画布、Compare DAG、SVG 与 PNG。Fit 是看全体的缩略视图，Locate 可以回到可读尺度；没有用固定屏幕字号遮盖图中节点。

## 实际浏览器截图

同一公开合成 `node-types-synthetic`、源 #60、Code Diff、Fit、暂停、活动关闭、文档顶部，均为独立完整 PNG，没有拼图或裁切。

| 视口 | 改前 | 改后 |
| --- | --- | --- |
| 1586×912 | [before](graph-typography/before-1586.png) | [after](graph-typography/after-1586.png) |
| 1280×800 | [before](graph-typography/before-1280.png) | [after](graph-typography/after-1280.png) |

[before.json](graph-typography/before.json) 与 [after.json](graph-typography/after.json) 是 computed style；[manifest](graph-typography/capture-manifest.json) 保存来源、尺寸及 SHA-256。已检查两个桌面宽度：两层标签不截断、工具带不侵入侧栏、代码保持行号/增删/复制，Playback 可达。1280 的长详情在检查器内滚动，Raw reference 仍可访问。

## 复现与验证

```sh
source .venv/bin/activate
npm --prefix frontend run check
npm --prefix frontend run build
python -m backend.cli export out --html trajviz-report.html
# 单独终端：python -m backend.cli serve out
node scripts/verify-graph-fullscreen.mjs
PYTHON="$(command -v python)" node scripts/smoke-e2e.mjs
```

打开 <http://127.0.0.1:8765/#view=graph&run=node-types-synthetic> → Fullscreen graph → Fit → 点 #60 → Code Diff。可用 Locate selected graph node 切回阅读尺度。完整功能截图和最终结果见 [Graph 全屏报告](graph-fullscreen.md)。

专项在本地和断网单文件 HTML 中检查两个尺寸的真实文字边界：11 个类别节点的标题/元数据均在轮廓内，文字没有强制字宽；两级标签与工具带不溢出，代码至少 13px 且保留可读行距。七节点 Fit、Final Answer、完整大索引、补丁/缺失态、活动、搜索、焦点和导出沿用全屏专项。一次 scoped type detector 返回 `[]`；结论还依据浏览器测量和截图复查。

本轮限桌面，没有改动全站字体家族，也没有新增手机端排版。显式 Fit 后文字会随完整图缩小；元数据仍可能省略，完整值可在检查器读取。
