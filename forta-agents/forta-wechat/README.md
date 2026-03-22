# Forta WeChat Webhook 服务

基于forta-discord修改的企业微信webhook代理服务，用于将Forta安全告警转发到企业微信群。

## 快速开始

### 1. 配置企业微信webhook
创建 `forta-wechat.yml` 配置文件：

```yaml
hooks:
  - slug: ethereum
    hook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
  - slug: polygon  
    hook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
  - slug: lineasepolia
    hook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY
```

### 2. 启动服务
```bash
docker-compose up forta-wechat
```

## 功能特性

- 🔄 **兼容Forta**: 完全兼容Forta webhook规范
- 📱 **企业微信集成**: 转换为Markdown格式发送到企业微信
- 🎨 **富文本格式**: 支持表情符号和颜色标识
- 📊 **批量处理**: 自动合并多个告警避免刷屏

## 配置说明

- 默认端口：5002（可通过PORT环境变量修改）
- 配置文件：`/etc/forta-wechat.yml`
- 支持多个slug对应不同企业微信群

## API端点

- `POST /hook/:slug` - 接收Forta告警
- `GET /health` - 健康检查

## 消息格式示例

```
🚨 Forta 安全告警

告警ID: ALERT-123
名称: Suspicious Transaction
严重程度: 🔴 HIGH
类型: 🤔 SUSPICIOUS
描述: Detected unusual pattern...

区块: 12345678
交易: 0x1234...abcd
时间: 2024-01-15 14:30:25
```
