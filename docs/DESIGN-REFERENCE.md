# DataLens DCS 操作站界面参考

更新：2026-09-24。用户要求采用完整工业 DCS 操作站的设计语言，当前主参照已从 Metabase 改为工业过程 HMI；Metabase 为此前版本的历史参考。

## 来源

- [Rockwell Automation — Process HMI Style Guide](https://literature.rockwellautomation.com/idc/groups/literature/documents/wp/proces-wp023_-en-p.pdf)：参考固定功能区、灰阶画布、状态与数值、趋势、faceplate 的组织方式；着色集中用于异常与选中状态。已核对官方指南的章节组织与色彩说明。
- [Emerson DeltaV Live](https://www.emerson.com/en/automation-systems/distributed-control-systems-dcs/deltav-distributed-control-system/deltav-live)：参考操作员工作区、分层导航与单击进入细节的组织思路。

本产品自行实现界面，不使用厂商标识，不宣称属于 DeltaV / PlantPAx 或通过工业 HMI 标准认证。

## 当前实现

打开即进入历史复盘站。固定顶栏与底部状态栏；顶部显示数据时标、监测指标、控制量和设定约束。宽屏和中等屏幕使用左侧事件索引、右侧趋势/数据视图；窄屏依次排列。参数编辑、复核记录与 Agent 作为工具面板；操作说明仍可按需打开。

背景与常规构件采用中性灰阶（不带蓝色底调）、矩形边框、等宽数值。结构底色为 #BCBCBC，读数区为 #EDEDED，导航为 #353535；深蓝 #294969 限于选中项，琥珀黄 #F1DD89 表示超出用户设定约束，同时保留文本和符号。普通按钮保持灰色。不使用闪烁、随机状态、虚构设备位号或厂商标识。

读数、趋势游标与事件定位来自同一份数据。时标为历史记录时间，未经配置的位号和单位明确说明；默认是仓库示例。未接生产系统，页面没有启动/停机、阀门操纵或真实报警确认功能。

## 验证

浏览器已检查灰阶操作站截图和默认直接进入工作台；事件索引、历史采样值与游标同步。1440 px 宽屏布局的 DOM 边界检查无横向溢出；应用浏览器宽屏截图存在右侧黑色区域，因此宽屏布局只完成结构检查，实际截图使用原窗口宽度。此轮未改变分析判定引擎或模型后端。
