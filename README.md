# DataLens

> Industrial control performance analyzer — single HTML file, zero dependencies, works offline.
> 
> 工业控制性能分析工具 · 脱硝优化 · 空分节能 · 单文件离线运行

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![中文文档](https://img.shields.io/badge/文档-中文-red.svg)](README_zh.md)

---

## What is DataLens?

A **single-file, fully offline** analysis tool for industrial process control.  
No installation, no server, no internet — just open `index.html` in any modern browser.

It answers one question: *"When the process is already safe, are we still over-controlling it?"*

By visualizing the relationship between a monitored indicator, a control action, and a regulatory limit, DataLens reveals optimization headroom that translates directly to cost savings.

---

## Quick Start

1. Download `index.html` — open it in Chrome, Edge, or Firefox
2. A built-in demo dataset (emission control scenario) loads automatically
3. Explore by clicking preset scenarios or dragging the sliders
4. To analyze your own data: export CSV from Excel → click **📊 Import Data**

---

## Data Format (CSV)

Prepare your data in Excel, **Save as CSV**, then import:

```csv
time,indicator,control,reset
2025-07-11 10:00:00,21.67,0.0,1
2025-07-11 10:01:00,22.34,0.16,0
2025-07-11 10:02:00,23.85,0.30,0
```

| Column | Meaning | Format | Notes |
|--------|---------|--------|-------|
| 1 | Timestamp | `YYYY-MM-DD HH:MM:SS` | Minute or hourly granularity |
| 2 | Indicator value | Number | e.g. NOx concentration, O₂ purity |
| 3 | Control amount | Number | e.g. ammonia flow, valve position |
| 4 | Reset marker | `1`/`0` or `true`/空白 | Marks the start of each hourly window |

> A header row is optional — the parser auto-detects and skips it if present.

---

## Configuration (JSON)

A lightweight JSON file controls all display labels and slider defaults — no data inside:

```json
{
  "siteName": "Demo Plant",
  "pollutant": "NOx",
  "pollutantUnit": "mg/m³",
  "regulator": "Ammonia",
  "regulatorShort": "NH₃",
  "regulatorUnit": "kg/h",
  "regulatoryLimit": 50,
  "sliders": {
    "trigger":  { "label": "Trigger Line", "val": 40, "min": 35, "max": 50, ... },
    "spray":    { "label": "Spray Threshold", "val": 2, ... },
    "discount": { "label": "Savings Discount", "val": 15, "unit": "%", ... }
  }
}
```

All on-screen text (KPI cards, chart labels, callout notes) follows `pollutant` and `regulatorShort` automatically — **switch scenarios by editing a few JSON fields, not the code.**

---

## Use Cases

Any industrial process with a monitored indicator + control action + regulatory limit:

| Industry | Indicator | Control | Limit |
|----------|-----------|---------|-------|
| Power / Emission | NOx (mg/m³) | Ammonia injection | 50 |
| Air Separation | O₂ purity (%) | Guide vane / compressor | 99.5 |
| Boiler | Stack temperature (°C) | Coal feed / air flow | 150 |
| Chemical | Reactor temperature (°C) | Cooling water valve | 200 |
| Water treatment | Effluent COD (mg/L) | Chemical pump frequency | 30 |

---

## Core Concepts

| Element | Chart appearance | What it means |
|---------|-----------------|---------------|
| **Trigger line** | Orange dashed | Below this = "safe zone". Control actions here are optimization signals. |
| **Regulatory limit** | Red dotted | Hard ceiling. Hourly average must stay below this. |
| **Budget line** | Gray dotted | Physical constraint — remaining headroom in the current hour. |
| **Optimal target** | Red solid | Dynamic target computed from trigger + budget — the core reference. |
| **Savings area** | Green bars | Control actions taken while the indicator was safely below the trigger line. |

---

## Three-Step Workflow

1. **Import data** — CSV with 4 columns (time, indicator, control, reset)
2. **Load config** — JSON with display labels and slider defaults (optional)
3. **Explore** — click preset scenarios, drag sliders, export results

Example files are in `examples/emission-control/` and `examples/air-separation/`.

---

## Features

- **Zero dependencies** — single HTML file, Plotly.js v3.3.1 embedded
- **100% offline** — no CDN, no network, no data leaves the browser
- **CSV import** — pure JavaScript parser, no third-party libraries
- **Config / data separation** — swap data without touching labels, or vice versa
- **3 preset scenarios** — one-click switching (Conservative / Default / Aggressive)
- **6 adjustable parameters** — grouped into Common and Advanced with collapsible panel
- **4 real-time KPIs** — updated on every slider change
- **Dual-panel interactive chart** — Plotly-powered with hover, zoom, and export

---

## Repository Structure

```
DataLens/
├── index.html                    # The tool (single-file, offline)
├── README.md                     # This file
├── LICENSE                       # MIT
├── .gitignore
└── examples/
    ├── emission-control/         # NOx scrubbing scenario
    │   ├── data.csv              #   241 data points (10:00–14:00)
    │   └── config.json           #   Display configuration
    └── air-separation/           # Oxygen purity scenario
        ├── data.csv              #   11 sample data points
        └── config.json           #   Display configuration
```

---

## Browser Support

Chrome 90+ · Edge 90+ · Firefox 90+ · Safari 15+

---

## License

MIT — see [LICENSE](LICENSE) for details.
