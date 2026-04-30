# Sanlogica — painel do vendedor (GitHub Pages)

Página estática para o vendedor consultar no celular: nome, data de instalação (`DataCadastro`), último acesso (`DataUltimoAcesso`), ativo/inativo e link de pagamento — mesmos dados do nó `Cliente` do **Firebase Realtime Database** usado pelo Gestor Sanlogica.

## 1. Firebase — sem tela de login

Esta página abre e já lista os clientes (igual à ideia do Gestor no desktop). Para funcionar, o **Realtime Database** precisa permitir **leitura do nó `Cliente` sem usuário logado** — em geral o mesmo tipo de regra que já permite o ERP ler/gravar com a chave que você usa no sistema.

**Segurança:** qualquer pessoa que descobrir o link do GitHub Pages poderá ver nome, datas, link de pagamento, etc. A “proteção” passa a ser só o URL não ser público; não há senha na página.

Se as suas regras atuais já expõem `Cliente` para o app desktop, muitas vezes **não precisa mudar nada**. Se aparecer erro de permissão no navegador, em **Realtime Database → Regras** o bloco `Cliente` precisa de `.read` liberado para anônimo (exemplo mínimo — ajuste o `.write` ao que o Gestor exige):

```json
{
  "rules": {
    "Cliente": {
      ".read": true,
      ".write": true
    }
  }
}
```

Mescla com os outros nós que você já tiver (`Atualizacao`, telemetria, etc.); não apague regras de outros caminhos sem revisar.

Opcional: **Authentication → Domínios autorizados** pode incluir `seudono.github.io` se o console reclamar de domínio (para Database costuma ser menos crítico que para Auth).

## 2. Preencher `js/firebase-config.js`

O site **não usa mais o SDK JavaScript** do Firebase (evita travamento no GitHub Pages). Ele lê os dados com **`fetch`** na API REST:  
`GET {databaseURL}/Cliente.json`

O campo **obrigatório** para funcionar é **`databaseURL`** do Realtime Database (o mesmo do Gestor). Os outros campos (`apiKey`, etc.) podem permanecer para referência futura.

Em **Authentication → Domínios autorizados**, mantenha o domínio do Pages (ex.: `rodode.github.io`) para o navegador conseguir falar com o banco (CORS).

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

7. **(Opcional)** Se o Firebase mostrar aviso de domínio, em **Authentication → Domínios autorizados** adicione `SEU_USUARIO.github.io`.

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

## 4. Personalizar a URL do site

- **Nome curto no GitHub:** a URL de projeto é `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`. Quanto **mais curto** o `NOME_DO_REPOSITORIO`, mais fácil de digitar no celular (ex.: `sl-v` em vez de `sanlogica-vendedor`). Renomear o repo: **Settings → General → Repository name**.
- **Domínio próprio:** em **Settings → Pages → Custom domain**, você pode apontar algo como `clientes.suaempresa.com.br`. Isso exige comprar/configurar DNS no seu provedor de domínio (tutorial oficial do GitHub em [Pages custom domain](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)). Depois adicione esse domínio em **Firebase → Authentication → Domínios autorizados** se usar recursos que validem domínio.
- **Encurtador:** serviços tipo `bit.ly` ou redirect no seu site só criam um link curto que redireciona para o GitHub Pages.

## 5. Repositório público

`apiKey` no front não substitui boas **Database Rules**. Como não há login nesta página, quem tiver o link do site e regras permissivas em `Cliente` enxerga os dados. Repo **privado** no GitHub não esconde o site publicado no Pages.

## Arquivos

| Arquivo | Função |
|---------|--------|
| `index.html` | Página + lista |
| `css/style.css` | Layout responsivo |
| `js/app.js` | Leitura de `Cliente`, copiar link |
| `js/firebase-config.js` | Config (você preenche) |
| `js/firebase-config.example.js` | Modelo |
