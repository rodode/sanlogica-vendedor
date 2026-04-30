/**
 * Copie este arquivo a partir de firebase-config.example.js e preencha com os dados do
 * Console Firebase → Configurações do projeto → Seus apps → Web.
 *
 * allowedAuthUids: deixe [] para permitir qualquer usuário autenticado (desative cadastro
 * público no Firebase Auth). Ou cole os UIDs exatos de você e do vendedor e use as regras
 * do README com a mesma lista.
 */
window.__SANLOGICA_FIREBASE_CONFIG = {
  firebase: {
    apiKey: "SUBSTITUA_PELA_WEB_API_KEY",
    authDomain: "sanlogica-clientes.firebaseapp.com",
    databaseURL: "https://sanlogica-clientes-default-rtdb.firebaseio.com",
    projectId: "sanlogica-clientes",
    storageBucket: "sanlogica-clientes.appspot.com",
    messagingSenderId: "SUBSTITUA",
    appId: "SUBSTITUA",
  },
  allowedAuthUids: [],
};
