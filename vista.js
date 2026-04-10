const https = require('https');
const http = require('http');
const url = require('url');

exports.handler = async function(event) {
  const chave = 'fdb28fa3ed1828a14aee752c140dea55';
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const endpoint = event.queryStringParameters?.endpoint || 'imoveis/listar';
  const pesquisa = event.queryStringParameters?.pesquisa || '';
  const imovel = event.queryStringParameters?.imovel || '';

  // Tenta HTTPS primeiro, depois HTTP
  const tentarUrl = async (protocolo) => {
    const base = `${protocolo}://dncconsu-rest.vistahost.com.br`;
    let targetUrl = `${base}/${endpoint}?key=${chave}`;
    if (pesquisa) targetUrl += `&pesquisa=${pesquisa}`;
    if (imovel) targetUrl += `&imovel=${imovel}`;

    console.log(`Tentando: ${targetUrl}`);

    const lib = protocolo === 'https' ? https : http;

    return new Promise((resolve, reject) => {
      const req = lib.get(targetUrl, {
        headers: { 'Accept': 'application/json' },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ ok: true, data, status: res.statusCode }));
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });

      if (event.httpMethod === 'POST' && event.body) {
        req.write(event.body);
      }
      req.end();
    });
  };

  // Tenta HTTPS primeiro
  try {
    const result = await tentarUrl('https');
    console.log('HTTPS funcionou! Status:', result.status);
    return { statusCode: 200, headers, body: result.data };
  } catch (errHttps) {
    console.log('HTTPS falhou:', errHttps.message, '— tentando HTTP...');
  }

  // Fallback para HTTP
  try {
    const result = await tentarUrl('http');
    console.log('HTTP funcionou! Status:', result.status);
    return { statusCode: 200, headers, body: result.data };
  } catch (errHttp) {
    console.error('Ambos falharam:', errHttp.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        erro: 'Não foi possível conectar ao Vista CRM',
        detalhes: errHttp.message
      })
    };
  }
};
