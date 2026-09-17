# assets/

Coloque aqui os modelos 3D e registre cada um em [`catalogo.json`](catalogo.json).

## Registrar um modelo

1. Exporte o `.glb` (regras de escala abaixo) e salve como `assets/<id>.glb`.
2. Acrescente uma entrada em `catalogo.json`:

```json
{ "id": "cadeira", "nome": "Cadeira Eames", "origem": "local", "alturaM": null }
```

3. O objeto aparece no seletor, e o link direto passa a ser `/?modelo=cadeira`.

O `id` aceita apenas `A-Z a-z 0-9 _ -` (até 64 caracteres) e precisa bater com o nome do arquivo.
Entradas com `id` inválido são descartadas na carga e reportadas no painel de Diagnóstico — isso é
proposital, evita que um nome vindo da URL vire caminho de arquivo arbitrário.

## Campos

| Campo | Obrigatório | O que faz |
|---|---|---|
| `id` | sim | Nome do arquivo e valor de `?modelo=`. |
| `nome` | não | Rótulo no card. Sem ele, usa o `id`. |
| `origem` | não | `"local"` → `./assets/<id>.glb`. Com `glb` preenchido, carrega daquela URL. |
| `glb` | só p/ externo | URL completa do modelo. O servidor precisa mandar `Access-Control-Allow-Origin`. |
| `alturaM` | não | Altura real em metros. `null` (padrão) = usa a escala do próprio arquivo. |
| `usdz` | não | Veja a seção abaixo. |
| `thumb` | não | Imagem do card (`"./assets/cadeira.jpg"`). Sem ela, o card mostra um preview 3D ao vivo. |
| `exemplo` | não | Só marca o card com um selo. Apague essas entradas quando tiver seus modelos. |

## O `.usdz` é opcional

Com `quick-look` no `ar-modes` e **sem** `ios-src`, o `<model-viewer>` **gera o USDZ na hora** quando o
usuário toca no botão de AR. Ou seja: **só o `.glb` já faz o iPhone funcionar.**

Forneça um `.usdz` seu apenas quando quiser fidelidade maior — a geração automática **não suporta
animação**, então modelos animados precisam do arquivo à mão:

```json
{ "id": "cadeira", "usdz": true }        // usa ./assets/cadeira.usdz
{ "id": "cadeira", "usdz": "https://..." } // usa essa URL
```

Não aponte para um `.usdz` que não existe: isso quebra o Quick Look num caso que funcionaria sozinho.

## Requisitos de exportação (para a escala 1:1 bater)

| Item | Valor |
|---|---|
| Unidade | **metros** (1 unidade = 1 metro) |
| Eixo "para cima" | Y+ |
| Origem/pivô | na **base** do objeto, centralizada — é o ponto que encosta na superfície |
| Escala do objeto raiz | aplicada/congelada (`1,1,1`), não herdada |
| Texturas | JPG/PNG embutidos; KTX2 se precisar economizar banda |
| Tamanho alvo | < 10 MB por modelo (celular em 4G) |

Blender: exporte em glTF 2.0 Binary (`.glb`) com *Y up* e escala 1.0.

Um objeto que aparece com tamanho errado em AR quase sempre foi exportado em centímetros ou está com
escala não aplicada no objeto raiz. Confira as dimensões medidas no painel de Diagnóstico: ele mostra a
bounding box real em metros assim que o modelo carrega.

### `alturaM` é uma muleta, não a solução

Preencher `alturaM` força a altura do objeto, útil para modelos de terceiros que vêm em unidades
arbitrárias (é o caso dos exemplos do catálogo). Mas o ajuste vale dentro do `<model-viewer>` e no WebXR;
o **Scene Viewer** do Android carrega o arquivo cru e ignora. Para os seus modelos, exporte em metros e
deixe `alturaM: null` — aí o 1:1 vale em todos os modos.
