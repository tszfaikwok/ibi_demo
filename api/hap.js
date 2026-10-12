// Vercel Serverless Function: proxies HAP V3 API calls.
//
// Auth token is read from the HAP_AUTH_TOKEN environment variable (set in
// Vercel → Project → Settings → Environment Variables). Never hardcode it.
// Refresh when the session token expires: `hap auth login`, then decrypt via
// hap_cli.core.token_crypto.decrypt_token and update the env var.

const HAP_API_BASE = process.env.HAP_API_BASE || 'https://api.mingdao.com';
const HAP_ACCOUNT_ID = '68d6380a-31cd-492d-801f-ff1845f87b33';

function buildHeaders(appId) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `md_pss_id ${process.env.HAP_AUTH_TOKEN}`,
    'AccountId': HAP_ACCOUNT_ID,
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://www.mingdao.com',
    'Referer': 'https://www.mingdao.com/',
    'User-Agent': 'HAP-CLI/0.9.1',
    'Accept-Language': 'zh-Hans',
    'HAP-Appid': appId,
  };
}

async function rowsList(wsId, appId, req) {
  // Frontend sends: /api/hap?appId=X&wsId=Y&pageSize=500&fields=...&filter=...
  const q = req.query || {};
  const body = {
    pageSize: parseInt(q.pageSize) || 500,
    pageIndex: parseInt(q.pageIndex) || 1,
    responseFormat: q.responseFormat || 'json',
    includeSystemFields: q.includeSystemFields === 'true',
  };
  if (q.includeTotalCount === 'true') body.includeTotalCount = true;
  if (q.fields) body.fields = String(q.fields).split(',');
  if (q.filter) {
    try { body.filter = JSON.parse(q.filter); } catch (e) {}
  }
  if (q.sorts) {
    try { body.sorts = JSON.parse(q.sorts); } catch (e) {}
  }

  if (!process.env.HAP_AUTH_TOKEN) {
    return { success: false, error_msg: 'HAP_AUTH_TOKEN env var not set on Vercel' };
  }

  const response = await fetch(
    `${HAP_API_BASE}/v3/app/worksheets/${wsId}/rows/list`,
    { method: 'POST', headers: buildHeaders(appId), body: JSON.stringify(body) }
  );
  return response.json();
}

async function userInfo() {
  // Live whoami via HAP user/profile endpoint, fallback to static.
  try {
    const response = await fetch(`${HAP_API_BASE}/v3/users/profile`, {
      method: 'GET',
      headers: buildHeaders('d7025492-1b4f-4fda-b6a4-4e8dba471d98'),
    });
    const data = await response.json();
    if (data && data.success && data.data) return data;
  } catch (e) { /* fall through to static */ }
  return {
    success: true,
    data: {
      id: HAP_ACCOUNT_ID,
      name: 'tsz fai',
      email: 'tszfai.kwo****@fujifilm.com',
      avatar: 'https://p1.mingdaoyun.cn/UserAvatar/default2.png?watermark/2/text/dA==/font/5oCd5rqQ6buR5L2T/fontsize/1000/fill/d2hpdGU=/dissolve/100/gravity/Center/dx/0/dy/0/fontstyle/Ym9sZA==%7CimageView2/1/w/100/h/100/q/90',
    },
  };
}

export default async function handler(req, res) {
  const appId = req.query.appId;
  const wsId = req.query.wsId;
  const mode = req.query.mode;

  if (mode === 'user') {
    try {
      const data = await userInfo();
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ success: false, error_msg: err.message });
    }
    return;
  }

  if (!appId || !wsId) {
    return res.status(400).json({ success: false, error_msg: 'Missing appId or wsId' });
  }

  try {
    const data = await rowsList(wsId, appId, req);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, error_msg: err.message });
  }
}
