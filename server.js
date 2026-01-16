const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 啟用 CORS（允許前端呼叫）
app.use(cors());
app.use(express.json());

// 代理所有 GET 請求（包含 /results、/watch 等）
app.get('/*', async (req, res) => {
  let targetUrl = req.params[0];

  // 如果沒目標網址，回簡單首頁（可自訂成你喜歡的 HTML）
  if (!targetUrl || targetUrl === '/') {
    return res.send(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Google</title>
        <link rel="icon" href="https://www.google.com/favicon.ico">
        <style>
          body { background:#000; color:#fff; font-family:sans-serif; text-align:center; padding-top:20vh; }
          h1 { font-size:4rem; text-shadow:0 0 20px #00c4ff; }
          input { padding:15px; width:400px; font-size:1.5rem; border-radius:10px; border:2px solid #00c4ff; background:rgba(255,255,255,0.1); color:white; }
          button { padding:15px 30px; font-size:1.5rem; margin-left:10px; border-radius:10px; background:#00c4ff; color:black; border:none; cursor:pointer; }
        </style>
      </head>
      <body>
        <h1>ITUYUYAMAMA-PROXY</h1>
        <input type="text" id="url" placeholder="URLを入力してください (例: youtube.com)" autofocus>
        <button onclick="go()">サイトに行く</button>
        <script>
          function go() {
            let url = document.getElementById('url').value.trim();
            if (!url) return alert('URLを入力してください');
            if (!url.startsWith('http')) url = 'https://' + url;
            window.location = '/' + url;  // 這裡用 location.href，讓後端處理
          }
        </script>
      </body>
      </html>
    `);
  }

  // 自動補 https://
  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

  try {
    // 抓取目標網站（帶上用戶的 User-Agent 與語言）
    const response = await axios.get(targetUrl, {
      responseType: 'text',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept-Language': req.headers['accept-language'] || 'ja,en-US;q=0.9,en;q=0.8',
        'Referer': 'https://www.google.com/',
      },
      timeout: 15000, // 避免卡太久
    });

    let data = response.data;
    const $ = cheerio.load(data);

    // 強制偽裝成 Google
    $('title').text('Google');
    $('head').append(`
      <link rel="icon" href="https://www.google.com/favicon.ico" type="image/x-icon">
      <link rel="shortcut icon" href="https://www.google.com/favicon.ico" type="image/x-icon">
      <meta name="referrer" content="no-referrer">
    `);

    // 修正相對路徑（讓 YouTube 的 JS/CSS/圖片正常載入）
    const baseUrl = new URL(targetUrl).origin;
    $('[src^="/"]').each((i, el) => {
      const src = $(el).attr('src');
      $(el).attr('src', baseUrl + src);
    });
    $('[href^="/"]').each((i, el) => {
      const href = $(el).attr('href');
      $(el).attr('href', baseUrl + href);
    });
    $('[src^="http://"], [src^="https://"]').each((i, el) => {
      // 如果是 YouTube 自己的資源，保持原樣
    });

    // 回傳修改後的 HTML
    res.set('Content-Type', 'text/html');
    res.send($.html());
  } catch (err) {
    console.error('代理錯誤:', err.message);
    res.status(500).send(`
      <h1>代理錯誤</h1>
      <p>無法載入網址，請檢查輸入是否正確，或稍後再試。</p>
      <p>錯誤訊息: ${err.message}</p>
    `);
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`後端代理運行於 port ${PORT}`);
});
