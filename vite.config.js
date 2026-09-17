import { cp } from 'node:fs/promises';
import { defineConfig } from 'vite';

// O Vite so empacota o que e importado pelo codigo. Os modelos e o catalogo sao
// buscados em runtime por caminho relativo, entao precisam ser copiados a mao —
// sem isto o `npm run preview` (e qualquer deploy estatico) sobe sem catalogo.
const copiarAssets = {
  name: 'copiar-assets',
  apply: 'build',
  closeBundle: () => cp('assets', 'dist/assets', { recursive: true })
};

export default defineConfig({
  // Site estatico, nao SPA: sem esta linha o Vite responde index.html (HTTP 200)
  // para um ./assets/nome.glb inexistente, e o erro vira "GLB corrompido" em vez de 404.
  appType: 'mpa',

  server: {
    // Escuta em 0.0.0.0 — sem isto o Codespaces nao detecta nem encaminha a porta.
    host: true,
    port: 5173,
    // Porta fixa: se 5173 estiver ocupada, falha em vez de pular para 5174
    // (a URL publica do Codespaces tem a porta no nome do host).
    strictPort: true,
    // Sem isto o Vite responde "Blocked request. This host is not allowed"
    // para o dominio de port forwarding do Codespaces.
    allowedHosts: ['.app.github.dev', '.github.dev'],
    // O proxy do Codespaces serve em HTTPS na 443; sem este ajuste o cliente
    // de HMR tenta wss://...:5173 e fica reconectando para sempre. Fora do
    // Codespaces mantem o padrao, senao o HMR quebra ao rodar local.
    hmr: process.env.CODESPACES ? { clientPort: 443 } : true
  },
  // Trata modelos 3D como assets estaticos (relevante ao rodar `vite build`).
  assetsInclude: ['**/*.glb', '**/*.usdz'],

  plugins: [copiarAssets],

  // Os bundles vao para dist/bundle/ para nao disputar a pasta dist/assets/
  // com os modelos copiados acima.
  build: { assetsDir: 'bundle' }
});
