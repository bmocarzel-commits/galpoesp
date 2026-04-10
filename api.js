const API = {

  url(endpoint, params = {}) {
    let url = `/.netlify/functions/vista?endpoint=${endpoint}`;
    if (params.pesquisa) url += `&pesquisa=${encodeURIComponent(params.pesquisa)}`;
    if (params.imovel) url += `&imovel=${params.imovel}`;
    return url;
  },

  async listarImoveis(filtros = {}) {
    const pesquisa = JSON.stringify({
      fields: [
        'Codigo', 'Categoria', 'Cidade', 'Bairro',
        'AreaTotal', 'AreaPrivativa', 'ValorLocacao', 'ValorVenda',
        'PeDireito', 'Docas', 'Situacao', 'FotoDestaque'
      ],
      paginacao: { pagina: 1, quantidade: 9 },
      Order: [{ Codigo: 'desc' }]
    });

    try {
      const resp = await fetch(this.url('imoveis/listar', { pesquisa }));
      const text = await resp.text();
      const data = JSON.parse(text);
      return data;
    } catch (err) {
      console.error('Erro:', err);
      return null;
    }
  },

  formatarValor(val) {
    if (!val || val === '0' || val === '') return null;
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) return null;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  },

  formatarArea(val) {
    if (!val || val === '0' || val === '') return null;
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) return null;
    return `${num.toLocaleString('pt-BR')} m²`;
  },

  gerarCardImovel(imovel) {
    const foto = imovel.FotoDestaque || null;
    const preco = this.formatarValor(imovel.ValorLocacao) || this.formatarValor(imovel.ValorVenda) || 'Consultar';
    const area = this.formatarArea(imovel.AreaTotal) || this.formatarArea(imovel.AreaPrivativa) || '—';
    const pe = imovel.PeDireito ? `${imovel.PeDireito}m` : '—';
    const docas = imovel.Docas ? `${imovel.Docas} docas` : '—';
    const categoria = (imovel.Categoria || 'Galpão').replace(/\u00e3/g,'ã').replace(/\u00e3o/g,'ão').replace(/\u00e9/g,'é');
    const cidade = (imovel.Cidade || '').replace(/\u00e3/g,'ã').replace(/\u00e9/g,'é').replace(/\u00e3o/g,'ão');
    const bairro = (imovel.Bairro || '').replace(/\u00e3/g,'ã').replace(/\u00e9/g,'é').replace(/\u00e3o/g,'ão');
    const titulo = `${categoria} — ${bairro || cidade}`;
    const situacao = imovel.Situacao || 'Disponível';

    return `
      <a href="imovel.html?codigo=${imovel.Codigo}" class="imovel-card">
        <div class="imovel-img" style="${foto ? `background-image:url('${foto}');background-size:cover;background-position:center;` : 'background:linear-gradient(135deg,#EBF2FA,#C5D9EE);'}">
          ${!foto ? `<svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <rect x="8" y="30" width="44" height="22" rx="2" fill="#1A3A5C"/>
            <rect x="12" y="18" width="36" height="14" rx="1" fill="#2A5A8C"/>
            <rect x="20" y="32" width="6" height="20" fill="#D4820A"/>
          </svg>` : ''}
          <div class="imovel-badge">${situacao}</div>
        </div>
        <div class="imovel-info">
          <div class="imovel-titulo">${titulo}</div>
          <div class="imovel-local">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="5" r="3" stroke="#888780" stroke-width="1.2"/>
              <path d="M6 8C6 8 2 10.5 2 5a4 4 0 018 0C10 10.5 6 8 6 8z" stroke="#888780" stroke-width="1.2" fill="none"/>
            </svg>
            ${bairro ? bairro + ', ' : ''}${cidade}
          </div>
          <div class="imovel-specs">
            <div class="spec"><div class="spec-val">${area}</div><div class="spec-label">Área total</div></div>
            <div class="spec"><div class="spec-val">${pe}</div><div class="spec-label">Pé-direito</div></div>
            <div class="spec"><div class="spec-val">${docas}</div><div class="spec-label">Docas</div></div>
          </div>
          <div class="imovel-preco">${preco}<small> /mês</small></div>
        </div>
      </a>`;
  },

  async renderizarPortfolio(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">
        <div style="margin-bottom:8px;">Carregando imóveis...</div>
        <div style="width:32px;height:32px;border:3px solid #EBF2FA;border-top-color:#1A3A5C;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;"></div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;

    const data = await this.listarImoveis();

    if (!data) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">Erro ao carregar imóveis.</div>`;
      return;
    }

    // Dados chegam como {"1":{...},"2":{...},...}
    const imoveis = Object.values(data).filter(i => i && i.Codigo);

    if (imoveis.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">
          Nenhum imóvel disponível no momento.<br>
          <a href="https://wa.me/${CONFIG.whatsapp}" target="_blank" style="color:#1A3A5C;font-weight:600;">
            Fale com Denis pelo WhatsApp →
          </a>
        </div>`;
      return;
    }

    container.innerHTML = imoveis.map(i => this.gerarCardImovel(i)).join('');
  },

  async enviarLead(dados) {
    const cadastro = {
      lead: {
        nome:      dados.nome      || '',
        fone:      dados.fone      || dados.whatsapp || '',
        email:     dados.email     || '',
        mensagem:  dados.mensagem  || '',
        veiculo:   dados.origem    || 'Site Galpões SP',
        interesse: dados.interesse || 'Locação',
      }
    };
    if (dados.codigoImovel) cadastro.lead.anuncio = dados.codigoImovel;
    try {
      const resp = await fetch(this.url('leads/cadastro'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `cadastro=${encodeURIComponent(JSON.stringify(cadastro))}`
      });
      return await resp.json();
    } catch (err) {
      console.error('Erro lead:', err);
      return null;
    }
  }
};

async function enviarLeadSite(dados, msgWhats) {
  await API.enviarLead(dados);
  const msg = msgWhats || `Olá Denis! Me chamo ${dados.nome}. ${dados.mensagem}`;
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
}
