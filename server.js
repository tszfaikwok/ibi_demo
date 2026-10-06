const express = require('express');
const path = require('path');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Read and decrypt CLI token
function getAuthToken() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(process.env.USERPROFILE || process.env.HOME, '.hap-cli', 'config.json'), 'utf8'));
    const profile = cfg.profiles[cfg.active_profile];
    if (!profile || !profile.auth_token) return null;
    // Token is base64-encoded AES-CBC ciphertext; decrypt using the CLI's crypto module
    const { decrypt_token } = require('C:/Python314/Lib/site-packages/hap_cli/core/token_crypto.js');
    return decrypt_token(profile.auth_token);
  } catch(e) {
    console.error('Token decrypt error:', e.message);
    return null;
  }
}

const CONFIG = {
  appId: 'd7025492-1b4f-4fda-b6a4-4e8dba471d98',
  orgId: '9160ec33-3711-4042-b7a5-838e7e8bfd9f',
  accountId: '68d6380a-31cd-492d-801f-ff1845f87b33',
  loginUrl: 'https://www.mingdao.com',
  apiBase: 'https://api.mingdao.com',
};

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Proxy HAP API requests
// Frontend format: /proxy/rest/app/{app_id}/worksheet/{ws_id}/record?params
// Maps to: POST https://api.mingdao.com/v3/app/worksheets/{ws_id}/rows/list
app.all('/proxy/rest/app/:appId/worksheet/:wsId/record', async (req, res) => {
  const authToken = getAuthToken();
  if (!authToken) {
    return res.status(500).json({ success: false, error_msg: 'Auth token unavailable' });
  }

  const { appId, wsId } = req.params;
  const queryParams = {
    pageSize: parseInt(req.query.pageSize) || 500,
    pageIndex: parseInt(req.query.pageIndex) || 1,
    responseFormat: req.query.responseFormat || 'json',
    includeSystemFields: req.query.includeSystemFields === 'true',
    includeTotalCount: req.query.includeTotalCount === 'true',
  };
  if (req.query.fields) {
    queryParams.fields = req.query.fields.split(',');
  }
  if (req.query.filter) {
    try { queryParams.filter = JSON.parse(req.query.filter); } catch(e) {}
  }
  if (req.query.sorts) {
    try { queryParams.sorts = JSON.parse(req.query.sorts); } catch(e) {}
  }

  const targetUrl = `${CONFIG.apiBase}/v3/app/worksheets/${wsId}/rows/list`;
  const body = JSON.stringify(queryParams);

  const options = {
    hostname: 'api.mingdao.com',
    path: `/v3/app/worksheets/${wsId}/rows/list`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `md_pss_id ${authToken}`,
      'AccountId': CONFIG.accountId,
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': CONFIG.loginUrl,
      'Referer': `${CONFIG.loginUrl}/`,
      'HAP-Appid': appId || CONFIG.appId,
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const proxyReq = https.request(options, proxyRes => {
    const chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', () => {
      const bodyStr = Buffer.concat(chunks).toString('utf8');
      res.status(proxyRes.statusCode)
         .set('Content-Type', proxyRes.headers['content-type'] || 'application/json')
         .send(bodyStr);
    });
  });

  proxyReq.on('error', err => {
    res.status(502).json({ success: false, error_msg: err.message });
  });

  proxyReq.write(body);
  proxyReq.end();
});

// Also handle the dashboard user info endpoint
app.get('/proxy/rest/app/:appId/user/info', (req, res) => {
  res.json({
    success: true,
    data: {
      id: CONFIG.accountId,
      name: 'tsz fai',
      email: 'tszfai.kwo****@fujifilm.com',
      avatar: 'https://p1.mingdaoyun.cn/UserAvatar/default2.png?watermark/2/text/dA==/font/5oCd5rqQ6buR5L2T/fontsize/1000/fill/d2hpdGU=/dissolve/100/gravity/Center/dx/0/dy/0/fontstyle/Ym9sZA==%7CimageView2/1/w/100/h/100/q/90',
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
