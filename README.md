# Sanlogica — painel do vendedor (GitHub Pages)

Página estática para o vendedor consultar no celular: nome, data de instalação (`DataCadastro`), último acesso (`DataUltimoAcesso`), ativo/inativo e link de pagamento — mesmos dados do nó `Cliente` do **Firebase Realtime Database** usado pelo Gestor Sanlogica.

## 1. Configurar o Firebase (uma vez)

1. No [Console Firebase](https://console.firebase.google.com/), projeto **sanlogica-clientes** (ou o que você usar).
2. **Authentication** → método **E-mail/senha** → ativar.  
   - Crie **apenas** as contas que devem acessar (você e o vendedor).  
   - Desative **cadastro** público se a opção existir no fluxo (evita qualquer pessoa criar conta).
3. **Realtime Database** → **Regras** — o objetivo é **ninguém ler `Cliente` sem login**; o painel usa Firebase Auth.

Exemplo **somente leitura** para você e o vendedor (substitua os UIDs em Authentication → usuário). Em **`.write`** mantenha o que o Gestor desktop já precisa hoje — muitas vezes é algo permissivo; se você copiar `.write` errado o ERP pode parar de salvar.

```json
{
  "rules": {
    "Cliente": {
      ".read": "auth != null && (auth.uid === 'UID_VOCE_AQUI' || auth.uid === 'UID_VENDEDOR_AQUI')",
      ".write": true
    }
  }
}
```

**Aviso:** `.write": true` permite gravação ampla (como em projetos legados). O ganho de segurança aqui é **`.read`** só para quem fez login na página + UIDs corretos. Quando quiser endurecer escrita, será preciso alinhar com como o desktop autentica no Firebase.

Se as suas regras atuais já têm outros nós (`Atualizacao`, telemetria, etc.), **não apague** — só altere o bloco `"Cliente"` ou use `".read"`/`".write"` compatíveis com o restante.

4. **Authentication** → **Configurações do projeto** → **Domínios autorizados** → adicione o domínio do GitHub Pages, por exemplo:  
   `seudono.github.io`

## 2. Preencher `js/firebase-config.js`

No console: **Configurações do projeto** → **Seus apps** → app Web → copie o objeto `firebaseConfig` e cole em `window.__SANLOGICA_FIREBASE_CONFIG.firebase`.

Opcional: em `allowedAuthUids`, coloque os dois UIDs (`["uid1","uid2"]`) e mantenha as regras alinhadas.

## 3. Publicar no GitHub Pages

### 3.1 Se você nunca usou GitHub (passo a passo)

1. **Crie uma conta** em [github.com](https://github.com/signup) (grátis), confirme o e-mail se pedirem.

2. **Crie o repositório vazio no site**  
   - Faça login → botão verde **New** (ou **+** → **New repository**).  
   - **Repository name:** por exemplo `sanlogica-vendedor` (só letras minúsculas, números e hífen).  
   - Deixe **Public** (Pages grátis é mais simples assim) ou **Private** se sua conta permitir Pages em repo privado.  
   - **Não** marque “Add a README” nem “Add .gitignore” — o projeto já tem arquivos aqui no PC.  
   - Clique **Create repository**.

3. **Abra o Git Bash ou um novo PowerShell** (importante depois de instalar o Git; feche e abra o terminal se já estava aberto). Confira com `git --version`.

4. **Envie o projeto pela primeira vez** (troque `SEU_USUARIO` e `NOME_DO_REPO` pelo que apareceu na página do GitHub após criar o repo — lá costuma mostrar os comandos).

   **Neste computador o Git já foi inicializado e o primeiro commit já existe** na pasta `c:\Projetos\sanlogica-vendedor-gitpages`. Então você só precisa do `remote` e do `push` (use um terminal **novo** para o comando `git` ser reconhecido):

```powershell
cd "c:\Projetos\sanlogica-vendedor-gitpages"

git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

   Se aparecer erro **remote origin already exists**, use:

```powershell
git remote set-url origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

   Se preferir fazer tudo do zero em outra máquina, use o fluxo completo:

```powershell
cd "c:\Projetos\sanlogica-vendedor-gitpages"

git init
git branch -M main
git add .
git commit -m "Primeira versão do painel vendedor"

git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

5. **Login na hora do `git push`**  
   O GitHub **não aceita mais senha da conta** por esse comando. Ao pedir credenciais:
   - Abra: [github.com/settings/tokens](https://github.com/settings/tokens) → **Fine-grained tokens** ou **Classic** → crie um token com permissão de **repositório** (ler/escrever no repo que você criou).
   - Quando o Git pedir **Password**, cole o **token** (não a senha do GitHub).  
   Ou use o **Git Credential Manager** que veio com o Git for Windows: ele pode abrir o navegador para você autorizar.

6. **Ativar o GitHub Pages**  
   No GitHub: abra o repositório → **Settings** (aba do repo) → menu lateral **Pages**.  
   Em **Build and deployment** → **Source**: **Deploy from a branch**.  
   **Branch:** `main` e pasta **`/ (root)`** → **Save**.  
   Em até alguns minutos o site aparece em:

   `https://SEU_USUARIO.github.io/NOME_DO_REPO/`

   (o nome do repo entra no endereço — por isso escolha um nome curto se quiser URL fácil de digitar no celular.)

7. **Firebase** → Authentication → domínios autorizados → adicione exatamente: `SEU_USUARIO.github.io`

### 3.2 Atualizar o site depois de mudar arquivos

Na pasta do projeto:

```powershell
git add .
git commit -m "Descreva a mudança"
git push
```

O Pages atualiza sozinho em poucos minutos.

### 3.3 Resumo rápido (quem já sabe Git)

1. Repo novo **sem** README inicial.  
2. `git init`, `git add .`, `git commit`, `remote`, `push` na branch `main`.  
3. **Settings → Pages** → branch `main`, pasta `/ (root)`.

## 4. Repositório público e segredo

`apiKey` do Firebase em app web **não** é segredo sozinha: a proteção são **Authentication** + **Database Rules**. Mesmo assim, evite expor repositório público com dados sensíveis; prefira repo **privado** se possível.

## Arquivos

| Arquivo | Função |
|---------|--------|
| `index.html` | Login + lista |
| `css/style.css` | Layout responsivo |
| `js/app.js` | Auth + leitura de `Cliente` |
| `js/firebase-config.js` | Config (você preenche) |
| `js/firebase-config.example.js` | Modelo |
