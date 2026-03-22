const axios = require("axios");

// 严重程度对应的表情符号
const severityColors = new Map([
  ["CRITICAL", "<font color=\"warning\">CRITICAL</font>"],
  ["HIGH", "<font color=\"warning\">HIGH</font>"],
  ["MEDIUM", "<font color=\"comment\">MEDIUM</font>"],
  ["LOW", "<font color=\"info\">LOW</font>"],
  ["INFO", "<font color=\"info\">INFO</font>"],
]);

// 网络配置
const networkConfig = new Map([
  [1, { name: "以太坊主网", explorer: "https://etherscan.io", symbol: "ETH" }],
  [137, { name: "Polygon", explorer: "https://polygonscan.com", symbol: "MATIC" }],
  [59141, { name: "Linea Sepolia", explorer: "https://sepolia.lineascan.build", symbol: "ETH" }],
  [56, { name: "BSC", explorer: "https://bscscan.com", symbol: "BNB" }],
  [42161, { name: "Arbitrum", explorer: "https://arbiscan.io", symbol: "ETH" }],
]);

const maxAlertsPerMessage = 5;

function getActionAdvice(alert) {
  const alertName = alert.alertId;

  // 访问控制变更
  if (alertName.includes("ACCESS_CONTROL_CHANGES")) {
    return "**建议:** 立即验证权限变更合法性，检查新权限分配，如有异常立即撤销变更";
  }

  // 合约升级
  if (alertName.includes("CONTRACT_UPGRADE")) {
    return "**建议:** 验证升级操作授权，对比新旧代码差异，确认升级逻辑安全性";
  }

  // 高燃料价格异常
  if (alertName.includes("HIGH_GASPRICE")) {
    return "**建议:** 关注可能会有因网络波动导致无法完成的交易";
  }

  // 大额铸币
  if (alertName.includes("LARGE_MINT")) {
    return "**建议:** 验证铸币权限和数量合理性，检查是否存在通胀攻击风险";
  }

  // 大额转账
  if (alertName.includes("LARGE_TRANSFER")) {
    return "**建议:** 核实大额转账合法性，验证接收地址安全性，必要时实施转账限制";
  }

  // 余额不足
  if (alertName.includes("LOW_BALANCE")) {
    return "**建议:** 检查账户余额，补充必要资金";
  }

  // 所有权变更
  if (alertName.includes("OWNERSHIP_CHANGES")) {
    return "**建议:** 立即确认所有权转移合法性，验证新所有者身份";
  }

  // 配置参数变更
  if (alertName.includes("CONFIG_SET")) {
    return "**建议:** 审核配置变更内容，评估对系统安全影响";
  }

  // 交易失败异常
  if (alertName.includes("TRANSACTION_FAILED")) {
    return "**建议:** 分析交易失败原因，检查是否为攻击尝试，监控相关地址后续活动";
  }

  // 通用高严重级别告警
  return "**⚠️ 建议:** 立即进行安全评估，必要时暂停相关功能，联系安全团队进行深入分析";
}

// 格式化企业微信消息
function formatWeChatMessage(alerts) {
  // 对于多个alerts，遍历使用formatSingleAlert
  return alerts.map(alert => formatSingleAlert(alert));
}


// 格式化单个告警
function formatSingleAlert(alert) {
  const severityColor = severityColors.get(alert.severity) || alert.severity;

  // 获取网络信息
  const chainId = alert.chainId || alert.source?.block?.chainId;
  const networkInfo = networkConfig.get(chainId) || { name: `Chain ${chainId}`, explorer: "", symbol: "ETH" };

  let content = `# 🚨 Forta 安全告警\n\n`;
  content += `**告警ID:** \`${alert.alertId}-${alert.hash}\`\n`;
  content += `**名称:** ${alert.name}\n`;
  content += `**严重程度:** ${severityColor}\n`;

  if (alert.findingType) {
    content += `**检测类型:**  ${alert.findingType}\n`;
  }

  content += `**网络:** ${networkInfo.name}\n`;

  content += `**描述:** ${alert.description}\n`;

  // 区块链信息
  if (alert.source?.block) {
    const blockNumber = alert.source.block.number || alert.blockNumber;
    if (blockNumber && networkInfo.explorer) {
      content += `**区块:** [${blockNumber}](${networkInfo.explorer}/block/${blockNumber})\n`;
    } else if (blockNumber) {
      content += `- 区块: ${blockNumber}\n`;
    }
  }

  if (alert.source.transactionHash) {
    const txHash = alert.source.transactionHash;
    if (txHash && networkInfo.explorer) {
      content += `**交易:** [${txHash}](${networkInfo.explorer}/tx/${txHash})\n`;
    } else if (txHash) {
      content += `**交易:** \`${txHash}\`\n`;
    }
  }

  // 详细信息
  if (alert.metadata && Object.keys(alert.metadata).length > 0) {
    content += `**详细信息:**\n`;
    Object.entries(alert.metadata).slice(0, 5).forEach(([key, value]) => {
      content += `- ${key}: ${value}\n`;
    });
  }

  // 时间和Bot信息
  const timestamp = new Date(alert.createdAt).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
  content += `\n**监测时间:** ${timestamp}\n`;

  if (alert.source?.bot?.id) {
    content += `**检测Bot:** \`${alert.source.bot.id}\`\n`;
  }

  // 操作建议
  const actionAdvice = getActionAdvice(alert);
  if (actionAdvice) {
    content += `\n${actionAdvice}`;
  }

  return {
    msgtype: "markdown",
    markdown: {
      content: content
    }
  };
}

async function handleHook(ctx) {
  ctx.status = 200;

  let hook = ctx.routes[ctx.params.slug];
  if (hook === undefined) {
    ctx.status = 404;
    console.warn(`Slug "${ctx.params.slug}" was not found in routes`);
    return;
  }

  if (
    ctx.request.body === undefined ||
    !Array.isArray(ctx.request.body.alerts)
  ) {
    ctx.status = 400;
    console.error("Unexpected request from Forta:", ctx.request.body);
    return;
  }

  const validAlerts = ctx.request.body.alerts.filter(
    (alert) => alert.severity && alert.name && alert.description
  );

  if (!validAlerts.length) {
    ctx.status = 400;
    console.warn(
      "Nothing to send, all alerts has been filtered out. Received data:",
      ctx.request.body.alerts
    );
    return;
  }

  // 遍历每个alert，使用formatSingleAlert单独发送
  const messages = formatWeChatMessage(validAlerts);
  
  for (let i = 0; i < messages.length; i++) {
    await axios
      .post(hook, messages[i])
      .then(() => {
        console.log(`1 alert sent to WeChat`);
      })
      .catch((err) => {
        ctx.status = 500;
        console.error("Failed to send to WeChat:", err.response?.data || err.message);
        return;
      });
  }
}

async function handleHealthcheck(ctx) {
  let hook;

  for (const key in ctx.routes) {
    hook = ctx.routes[key];
    break;
  }

  if (hook === undefined) {
    console.warn("No routes has been configured!");
    ctx.status = 503;
    return;
  }

  // 企业微信webhook不支持GET请求，只检查配置是否存在
  ctx.status = 200;
  ctx.body = {
    uptime: process.uptime(),
    service: "forta-wechat",
    routes: Object.keys(ctx.routes).length,
    webhookConfigured: !!hook
  };
}


module.exports = {
  handleHook,
  handleHealthcheck,
};
