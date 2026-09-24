## 运行复盘工作台与 Agent 原型

帮助运行/工艺工程师从 CSV 定位待核查时段，追溯原始证据，整理交接记录。首次打开直接进入 DCS 风格的脱硝历史复盘工作台，无需密钥；示例模式明确使用本地规则，不冒充模型输出。

```sh
node server/server.cjs
```

使用 Node.js 22+，无需安装依赖。打开 `http://127.0.0.1:8767/review/`，默认加载脱硝示例，按「检查 → 点证据 → 追问 → 导出」完成一次复盘。

切换「实时 Agent」并点击「连接模型」，配置支持 Chat Completions 工具调用的服务。Agent 会实际选择和调用数据检查、片段读取、前后对比、报告生成工具，再根据反馈继续分析；执行记录可展开。模型连接仅保存在页面内存中，刷新即清除。真实模型请求会将问题及工具读取的数据发送至所配置服务，可能产生费用。

也可直接打开 [review/index.html](review/index.html) 使用规则示例和本地分析；实时模式需要上述本地服务。当前尚未验证真实模型效果、真实用户需求或生产收益。

新版不把低指标共现直接解释为控制浪费，不输出未验证的年化收益。下文保留的原版收益描述仅对应假设性估算，不能视为已验证收益。

顶栏「产品能力」可查看当前数据处理链路、对约束线做独立试算，并检查 Agent 架构与最近一次执行记录。试算不覆盖原复盘，适合直接演示产品的分析能力与技术取舍。

- [产品经理作品集底稿](docs/PRODUCT-CASE-STUDY.md)
- [Agent 接口与模型连接说明](server/README.md)
- [设计参考](docs/DESIGN-REFERENCE.md)

验证：`node --test review/*.test.cjs server/*.test.cjs`。模型循环测试使用模拟模型响应，不消费额度。

---

<div align="center">

<img src="assets/icon.svg" alt="DataLens" width="120" />

### 工业控制性能分析工具：单文件、零依赖、离线可用

为工业过程控制回答一个问题：指标已经很安全时，我们是不是还在过量控制？双击 `index.html` 即可找到控制成本的可优化空间。

[![立即体验](https://img.shields.io/badge/体验-打开%20index.html-55e5d5?style=flat)](index.html) [![示例数据](https://img.shields.io/badge/示例-脱硝%20%2B%20空分-50a6ff?style=flat)](examples/) [![离线运行](https://img.shields.io/badge/运行-100%25%20离线-9f86ff?style=flat)](index.html)

[![GitHub stars](https://img.shields.io/github/stars/Xplore-LAB/DataLens?style=flat&label=stars&color=gold)](https://github.com/Xplore-LAB/DataLens/stargazers)
[![license](https://img.shields.io/badge/license-MIT-1683c4?style=flat)](LICENSE)
[![tech](https://img.shields.io/badge/tech-HTML%20%2B%20Plotly.js-32b643?style=flat)](index.html)

**简体中文** · [English](README.en.md)

</div>

---

## ⚡ 一分钟看懂 DataLens

DataLens 是一个单文件、纯前端的工业控制性能分析工具。不需要安装、不需要联网、不需要服务器，用现代浏览器打开 `index.html` 就能用。它通过可视化监控指标、控制手段与法规红线之间的动态关系，把过度控制的空间直接折算成经济效益。

| 你想完成的事 | 交付成果 |
| --- | --- |
| 快速体验工具 | 打开 `index.html`，内置排放控制示例数据自动加载 |
| 分析自己的数据 | Excel 整理后另存为 CSV，点击导入数据 |
| 移植到新场景 | 改几个 JSON 配置字段，一行代码都不用碰 |

## ✨ 核心能力

- **零依赖**：单个 HTML 文件，Plotly.js v3.3.1 内嵌，无需任何外部资源。
- **100% 离线**：数据不上传、不联网，全部在浏览器本地处理，可断网使用。
- **CSV 导入**：纯 JavaScript 解析，无第三方库依赖，自动识别并跳过表头。
- **数据与配置分离**：换数据不动配置，换配置不动数据。
- **3 个预设场景**：保守、默认、激进，一键切换全部参数。
- **6 个可调参数**：常用参数高亮，高级参数默认折叠。
- **4 个实时 KPI**：每次拖动滑块自动重算，瞬间刷新。
- **双层互动图表**：Plotly 驱动，支持缩放、悬停、导出 PNG。
- **操作指引面板**：可折叠，新用户三步上手。

## 🚀 快速开始

1. 下载 `index.html`，用 Chrome、Edge 或 Firefox 打开。
2. 内置排放控制示例数据（241 条分钟级数据，10:00 至 14:00），开箱即体验。
3. 点击预设场景按钮（保守、默认、激进），观察图表和 KPI 的变化。
4. 分析自己的数据：在 Excel 中整理好，另存为 CSV，点击 **导入数据**。

## 📥 数据与配置

### CSV 数据格式

```csv
时间,指标值,控制量,整点标记
2025-07-11 10:00:00,21.67,0.0,1
2025-07-11 10:01:00,22.34,0.16,0
2025-07-11 10:02:00,23.85,0.30,0
```

| 列 | 含义 | 格式 | 说明 |
| --- | --- | --- | --- |
| 第 1 列 | 时间戳 | `YYYY-MM-DD HH:MM:SS` | 分钟级或小时级均可 |
| 第 2 列 | 监控指标值 | 数字 | 如 NOx 浓度、氧纯度、温度 |
| 第 3 列 | 控制量 | 数字 | 如喷氨量、阀门开度、加药量 |
| 第 4 列 | 整点标记 | `1` / `0`，或 `是` / 空 | 标记每个小时窗口的起点 |

首行可以是中文或英文表头，程序自动识别并跳过。

### JSON 配置格式

配置文件只管理界面显示文字和滑块默认值，不含数据：

```json
{
  "siteName": "某燃气电厂",
  "section": "脱硝控制性能分析",
  "pollutant": "NOx",
  "pollutantUnit": "mg/m³",
  "regulator": "脱硝剂",
  "regulatorShort": "喷氨量",
  "regulatorUnit": "kg/h",
  "regulatoryLimit": 50,
  "sliders": {
    "trigger":  { "label": "NOx 触发线",  "val": 40, "min": 35, "max": 50, "unit": "mg/m³" },
    "spray":    { "label": "喷氨识别阈值", "val": 2,  "min": 0.5, "max": 20 },
    "discount": { "label": "节药折扣系数", "val": 15, "min": 5, "max": 30, "unit": "%" }
  }
}
```

所有页面文字（KPI 卡片、图表标签、说明文字）自动跟随 `pollutant` 和 `regulatorShort` 字段变化。换个场景，改几个 JSON 字段就行。

示例文件见 [examples/emission-control/](examples/emission-control/)（NOx 脱硝场景）和 [examples/air-separation/](examples/air-separation/)（氧纯度场景）。

## 🧭 核心概念

| 概念 | 图表表现 | 含义 |
| --- | --- | --- |
| **触发线** | 橙色虚线 | 低于此线视为安全区，安全区还在控制则有优化空间 |
| **法规上限** | 红色点线 | 硬天花板，小时均值不能超过 |
| **预算线** | 灰色虚线 | 物理约束，当前小时还剩多少余额可以用 |
| **期望控制目标** | 红色实线 | 基于触发线加预算动态计算的核心参考曲线 |
| **节药空间** | 绿色竖条 | 指标已低于触发线但仍施加控制的区域，打折后是可实现节约量 |

## 🏭 适用场景

任何「监控指标 + 控制手段 + 法规红线」的工业场景都能用：

| 行业 | 监控指标 | 控制手段 | 红线 |
| --- | --- | --- | --- |
| 环保 / 电力 | NOx 浓度 (mg/m³) | 喷氨量 / 脱硝剂用量 | 50 |
| 空分 | 氧纯度 (%) | 空压机导叶开度 / 功率 | 99.5 |
| 锅炉 | 排烟温度 (°C) | 给煤量 / 送风量 | 150 |
| 化工 | 反应温度 (°C) | 冷却水阀门开度 | 200 |
| 水处理 | 出水 COD (mg/L) | 加药泵频率 / 流量 | 30 |
| 钢铁烧结 | SO₂ 浓度 (mg/m³) | 脱硫剂用量 | 35 |
| 水泥窑 | 颗粒物排放 (mg/m³) | 收尘器功率 | 10 |

## 🛠️ 三步移植到新场景

以空分装置为例：

1. **整理 CSV 数据**：4 列，时间、氧纯度、导叶开度、整点标记。
2. **修改 JSON 配置**：`pollutant` 改成 `"氧纯度"`，`regulatorShort` 改成 `"导叶开度"`，`regulatoryLimit` 改成 `99.5`。
3. 打开 `index.html`，导入 CSV，加载 JSON，完成。

## 📁 仓库结构

```
DataLens/
├── index.html                    # 主程序（单文件，即开即用）
├── moisture-analyzer.html        # 水分数据分析页面
├── README.md                     # 中文文档（本文件）
├── README.en.md                  # English documentation
├── LICENSE                       # MIT 开源协议
├── .gitignore
└── examples/
    ├── emission-control/         # 排放控制场景（NOx 脱硝示例）
    │   ├── data.csv              #   241 条分钟级数据（10:00 至 14:00）
    │   └── config.json           #   显示配置
    └── air-separation/           # 空分装置场景（氧纯度控制示例）
        ├── data.csv              #   11 条模拟数据
        └── config.json           #   显示配置
```

## ❓ 常见问题

**Q: 为什么用 CSV 而不是直接读 Excel？**
A: 为了保持零依赖。CSV 是通用交换格式，Excel、WPS、Numbers 都能直接另存为 CSV。纯 JS 解析 CSV 只需二十行代码，解析 .xlsx 需要引入 500KB 以上的第三方库。

**Q: 数据安全吗？**
A: 完全安全。所有数据在浏览器本地处理，不会上传到任何服务器。你可以断网使用，数据不会离开你的电脑。

**Q: 图表能导出吗？**
A: Plotly 工具栏自带截图按钮（相机图标），点击即可导出 PNG 图片。

**Q: 可以自定义小时窗口大小吗？**
A: 当前版本默认按 60 分钟滚动窗口计算。如果要改成其他窗口（如 30 分钟、24 小时），修改 `computeWindow` 函数中的 `60` 和 `59` 两个常量即可。

## 🌐 浏览器兼容

Chrome 90+ · Edge 90+ · Firefox 90+ · Safari 15+

## 📄 许可证

[MIT](LICENSE)，可随意使用、修改、分发。
