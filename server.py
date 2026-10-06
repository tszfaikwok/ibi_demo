#!/usr/bin/env python3
"""Local proxy server for HAP frontend - serves static files and proxies API calls."""

import sys
import os
import json
from pathlib import Path

sys.path.insert(0, r'C:\Python314\Lib\site-packages')

from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.')

def get_session():
    """Load CLI session from config."""
    from hap_cli.core.session import Session
    from hap_cli.core.token_crypto import decrypt_token

    cfg_path = Path.home() / '.hap-cli' / 'config.json'
    if not cfg_path.exists():
        return None

    with open(cfg_path) as f:
        cfg = json.load(f)

    profile = cfg.get('profiles', {}).get(cfg.get('active_profile', 'prod'), {})
    token = decrypt_token(profile.get('auth_token', ''))
    if not token:
        return None

    s = Session()
    s.auth_token = token
    s.account_id = profile.get('account_id', '')
    s.login_url = profile.get('login_url', 'https://www.mingdao.com')
    s.service_endpoints = profile.get('service_endpoints', {})
    return s

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/proxy/rest/app/<app_id>/worksheet/<ws_id>/record', methods=['GET', 'POST'])
def proxy_records(app_id, ws_id):
    """Proxy record list requests from frontend."""
    session = get_session()
    if not session:
        return jsonify({'success': False, 'error_msg': 'Auth token unavailable'}), 500

    page_size = request.args.get('pageSize', 500, type=int)
    page_index = request.args.get('pageIndex', 1, type=int)
    response_format = request.args.get('responseFormat', 'json')
    include_system = request.args.get('includeSystemFields', 'false').lower() == 'true'
    include_total = request.args.get('includeTotalCount', 'false').lower() == 'true'

    body = {
        'pageSize': page_size,
        'pageIndex': page_index,
        'responseFormat': response_format,
        'includeSystemFields': include_system,
    }
    if include_total:
        body['includeTotalCount'] = True

    filter_str = request.args.get('filter') or (request.get_json(silent=True) or {}).get('filter')
    if filter_str:
        try:
            body['filter'] = json.loads(filter_str)
        except:
            pass

    fields_str = request.args.get('fields')
    if fields_str:
        body['fields'] = fields_str.split(',')

    sorts_str = request.args.get('sorts')
    if sorts_str:
        try:
            body['sorts'] = json.loads(sorts_str)
        except:
            pass

    try:
        result = session.v3_call(
            'POST',
            '/v3/app/worksheets/{worksheet_id}/rows/list',
            app_id=app_id,
            body=body,
            path_params={'worksheet_id': ws_id},
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error_msg': str(e)}), 500

@app.route('/proxy/rest/app/<app_id>/user/info', methods=['GET'])
def proxy_user_info(app_id):
    """Return user info."""
    return jsonify({
        'success': True,
        'data': {
            'id': '68d6380a-31cd-492d-801f-ff1845f87b33',
            'name': 'tsz fai',
            'email': 'tszfai.kwo****@fujifilm.com',
            'avatar': 'https://p1.mingdaoyun.cn/UserAvatar/default2.png?watermark/2/text/dA==/font/5oCd5rqQ6buR5L2T/fontsize/1000/fill/d2hpdGU=/dissolve/100/gravity/Center/dx/0/dy/0/fontstyle/Ym9sZA==%7CimageView2/1/w/100/h/100/q/90',
        }
    })

@app.route('/proxy<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy_any(path):
    """Generic proxy for other HAP endpoints."""
    session = get_session()
    if not session:
        return jsonify({'success': False, 'error_msg': 'Auth token unavailable'}), 500

    data = None
    if request.method in ['POST', 'PUT']:
        data = request.get_json(silent=True)

    try:
        result = session.v3_call(
            request.method,
            f'/{path}',
            app_id=None,
            body=data,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error_msg': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print(f'Starting proxy server on http://localhost:{port}')
    app.run(host='0.0.0.0', port=port, debug=False)
