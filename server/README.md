# DataLens 本地 Agent 服务

要求 Node.js 22 或以上，无 npm 依赖。在仓库根目录运行：

```sh
node server/server.cjs
```

打开 `http://127.0.0.1:8767/review/`。服务仅绑定本机；静态页面与 API 使用同一地址，不开启 CORS。旧的 8766 静态预览不会自动获得 Agent 接口。

## 模型连接

使用支持 Chat Completions function calling 的服务。环境变量 `DATALENS_BASE_URL`、`DATALENS_MODEL`、`DATALENS_API_KEY`（本地免认证服务可省略 key）可配置默认连接；请求也可传入 `connection: {baseUrl, model, apiKey}`。baseUrl 可为 `https://服务地址/v1` 或完整 `/chat/completions` 地址；本地 HTTP 仅允许 localhost、127.0.0.1、::1。不会读取个人凭据文件。连接和密钥仅用于当前进程/请求，不写磁盘、不写日志、不在错误中回显。使用真实模型会由对应服务计费，测试不调用外部模型。

点击运行真实 Agent 时，会向所配置模型发送问题、当前对话，以及工具读取的列名、数据概况、统计值和部分原始记录。使用脱敏数据；不是离线推理承诺。工具仅能读取本次上传表格，不读取文件系统、不操作设备。

## API

- `GET /api/status` → `{available:true,configured:boolean,model:string|null}`。
- `POST /api/agent`，Content-Type `application/json`：
  `{message, history:[{role:'user'|'assistant',content}], context:{table:{headers,rows},mapping:{time,value,control},settings:{direction,limit,trigger,active},dataset?}, connection?}`。
- cells 为字符串；mapping 为从 0 起的列索引；settings 与 review/engine.js 一致。后端重新计算，不接收客户端分析结论。最多 20,000 行、64 列、12 MB、20 条历史。
- 成功：`{answer,trace:[{tool,label,args,summary,eventIds}],eventIds,report?,mode:'live',model}`。回答片段引用为 `[E01]`；只允许本轮实际读取过的 ID。trace 不包含模型内部推理。
- 失败：非 200 `{error:'中文说明'}`，不伪造结果或自动回退到示例。

## 工具与限制

`inspect_dataset`、`list_events`、`inspect_event`、`compare_event_windows`、`build_report` 均为真正运行的本地只读函数。模型最多 6 次请求、16 次工具调用，每次模型请求 45 秒超时；浏览器取消后不再发起下一次调用。报告根据已读取的真实片段生成。前后对比是描述性证据，不证明因果或节约收益。

这是受限的应用原型。引用 ID 的存在性和工具执行可校验，模型的自然语言数值与解释尚未逐句形式化验证，现场结论仍需工程师核对。本地规则示例由前端明确标识，与本 API 的 live 结果分开。

验证：`node --test server/*.test.cjs`。测试使用注入的假模型响应验证真实工具循环和 HTTP 边界，不消费模型额度。
