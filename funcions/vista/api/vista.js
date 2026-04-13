export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const chave = 'fdb28fa3ed1828a14aee752c140dea55';
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (request.method === 'OPTIONS') return new Response('', { status: 200, headers: corsHeaders });
  const endpoint = url.searchParams.get('endpoint') || 'imoveis/listar';
  const pesquisa = url.searchParams.get('pesquisa') || '';
  const imovel = url.searchParams.get('imovel') || '';
  let targetUrl = `https://dncconsu-rest.vistahost.com.br/${endpoint}?key=${chave}`;
  if (pesquisa) targetUrl += `&pesquisa=${pesquisa}`;
  if (imovel) targetUrl += `&imovel=${imovel}`;
  try {
    const resp = await fetch(targetUrl, { headers: { 'Accept': 'application/json' } });
    const data = await resp.text();
    return new Response(data, { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ erro: err.message }), { status: 500, headers: corsHeaders });
  }
}
