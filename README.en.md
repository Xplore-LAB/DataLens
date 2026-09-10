<div align="center">

<img src="assets/icon.svg" alt="DataLens" width="120" />

### Industrial control performance analyzer: single file, zero dependencies, fully offline

It answers one question for industrial process control: when the process is already safe, are we still over-controlling it? Open `index.html` and turn optimization headroom into measurable savings.

[![Try it](https://img.shields.io/badge/try-open%20index.html-55e5d5?style=flat)](index.html) [![Examples](https://img.shields.io/badge/examples-emission%20%2B%20air%20separation-50a6ff?style=flat)](examples/) [![Offline](https://img.shields.io/badge/runs-100%25%20offline-9f86ff?style=flat)](index.html)

[![GitHub stars](https://img.shields.io/github/stars/Xplore-LAB/DataLens?style=flat&label=stars&color=gold)](https://github.com/Xplore-LAB/DataLens/stargazers)
[![license](https://img.shields.io/badge/license-MIT-1683c4?style=flat)](LICENSE)
[![tech](https://img.shields.io/badge/tech-HTML%20%2B%20Plotly.js-32b643?style=flat)](index.html)

[简体中文](README.md) · **English**

</div>

---

## ⚡ DataLens in One Minute

DataLens is a single-file, fully offline analysis tool for industrial process control. No installation, no server, no internet: open `index.html` in any modern browser. By visualizing the relationship between a monitored indicator, a control action, and a regulatory limit, it reveals optimization headroom that translates directly into cost savings.

| What you want to do | What you get |
| --- | --- |
| Try the tool right away | Open `index.html`, a built-in emission control demo loads automatically |
| Analyze your own data | Prepare it in Excel, save as CSV, and import |
| Port it to a new scenario | Edit a few JSON config fields, no code changes needed |

## ✨ Core Features

- **Zero dependencies**: a single HTML file with Plotly.js v3.3.1 embedded, no external resources required.
- **100% offline**: no CDN, no network, no data leaves the browser.
- **CSV import**: pure JavaScript parser, no third-party libraries, header rows auto-detected and skipped.
- **Config and data separation**: swap data without touching labels, or vice versa.
- **3 preset scenarios**: Conservative, Default, and Aggressive, one-click switching for all parameters.
- **6 adjustable parameters**: common ones highlighted, advanced ones collapsed by default.
- **4 real-time KPIs**: recalculated on every slider change.
- **Dual-panel interactive chart**: Plotly-powered with hover, zoom, and PNG export.
- **Collapsible guidance panel**: new users get started in three steps.

## 🚀 Quick Start

1. Download `index.html` and open it in Chrome, Edge, or Firefox.
2. A built-in emission control demo dataset (241 minute-level points, 10:00 to 14:00) loads automatically.
3. Click the preset scenario buttons (Conservative / Default / Aggressive) and watch the chart and KPIs change.
4. To analyze your own data: prepare it in Excel, save as CSV, and click **Import Data**.

## 📥 Data and Configuration

### CSV Data Format

```csv
time,indicator,control,reset
2025-07-11 10:00:00,21.67,0.0,1
2025-07-11 10:01:00,22.34,0.16,0
2025-07-11 10:02:00,23.85,0.30,0
```

| Column | Meaning | Format | Notes |
| --- | --- | --- | --- |
| 1 | Timestamp | `YYYY-MM-DD HH:MM:SS` | Minute or hourly granularity |
| 2 | Indicator value | Number | e.g. NOx concentration, O₂ purity |
| 3 | Control amount | Number | e.g. ammonia flow, valve position |
| 4 | Reset marker | `1`/`0` or `true`/blank | Marks the start of each hourly window |

A header row is optional; the parser auto-detects and skips it.

### JSON Configuration

A lightweight JSON file controls all display labels and slider defaults, with no data inside:

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
    "trigger":  { "label": "Trigger Line", "val": 40, "min": 35, "max": 50 },
    "spray":    { "label": "Spray Threshold", "val": 2 },
    "discount": { "label": "Savings Discount", "val": 15, "unit": "%" }
  }
}
```

All on-screen text (KPI cards, chart labels, callout notes) follows the `pollutant` and `regulatorShort` fields automatically. Switch scenarios by editing a few JSON fields, not the code.

Example files live in [examples/emission-control/](examples/emission-control/) (NOx scrubbing) and [examples/air-separation/](examples/air-separation/) (oxygen purity).

## 🧭 Core Concepts

| Element | Chart appearance | What it means |
| --- | --- | --- |
| **Trigger line** | Orange dashed | Below this is the safe zone; control actions here are optimization signals |
| **Regulatory limit** | Red dotted | Hard ceiling; the hourly average must stay below this |
| **Budget line** | Gray dotted | Physical constraint: the remaining headroom in the current hour |
| **Optimal target** | Red solid | Dynamic target computed from trigger plus budget, the core reference curve |
| **Savings area** | Green bars | Control actions taken while the indicator was safely below the trigger line, discounted into achievable savings |

## 🏭 Use Cases

Any industrial process with a monitored indicator, a control action, and a regulatory limit:

| Industry | Indicator | Control | Limit |
| --- | --- | --- | --- |
| Power / Emission | NOx (mg/m³) | Ammonia injection | 50 |
| Air Separation | O₂ purity (%) | Guide vane / compressor | 99.5 |
| Boiler | Stack temperature (°C) | Coal feed / air flow | 150 |
| Chemical | Reactor temperature (°C) | Cooling water valve | 200 |
| Water treatment | Effluent COD (mg/L) | Chemical pump frequency | 30 |
| Steel sintering | SO₂ (mg/m³) | Desulfurizer dosage | 35 |
| Cement kiln | Particulate matter (mg/m³) | Dust collector power | 10 |

## 🛠️ Three Steps to a New Scenario

Using an air separation unit as an example:

1. **Prepare the CSV**: 4 columns, time, oxygen purity, guide vane opening, reset marker.
2. **Edit the JSON config**: set `pollutant` to `"O₂ purity"`, `regulatorShort` to `"guide vane"`, and `regulatoryLimit` to `99.5`.
3. Open `index.html`, import the CSV, load the JSON, done.

## 📁 Repository Structure

```
DataLens/
├── index.html                    # The tool (single-file, offline)
├── moisture-analyzer.html        # Moisture data analysis page
├── README.md                     # Chinese documentation
├── README.en.md                  # This file
├── LICENSE                       # MIT
├── .gitignore
└── examples/
    ├── emission-control/         # NOx scrubbing scenario
    │   ├── data.csv              #   241 minute-level points (10:00-14:00)
    │   └── config.json           #   Display configuration
    └── air-separation/           # Oxygen purity scenario
        ├── data.csv              #   11 sample data points
        └── config.json           #   Display configuration
```

## ❓ FAQ

**Q: Why CSV instead of reading Excel directly?**
A: To keep zero dependencies. CSV is a universal exchange format that Excel, WPS, and Numbers can all export. Parsing CSV in pure JS takes about twenty lines; parsing .xlsx requires a 500KB+ third-party library.

**Q: Is my data safe?**
A: Completely. All data is processed locally in the browser and never uploaded anywhere. You can use it offline; the data never leaves your computer.

**Q: Can I export the charts?**
A: The Plotly toolbar includes a screenshot button (camera icon) that exports PNG images.

**Q: Can I customize the hourly window size?**
A: The current version uses a 60-minute rolling window by default. To change it (for example to 30 minutes or 24 hours), edit the `60` and `59` constants in the `computeWindow` function.

## 🌐 Browser Support

Chrome 90+ · Edge 90+ · Firefox 90+ · Safari 15+

## 📄 License

[MIT](LICENSE), free to use, modify, and distribute.
