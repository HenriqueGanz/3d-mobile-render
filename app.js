'use strict';

/* Seletor de objetos + visualizador AR 1:1.
   O <model-viewer> carrega UM modelo por vez: trocar de objeto acontece
   fora da sessao de AR (escolher -> ver no espaco -> sair -> escolher outro). */

// Só nomes simples: bloqueia path traversal (../) e injecao via query string.
const NOME_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;

const app       = document.getElementById('app');
const viewer    = document.getElementById('viewer');
const lista     = document.getElementById('lista');
const contador  = document.getElementById('contador');

let itens = [];
let atual = null;

// Fator de escala ja medido, por URL de modelo. Evita a medicao em duas fases
// quando o mesmo objeto e selecionado de novo.
const fatores = new Map();

// Contador de selecao: aborta uma troca em andamento se o usuario clicar em
// outro card no meio do caminho.
let geracao = 0;

/* ----------------------------- diagnostico ----------------------------- */
const set = (id, texto, classe) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className = classe || '';
};

const abrirDiag = () => { document.getElementById('diag').open = true; };

/* ----------------------------- catalogo ----------------------------- */

/** Normaliza uma entrada crua do catalogo.json. Devolve null se for invalida. */
function resolver(bruto) {
  if (!bruto || typeof bruto !== 'object') return null;

  const id = String(bruto.id ?? '');
  if (!NOME_VALIDO.test(id)) return null;

  // Sem "glb" declarado, assume-se modelo local em ./assets/<id>.glb
  const local = bruto.origem === 'local' || !bruto.glb;
  const glb = local ? `./assets/${id}.glb` : String(bruto.glb);

  // usdz: true  -> ./assets/<id>.usdz
  // usdz: "url" -> usa a url
  // ausente     -> NAO seta ios-src; o model-viewer gera o USDZ na hora
  let usdz = null;
  if (bruto.usdz === true && local) usdz = `./assets/${id}.usdz`;
  else if (typeof bruto.usdz === 'string' && bruto.usdz) usdz = bruto.usdz;

  const alturaM = typeof bruto.alturaM === 'number' && bruto.alturaM > 0
    ? bruto.alturaM
    : null;

  return {
    id, glb, usdz, alturaM, local,
    nome: String(bruto.nome || id),
    thumb: typeof bruto.thumb === 'string' ? bruto.thumb : null,
    exemplo: bruto.exemplo === true,
    avulso: false
  };
}

async function carregarCatalogo() {
  const resposta = await fetch('./assets/catalogo.json', { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em assets/catalogo.json`);
  const dados = await resposta.json();
  const brutos = Array.isArray(dados.itens) ? dados.itens : [];
  const validos = brutos.map(resolver).filter(Boolean);
  const descartados = brutos.length - validos.length;
  if (descartados > 0) set('d-catalogo', `${validos.length} itens (${descartados} descartados: id inválido)`, 'warn');
  else set('d-catalogo', `${validos.length} itens`);
  return validos;
}

/* ----------------------------- cards ----------------------------- */

function criarThumb(item) {
  if (item.thumb) {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = item.thumb;
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }

  // Sem imagem declarada: preview 3D ao vivo, carregado so quando entra na tela.
  const mv = document.createElement('model-viewer');
  mv.className = 'thumb';
  mv.setAttribute('src', item.glb);
  mv.setAttribute('loading', 'lazy');
  mv.setAttribute('reveal', 'auto');
  mv.setAttribute('environment-image', 'neutral');
  mv.setAttribute('shadow-intensity', '0.6');
  mv.setAttribute('interaction-prompt', 'none');
  mv.setAttribute('camera-orbit', '35deg 72deg auto');
  mv.setAttribute('alt', '');
  return mv;
}

function criarCard(item) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'card';
  card.dataset.id = item.id;
  card.setAttribute('aria-pressed', 'false');

  card.append(criarThumb(item));

  const texto = document.createElement('span');

  const nome = document.createElement('span');
  nome.className = 'nome';
  nome.textContent = item.nome;
  texto.append(nome);

  if (item.alturaM) {
    const medida = document.createElement('span');
    medida.className = 'medida';
    medida.textContent = `${(item.alturaM * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`;
    texto.append(medida);
  }

  if (item.exemplo || item.avulso) {
    const selo = document.createElement('span');
    selo.className = 'selo';
    selo.textContent = item.avulso ? 'via URL' : 'exemplo';
    texto.append(selo);
  }

  card.append(texto);
  card.addEventListener('click', () => selecionar(item));
  return card;
}

function renderizarLista() {
  lista.replaceChildren(...itens.map(criarCard));
  contador.textContent = itens.length === 1 ? '1 objeto' : `${itens.length} objetos`;
}

function mostrarCatalogoVazio(motivo) {
  const aviso = document.createElement('p');
  aviso.className = 'vazio';
  aviso.innerHTML =
    `Catálogo vazio: ${motivo}<br><br>` +
    `Registre seus modelos em <code>assets/catalogo.json</code> ` +
    `e coloque os arquivos <code>.glb</code> em <code>assets/</code>.`;
  lista.replaceChildren(aviso);
  contador.textContent = '0 objetos';
}

/* ----------------------------- selecao ----------------------------- */

function selecionar(item, { atualizarUrl = true } = {}) {
  const meu = ++geracao;
  atual = item;

  for (const card of lista.querySelectorAll('.card')) {
    card.setAttribute('aria-pressed', String(card.dataset.id === item.id));
  }

  // Sem ios-src, o model-viewer gera o USDZ na hora ao entrar no Quick Look.
  // Setar um caminho que nao existe quebraria a AR no iPhone.
  if (item.usdz) viewer.setAttribute('ios-src', item.usdz);
  else viewer.removeAttribute('ios-src');

  viewer.alt = `${item.nome} em escala real`;

  set('d-item', `${item.nome} (${item.id})`);
  set('d-origem', item.local ? 'local — ./assets/' : 'CDN externo');
  set('d-usdz', item.usdz || 'sem ios-src — USDZ gerado na hora', item.usdz ? '' : 'ok');
  set('d-load', 'carregando…');
  set('d-dims', '—');
  set('d-escala', '—');

  if (atualizarUrl) {
    const url = new URL(location.href);
    url.searchParams.set('modelo', item.id);
    history.replaceState(null, '', url);
  }

  // Ja medido antes: aplica o fator direto, num unico carregamento.
  const fator = item.alturaM ? (fatores.get(item.glb) ?? 1) : 1;
  return trocarModelo(item.glb, fator, meu);
}

const proximoFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));

/**
 * Troca o modelo descarregando antes de mexer em `scale`.
 *
 * Alterar `scale` com um modelo ja carregado dispara uma excecao interna do
 * model-viewer (regressao presente da 4.2.0 em diante; a 4.1.0 nao tem).
 * A escala chega a ser aplicada, mas o erro polui o console e interrompe o
 * ciclo de update da lib no meio. Definir `scale` com o viewer vazio evita isso.
 */
async function trocarModelo(glb, fator, meu) {
  viewer.src = null;
  await proximoFrame();
  if (meu !== geracao) return;

  viewer.setAttribute('scale', `${fator} ${fator} ${fator}`);
  await proximoFrame();
  if (meu !== geracao) return;

  viewer.src = glb;
}

/** Formata um numero de metros sem zeros sobrando. */
const emMetros = n => `${n.toFixed(3)}`.replace(/\.?0+$/, '');

/**
 * Mede o modelo recem-carregado. Na primeira vez que um item com `alturaM`
 * aparece, o que foi carregado esta em tamanho nativo: guarda o fator e manda
 * recarregar ja escalado. Nas vezes seguintes o fator vem do cache.
 */
async function medirEEscalar() {
  const item = atual;
  const meu = geracao;
  if (!item) return;

  let d = null;
  try { d = viewer.getDimensions(); } catch { /* modelo ainda nao pronto */ }

  if (!d || !(d.y > 0)) {
    set('d-dims', 'indisponível', 'warn');
    return;
  }

  const medida = `${emMetros(d.x)} x ${emMetros(d.y)} x ${emMetros(d.z)} m`;

  if (!item.alturaM) {
    set('d-dims', medida);
    set('d-escala', 'nativa — modelo já em metros', 'ok');
    return;
  }

  const fator = fatores.get(item.glb);
  if (fator !== undefined) {
    set('d-dims', medida);
    set('d-escala', `normalizada p/ ${item.alturaM} m (fator ${fator.toFixed(3)})`, 'warn');
    return;
  }

  // Primeira medicao: o que esta na tela e o tamanho nativo do arquivo.
  const novo = item.alturaM / d.y;
  fatores.set(item.glb, novo);
  set('d-dims', `${medida} (nativo)`);
  set('d-escala', 'reaplicando escala…');
  await trocarModelo(item.glb, novo, meu);
}

/* ----------------------------- eventos ----------------------------- */

viewer.addEventListener('load', () => {
  set('d-load', 'modelo carregado', 'ok');
  set('d-canar', viewer.canActivateAR ? 'disponível' : 'indisponível neste device',
                 viewer.canActivateAR ? 'ok' : 'warn');
  medirEEscalar();
});

viewer.addEventListener('error', event => {
  if (!viewer.src) return;   // descarregar durante a troca nao e falha
  const tipo = event.detail?.type || 'desconhecido';
  set('d-load', `FALHOU (${tipo}) — confira se ${atual ? atual.glb : 'o arquivo'} existe`, 'err');
  abrirDiag();
});

// session-started | object-placed | failed | not-presenting
viewer.addEventListener('ar-status', event => {
  const s = event.detail.status;
  set('d-arstatus', s, s === 'failed' ? 'err' : s === 'object-placed' ? 'ok' : '');
  app.classList.toggle('em-ar', s === 'session-started' || s === 'object-placed');
});

// tracking | not-tracking — feedback da leitura de superficie
viewer.addEventListener('ar-tracking', event => {
  const t = event.detail.status;
  set('d-tracking', t, t === 'tracking' ? 'ok' : 'warn');
});

/* ----------------------------- ambiente ----------------------------- */

function checarAmbiente() {
  const seguro = location.protocol === 'https:' ||
                 ['localhost', '127.0.0.1'].includes(location.hostname);
  set('d-proto', `${location.protocol}${seguro ? ' (contexto seguro)' : ' — AR exige HTTPS!'}`,
      seguro ? 'ok' : 'err');

  if (navigator.xr?.isSessionSupported) {
    navigator.xr.isSessionSupported('immersive-ar')
      .then(ok => set('d-webxr', ok ? 'immersive-ar suportado' : 'immersive-ar indisponível',
                                 ok ? 'ok' : 'warn'))
      .catch(e => set('d-webxr', `erro: ${e.message}`, 'err'));
  } else {
    set('d-webxr', 'navigator.xr ausente (normal em desktop e iOS)', 'warn');
  }
}

/* ----------------------------- boot ----------------------------- */

async function iniciar() {
  checarAmbiente();

  try {
    itens = await carregarCatalogo();
  } catch (erro) {
    set('d-catalogo', `falhou: ${erro.message}`, 'err');
    mostrarCatalogoVazio(erro.message);
    abrirDiag();
    return;
  }

  // ?modelo=<id> pode apontar para um item do catalogo ou, por compatibilidade,
  // direto para um .glb em assets/ que ainda nao foi registrado no JSON.
  const pedido = new URLSearchParams(location.search).get('modelo');
  let inicial = null;

  if (pedido) {
    inicial = itens.find(i => i.id === pedido) || null;

    if (!inicial && NOME_VALIDO.test(pedido)) {
      inicial = resolver({ id: pedido, origem: 'local' });
      inicial.avulso = true;
      itens = [inicial, ...itens];
      set('d-aviso', `"${pedido}" não está no catálogo — carregado direto de ./assets/`, 'warn');
    } else if (!inicial) {
      set('d-aviso', `"${pedido}" rejeitado: use apenas [A-Za-z0-9_-]`, 'warn');
    }
  }

  if (!itens.length) {
    mostrarCatalogoVazio('nenhum item válido em assets/catalogo.json');
    return;
  }

  renderizarLista();
  selecionar(inicial || itens[0], { atualizarUrl: Boolean(inicial) });
}

iniciar();
