// Vercel Serverless Function: proxies HAP API calls.
//
// Required env vars (set in Vercel project settings):
//   HAP_AUTH_TOKEN  - the decrypted HAP session token
//   HAP_ACCOUNT_ID  - your HAP account ID
//
// The function maps frontend query params to the HAP V3 API body.

const HAP_API_BASE = process.env.HAP_API_BASE || 'https://api.mingdao.com';
const HAP_AUTH_TOKEN = '07704d06c0ec09c0440cf0900ec0c10760410dd0ab0640a1';
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

export default async function handler(req, res) {
  // Frontend sends: /api/hap?appId=X&wsId=Y&pageSize=500&responseFormat=json&fields=...&filter=...
  const appId = req.query.appId;
  const wsId = req.query.wsId;

  if (!appId || !wsId) {
    return res.status(400).json({ success: false, error_msg: 'Missing appId or wsId' });
  }

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

  try {
    const response = await fetch(
      `${HAP_API_BASE}/v3/app/worksheets/${wsId}/rows/list`,
      {
        method: 'POST',
        headers: buildHeaders(appId),
        body: JSON.stringify(body),
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ success: false, error_msg: err.message });
  }
}
