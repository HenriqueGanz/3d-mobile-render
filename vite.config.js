import { defineConfig } from 'vite';

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
    // de HMR tenta wss://...:5173 e fica reconectando para sempre.
    hmr: { clientPort: 443 }
  },
  // Trata modelos 3D como assets estaticos (relevante ao rodar `vite build`).
  assetsInclude: ['**/*.glb', '**/*.usdz']
});
