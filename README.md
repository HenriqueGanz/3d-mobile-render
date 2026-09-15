# WebAR 1:1 — `<model-viewer>` + GitHub Codespaces

Visualizador de Realidade Aumentada em **escala real (1:1)** com **detecção de
superfície**, feito com o `<model-viewer>` do Google. Sem framework: HTML,
JavaScript puro e um servidor de dev.

O fluxo de teste é: subir para o GitHub → abrir no Codespaces → rodar o servidor
→ **deixar a porta pública** → abrir a URL no celular.

---

## Requisitos do celular

| Plataforma | Requisito | Modo de AR usado |
|---|---|---|
| Android | Chrome + *Google Play Services for AR* (ARCore) instalado | `webxr`, com fallback para `scene-viewer` |
| iOS | iOS 12+ com Safari (ou Chrome iOS) | `quick-look` (precisa do `.usdz`) |

Em **desktop** o modelo aparece e gira, mas o botão de AR **não** é exibido —
isso é o comportamento correto, não é bug. O painel de Diagnóstico no canto
superior da página informa exatamente o que o device suporta.

> AR e acesso à câmera só funcionam em **contexto seguro**: `https://` ou
> `localhost`. A URL do Codespaces é HTTPS, então está coberto.

---

## Passo 1 — Subir o projeto para o GitHub

Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "WebAR 1:1 com model-viewer"
```

Com o [GitHub CLI](https://cli.github.com/):

```bash
gh repo create 3d-mobile-render --private --source=. --push
```

Ou crie o repositório vazio pela interface do GitHub e:

```bash
git remote add origin https://github.com/SEU-USUARIO/3d-mobile-render.git
git branch -M main
git push -u origin main
```

---

## Passo 2 — Abrir no GitHub Codespaces

1. Abra o repositório no github.com.
2. Clique no botão verde **`<> Code ▾`**.
3. Vá na aba **Codespaces**.
4. Clique em **Create codespace on main**.

O VS Code abre no navegador. Na primeira vez o container leva ~1 minuto para
subir e já roda `npm install` sozinho (definido em `.devcontainer/devcontainer.json`).

---

## Passo 3 — Rodar o servidor

No terminal do Codespaces:

```bash
npm install     # pule se o devcontainer já rodou
npm run dev
```

Saída esperada:

```
VITE v8.x.x  ready in 320 ms

➜  Local:   http://localhost:5173/
➜  Network: http://10.0.0.x:5173/
```

Deixe esse terminal rodando. Para abrir outro terminal: `Ctrl+Shift+\``.

---

## Passo 4 — 🚨 [CRÍTICO] Deixar a porta 5173 pública

**Sem este passo o celular recebe uma tela de login do GitHub em vez do seu app.**
Por padrão o Codespaces encaminha a porta como `Private`, e só o seu navegador
autenticado consegue acessá-la.

1. No painel inferior do VS Code, clique na aba **PORTS** (fica ao lado de
   *TERMINAL*, *PROBLEMS* e *OUTPUT*).
   Se a aba não aparecer: `Ctrl+Shift+P` → digite `Ports: Focus on Ports View`.
2. Localize a linha da porta **5173** (rotulada *WebAR Dev Server*).
3. **Clique com o botão direito** em cima dessa linha.
4. No menu de contexto, escolha **Port Visibility** → **Public**.
5. Confirme: a coluna **Visibility** deve mudar de `Private` para **`Public`**.

Alternativa pelo terminal (mesmo efeito):

```bash
gh codespace ports visibility 5173:public -c $CODESPACE_NAME
```

### Por que isso é obrigatório

- O seu celular não está logado na sessão do Codespaces.
- Além da página, o **Scene Viewer** (Android) e o **AR Quick Look** (iOS)
  baixam o `.glb` / `.usdz` **direto dessa URL**, em um processo separado do
  navegador. Se a porta for privada, o modelo não carrega mesmo que a página abra.

> ⚠️ **Atenção:** com a porta `Public`, **qualquer pessoa com o link** acessa o
> seu servidor de dev, sem autenticação. Use só durante o teste e volte para
> `Private` depois (mesmo menu → *Port Visibility* → *Private*).
>
> Em contas corporativas, a política da organização pode bloquear a opção
> `Public` — nesse caso use **`Org`**, que libera para quem está logado na mesma
> organização.

---

## Passo 5 — Pegar a URL e testar no celular

Ainda na aba **PORTS**, passe o mouse sobre a linha da 5173 e clique no ícone de
**cópia** (📋) na coluna *Forwarded Address*. A URL tem este formato:

```
https://<nome-do-seu-codespace>-5173.app.github.dev
```

Exemplo real: `https://fluffy-space-guacamole-97xq5v4-5173.app.github.dev`

### Links de teste

| O que testa | URL |
|---|---|
| Fallback do CDN (funciona sem nenhum arquivo local) | `https://<...>-5173.app.github.dev/` |
| Modelo local `assets/cadeira.glb` + `.usdz` | `https://<...>-5173.app.github.dev/?modelo=cadeira` |
| Modelo local `assets/sofa.glb` + `.usdz` | `https://<...>-5173.app.github.dev/?modelo=sofa` |

Para não digitar essa URL no celular, gere um QR code dela — no terminal do
Codespaces:

```bash
npx --yes qrcode-terminal "https://$CODESPACE_NAME-5173.app.github.dev/"
```

No celular: abra o link → toque em **"Ver no meu espaço"** → aponte a câmera
para o chão e **mova o aparelho devagar** até a superfície ser detectada → toque
para posicionar o modelo.

---

## Como funciona a lógica de modelo dinâmico

O script no `index.html` lê a query string e injeta os caminhos:

```
/?modelo=cadeira   →   src      = ./assets/cadeira.glb
                       ios-src  = ./assets/cadeira.usdz
```

Sem `?modelo=` (ou com um nome inválido), ele carrega o **Astronauta oficial do
Google** direto do CDN — por isso o projeto funciona no primeiro teste, antes de
você subir qualquer asset.

O nome aceita só `[A-Za-z0-9_-]`, o que bloqueia `../` e injeção via URL.

Para adicionar seus modelos: jogue `nome.glb` e `nome.usdz` em `assets/` e
chame `?modelo=nome`. Veja [`assets/README.md`](assets/README.md) para as regras
de exportação.

---

## Sobre a escala 1:1

Duas coisas precisam estar certas ao mesmo tempo:

**1. No código** — já configurado no `index.html`:

```html
ar-scale="fixed"      <!-- trava o 1:1; sem isso o padrão é "auto" e o usuário
                           redimensiona o objeto com a pinça, matando a escala real.
                           Também faz o model-viewer anexar #allowsContentScaling=0
                           na URL do .usdz, para o Quick Look do iOS respeitar. -->
ar-placement="floor"  <!-- ancora em planos horizontais. Use "wall" para
                           quadros, TVs, luminárias de parede. -->
xr-environment        <!-- light estimation: o modelo recebe a luz do ambiente real -->
```

**2. No modelo** — o `.glb` precisa estar **em metros**, com a escala aplicada e
o pivô na base. Um modelo exportado em centímetros aparece 100× maior; um com
escala não aplicada aparece com tamanho aleatório. Detalhes em
[`assets/README.md`](assets/README.md).

Teste de sanidade: coloque o objeto ao lado de algo de tamanho conhecido (uma
porta tem ~2,0 m; uma mesa, ~0,75 m de altura).

---

## Troubleshooting

| Sintoma | Causa e solução |
|---|---|
| Celular abre tela de login do GitHub | A porta está `Private`. Refaça o **Passo 4**. |
| `Blocked request. This host is not allowed` | `server.allowedHosts` do `vite.config.js` não cobre o domínio. Já incluímos `.app.github.dev`; se o seu domínio for outro, adicione-o. |
| Botão "Ver no meu espaço" não aparece | Normal em desktop. No Android, instale o *Google Play Services for AR*. Confira a linha `webxr` no painel de Diagnóstico. |
| Página abre mas a câmera não liga | Contexto inseguro (`http://`) ou permissão de câmera negada. A linha `protocolo` do Diagnóstico fica vermelha nesse caso. |
| `carregamento: FALHOU` | O `.glb` não existe em `assets/`. Confira o nome exato — maiúsculas importam no Linux. |
| Android abre a AR mas sem modelo | O Scene Viewer não conseguiu baixar o `.glb` — quase sempre porta privada. |
| iOS não abre o Quick Look | Falta o `.usdz` com o mesmo nome base do `.glb`. |
| Modelo gigante ou minúsculo | Unidade de exportação errada. Exporte em metros com escala aplicada. |
| URL parou de responder depois de um tempo | O Codespace hiberna após 30 min ociosos. Reabra e rode `npm run dev` de novo — **a visibilidade da porta volta para `Private`**, refaça o Passo 4. |
| Console cheio de erro de WebSocket | HMR do Vite pelo proxy. Não afeta a AR; recarregue a página manualmente. |

---

## Estrutura

```
.
├── index.html                  # página única: model-viewer + lógica de query string + diagnóstico
├── vite.config.js              # host, allowedHosts e HMR ajustados para o Codespaces
├── package.json                # npm run dev / npm start
├── .devcontainer/
│   └── devcontainer.json       # Node 22, npm install automático, porta 5173 encaminhada
└── assets/
    ├── README.md               # regras de nomenclatura e exportação
    ├── nome.glb                # seus modelos (Android)
    └── nome.usdz               # seus modelos (iOS)
```

## Referências

- [model-viewer — documentação de AR](https://modelviewer.dev/docs/index.html#augmentedreality-attributes)
- [WebXR Hit Test / plane detection](https://immersiveweb.dev/)
- [Codespaces — forwarding ports](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
