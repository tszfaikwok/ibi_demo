// Vercel Serverless Function: proxies HAP V3 API calls.
//
// Credentials are hardcoded for the demo deployment (security TODO: move to env vars).
// Refresh when the session token expires: `hap auth login`, then decrypt via
// hap_cli.core.token_crypto.decrypt_token and paste below.

const HAP_API_BASE = process.env.HAP_API_BASE || 'https://api.mingdao.com';
const HAP_AUTH_TOKEN = '0cb08c0df06a0120c701d0390770eb0e30000280f409903b';
const HAP_ACCOUNT_ID = '68d6380a-31cd-492d-801f-ff1845f87b33';

function buildHeaders(appId) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `md_pss_id ${HAP_AUTH_TOKEN}`,
    'AccountId': HAP_ACCOUNT_ID,
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://www.mingdao.com',
    'Referer': 'https://www.mingdao.com/',
    'User-Agent': 'HAP-CLI/0.9.1',
    'Accept-Language': 'zh-Hans',
    'HAP-Appid': appId,
  };
}

async function rowsList(wsId, appId) {
  // Frontend sends: /api/hap?appId=X&wsId=Y&pageSize=500&fields=...&filter=...
  const body = {
    pageSize: parseInt(req.query.pageSize) || 500,
    pageIndex: parseInt(req.query.pageIndex) || 1,
    responseFormat: req.query.responseFormat || 'json',
    includeSystemFields: req.query.includeSystemFields === 'true',
  };
  if (req.query.includeTotalCount === 'true') body.includeTotalCount = true;
  if (req.query.fields) body.fields = String(req.query.fields).split(',');
  if (req.query.filter) {
    try { body.filter = JSON.parse(req.query.filter); } catch (e) {}
  }
  if (req.query.sorts) {
    try { body.sorts = JSON.parse(req.query.sorts); } catch (e) {}
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
    const data = await rowsList(wsId, appId);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, error_msg: err.message });
  }
}
