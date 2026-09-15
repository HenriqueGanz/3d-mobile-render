# assets/

Coloque aqui os modelos 3D do projeto.

## Regra de nomenclatura

Cada modelo precisa de **dois arquivos com o mesmo nome base**:

```
assets/
├── cadeira.glb    <- Android (WebXR / Scene Viewer)
└── cadeira.usdz   <- iOS (AR Quick Look)
```

A página então é aberta com `?modelo=cadeira`:

```
https://SEU-CODESPACE-5173.app.github.dev/?modelo=cadeira
```

O nome aceita apenas `A-Z a-z 0-9 _ -` (até 64 caracteres). Qualquer outra coisa
é rejeitada e a página cai no modelo de fallback — isso é proposital, evita que
uma query string maliciosa vire caminho de arquivo arbitrário.

Se faltar o `.usdz`, o modelo continua funcionando no Android e no navegador,
mas o botão de AR no iOS falha ao abrir o Quick Look.

## Requisitos de exportação (para a escala 1:1 bater)

| Item | Valor |
|---|---|
| Unidade | **metros** (1 unidade = 1 metro) |
| Eixo "para cima" | Y+ |
| Origem/pivô | na **base** do objeto, centralizada — é o ponto que encosta no chão |
| Escala do objeto raiz | aplicada/congelada (`1,1,1`), não herdada |
| Formato de textura | JPG/PNG embutidos; KTX2 se precisar economizar banda |
| Tamanho alvo | < 10 MB por modelo (celular em 4G) |

Blender: exporte em glTF 2.0 Binary (`.glb`) com *Y up* e escala 1.0. O
`.usdz` pode ser gerado pelo Reality Converter (macOS) ou pelo `usd_from_gltf`.

Um objeto que aparece com metade do tamanho real em AR quase sempre foi
exportado em centímetros ou tem escala não aplicada no objeto raiz.
