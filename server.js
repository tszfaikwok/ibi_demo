const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HAP_BASE = 'https://api.mingdao.com';

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Proxy all HAP API requests through this server to bypass CORS
app.all('/proxy(*)', async (req, res) => {
  const targetUrl = `${HAP_BASE}${req.params[0]}`;
  try {
    const fetchOpts = {
      method: req.method,
      headers: { ...req.headers, host: new URL(targetUrl).host },
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      fetchOpts.body = Buffer.concat(chunks);
    }
    const resp = await fetch(targetUrl, fetchOpts);
    const body = await resp.text();
    res.status(resp.status).set('Content-Type', resp.headers.get('content-type') || 'application/json').send(body);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
