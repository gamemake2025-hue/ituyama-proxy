const express = require('express');
const corsAnywhere = require('cors-anywhere');

const app = express();
const host = '0.0.0.0';
const port = process.env.PORT || 10000;

// Serve 靜態檔案（index.html 在根目錄）
app.use(express.static(__dirname));

// CORS Proxy 配置（完全開放）
const proxy = corsAnywhere.createServer({
  originWhitelist: [],
  requireHeader: [],
  removeHeaders: ['cookie', 'cookie2'],
  redirectSameOrigin: true,
  httpProxyOptions: { xfwd: true },
  maxRedirects: 5
});

// 處理 proxy 請求
app.use((req, res, next) => {
  if (req.path.startsWith('/http') || req.path.startsWith('/https')) {
    proxy.emit('request', req, res);
  } else {
    next();
  }
});

// 啟動伺服器
app.listen(port, host, () => {
  console.log(`Proxy running on port ${port}`);
});
