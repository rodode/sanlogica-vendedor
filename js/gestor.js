(function () {
  "use strict";

  var AUTH_LOGIN = "sanlogica";
  var AUTH_PASS_SHA256 = "1ad5c239b2a1c8f9cfbf94dab6668d59300c0a4c7e36a91485555f176e8946dd";
  var SESSION_KEY = "sanlogica_gestor_session";

  var screenLogin = document.getElementById("screen-login");
  var screenApp = document.getElementById("screen-app");
  var formLogin = document.getElementById("form-login");
  var loginError = document.getElementById("login-error");
  var loadStatus = document.getElementById("load-status");
  var loadError = document.getElementById("load-error");
  var actionStatus = document.getElementById("action-status");
  var filterEl = document.getElementById("filter");
  var rowCountEl = document.getElementById("row-count");
  var gridBody = document.getElementById("grid-body");
  var btnSair = document.getElementById("btn-sair");

  var clientRows = [];
  var rtDbBaseUrl = "";
  var apiKey = "";

  function sha256(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) {
          return b.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function showLoginError(msg) {
    loginError.hidden = false;
    loginError.textContent = msg;
  }

  function showApp() {
    screenLogin.hidden = true;
    screenApp.hidden = false;
    loadClients();
  }

  function showLogin() {
    screenApp.hidden = true;
    screenLogin.hidden = false;
    if (gridBody) gridBody.innerHTML = "";
    clientRows = [];
  }

  formLogin.addEventListener("submit", function (ev) {
    ev.preventDefault();
    loginError.hidden = true;
    var login = (document.getElementById("login").value || "").trim().toLowerCase();
    var password = document.getElementById("password").value || "";
    sha256(password)
      .then(function (hash) {
        if (login === AUTH_LOGIN && hash === AUTH_PASS_SHA256) {
          sessionStorage.setItem(SESSION_KEY, AUTH_PASS_SHA256);
          document.getElementById("password").value = "";
          showApp();
          return;
        }
        showLoginError("Login ou senha incorretos.");
      })
      .catch(function () {
        showLoginError("Não foi possível validar a senha neste navegador.");
      });
  });

  btnSair.addEventListener("click", function () {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });

  function hideLoading() {
    if (loadStatus) loadStatus.hidden = true;
  }

  function showInitError(msg) {
    hideLoading();
    if (loadError) {
      loadError.hidden = false;
      loadError.textContent = msg;
    }
  }

  function setActionStatus(msg, isError) {
    if (!actionStatus) return;
    actionStatus.hidden = !msg;
    actionStatus.textContent = msg || "";
    actionStatus.style.color = isError ? "var(--bad)" : "var(--ok)";
  }

  function pick(obj, a, b) {
    if (obj == null) return "";
    var v = obj[a];
    if (v !== undefined && v !== null) return v;
    v = obj[b];
    if (v !== undefined && v !== null) return v;
    return "";
  }

  function parseDate(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number") return new Date(value);
    var d = new Date(value);
    if (isNaN(d.getTime()) || d.getFullYear() < 1900) return null;
    return d;
  }

  function formatDate(value) {
    var d = parseDate(value);
    if (!d) return "—";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatBoolAtivo(value) {
    return value === true || value === "true" || value === 1;
  }

  function formatDocumento(value) {
    var d = String(value || "").replace(/\D/g, "");
    if (d.length === 14) {
      return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
    if (d.length === 11) {
      return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }
    return String(value || "").trim() || "—";
  }

  function clienteLiberado(row) {
    return row.ativo === true;
  }

  function toLocalIso(d) {
    function pad(n, len) {
      var s = String(n);
      var size = len || 2;
      while (s.length < size) s = "0" + s;
      return s;
    }
    var offMin = -d.getTimezoneOffset();
    var sign = offMin >= 0 ? "+" : "-";
    var abs = Math.abs(offMin);
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      "T" +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes()) +
      ":" +
      pad(d.getSeconds()) +
      "." +
      pad(d.getMilliseconds(), 3) +
      sign +
      pad(Math.floor(abs / 60)) +
      ":" +
      pad(abs % 60)
    );
  }

  function recordPath(row) {
    return (
      rtDbBaseUrl +
      "/Cliente/" +
      encodeURIComponent(row.key) +
      ".json?auth=" +
      encodeURIComponent(apiKey)
    );
  }

  function savePatch(row, patch, onDone) {
    var path = recordPath(row);

    function tryPut() {
      var base = row.rawRecord && typeof row.rawRecord === "object" ? row.rawRecord : {};
      var payload = JSON.parse(JSON.stringify(base));
      Object.keys(patch).forEach(function (k) {
        payload[k] = patch[k];
      });
      return fetch(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });
    }

    return fetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    })
      .then(function (res) {
        if (res.ok) return res;
        return tryPut().then(function (res2) {
          if (!res2.ok) {
            return res2.text().then(function (txt) {
              throw new Error("HTTP " + res2.status + " — " + (txt || res2.statusText || "falha ao gravar"));
            });
          }
          return res2;
        });
      })
      .then(function () {
        if (!row.rawRecord || typeof row.rawRecord !== "object") row.rawRecord = {};
        Object.keys(patch).forEach(function (k) {
          row.rawRecord[k] = patch[k];
        });
        if (onDone) onDone(null);
      })
      .catch(function (err) {
        if (onDone) onDone(err);
      });
  }

  function filteredRows() {
    var q = (filterEl.value || "").trim().toLowerCase();
    var rows = clientRows.filter(function (row) {
      if (!q) return true;
      return row.nome.toLowerCase().indexOf(q) !== -1;
    });
    rows.sort(function (a, b) {
      var da = parseDate(a.dataCadastro);
      var db = parseDate(b.dataCadastro);
      var ta = da ? da.getTime() : NaN;
      var tb = db ? db.getTime() : NaN;
      if (isNaN(ta) && isNaN(tb)) return a.nome.localeCompare(b.nome, "pt-BR");
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      if (ta !== tb) return ta - tb;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return rows;
  }

  function renderGrid() {
    var rows = filteredRows();
    gridBody.innerHTML = "";
    if (rowCountEl) {
      rowCountEl.textContent = rows.length + (rows.length === 1 ? " cliente" : " clientes");
    }
    if (rows.length === 0) {
      var trEmpty = document.createElement("tr");
      var tdEmpty = document.createElement("td");
      tdEmpty.colSpan = 7;
      tdEmpty.className = "muted";
      tdEmpty.textContent = "Nenhum cliente neste filtro.";
      trEmpty.appendChild(tdEmpty);
      gridBody.appendChild(trEmpty);
      return;
    }

    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.className = row.ativo ? "row-on" : "row-off";

      var tdNome = document.createElement("td");
      tdNome.className = "nome-cell";
      tdNome.textContent = row.nome || "(sem nome)";

      var tdDoc = document.createElement("td");
      tdDoc.className = "doc-cell";
      tdDoc.textContent = formatDocumento(row.cpfCnpj);

      var tdData = document.createElement("td");
      tdData.className = "data-cell";
      tdData.textContent = formatDate(row.dataUltimoAcesso);

      var tdCadastro = document.createElement("td");
      tdCadastro.className = "data-cell";
      tdCadastro.textContent = formatDate(row.dataCadastro);

      var tdLink = document.createElement("td");
      var input = document.createElement("input");
      input.type = "text";
      input.className = "link-input";
      input.value = row.linkPagamento || "";
      input.placeholder = "Link de pagamento";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.setAttribute("aria-label", "Link de pagamento de " + (row.nome || "cliente"));

      function commitLink() {
        var next = input.value.trim();
        var prev = (row.linkPagamento || "").trim();
        if (next === prev) return;
        tr.classList.add("row-busy");
        input.disabled = true;
        savePatch(row, { LinkPagamento: next }, function (err) {
          tr.classList.remove("row-busy");
          input.disabled = false;
          if (err) {
            input.value = row.linkPagamento || "";
            setActionStatus("Não foi possível salvar o link. " + (err.message || String(err)), true);
            return;
          }
          row.linkPagamento = next;
          setActionStatus("Link de pagamento salvo.", false);
        });
      }

      input.addEventListener("change", commitLink);
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          input.blur();
        }
      });
      tdLink.appendChild(input);

      var tdLiberar = document.createElement("td");
      var btnLiberar = document.createElement("button");
      btnLiberar.type = "button";
      btnLiberar.className = "btn compact " + (clienteLiberado(row) ? "bloqueado" : "liberar");
      btnLiberar.textContent = clienteLiberado(row) ? "bloqueado" : "liberar";
      btnLiberar.addEventListener("click", function () {
        var nome = row.nome || "este cliente";
        if (clienteLiberado(row)) {
          if (!window.confirm("Bloquear " + nome + "?")) return;
          tr.classList.add("row-busy");
          btnLiberar.disabled = true;
          savePatch(row, { Ativo: false }, function (err) {
            tr.classList.remove("row-busy");
            btnLiberar.disabled = false;
            if (err) {
              setActionStatus("Não foi possível bloquear o cliente. " + (err.message || String(err)), true);
              return;
            }
            row.ativo = false;
            renderGrid();
            setActionStatus("Cliente bloqueado.", false);
          });
          return;
        }
        var limite = new Date();
        limite.setDate(limite.getDate() + 30);
        var iso = toLocalIso(limite);
        if (!window.confirm("Liberar " + nome + " por 30 dias?")) return;
        tr.classList.add("row-busy");
        btnLiberar.disabled = true;
        savePatch(row, { Ativo: true, DataLimiteAcesso: iso }, function (err) {
          tr.classList.remove("row-busy");
          btnLiberar.disabled = false;
          if (err) {
            setActionStatus("Não foi possível liberar o cliente. " + (err.message || String(err)), true);
            return;
          }
          row.ativo = true;
          row.dataLimiteAcesso = iso;
          renderGrid();
          setActionStatus("Cliente liberado até " + formatDate(iso) + ".", false);
        });
      });
      tdLiberar.appendChild(btnLiberar);

      var tdAtivar = document.createElement("td");
      var btnAtivar = document.createElement("button");
      btnAtivar.type = "button";
      btnAtivar.className = "btn compact ativar";
      if (row.ativo) {
        btnAtivar.textContent = "Ativo";
        btnAtivar.disabled = true;
      } else {
        btnAtivar.textContent = "Ativar";
        btnAtivar.addEventListener("click", function () {
          var nome = row.nome || "este cliente";
          if (!window.confirm("Ativar " + nome + "?")) return;
          tr.classList.add("row-busy");
          btnAtivar.disabled = true;
          savePatch(row, { Ativo: true }, function (err) {
            tr.classList.remove("row-busy");
            if (err) {
              btnAtivar.disabled = false;
              setActionStatus("Não foi possível ativar o cliente. " + (err.message || String(err)), true);
              return;
            }
            row.ativo = true;
            renderGrid();
            setActionStatus("Cliente ativado.", false);
          });
        });
      }
      tdAtivar.appendChild(btnAtivar);

      tr.appendChild(tdNome);
      tr.appendChild(tdDoc);
      tr.appendChild(tdData);
      tr.appendChild(tdCadastro);
      tr.appendChild(tdLink);
      tr.appendChild(tdLiberar);
      tr.appendChild(tdAtivar);
      gridBody.appendChild(tr);
    });
  }

  function loadClients() {
    var cfg = window.__SANLOGICA_FIREBASE_CONFIG;
    if (!cfg || !cfg.firebase || !cfg.firebase.databaseURL) {
      showInitError("Configuração do Firebase ausente em js/firebase-config.js.");
      return;
    }
    rtDbBaseUrl = String(cfg.firebase.databaseURL).replace(/\/+$/, "");
    apiKey = cfg.firebase.apiKey || "";
    if (!apiKey || String(apiKey).trim().length < 10) {
      showInitError("A chave do Firebase não está configurada. Sem ela a grade não grava como o gestor.");
      return;
    }

    if (loadStatus) {
      loadStatus.hidden = false;
      loadStatus.textContent = "Carregando…";
    }
    if (loadError) loadError.hidden = true;
    gridBody.innerHTML = "";

    var url = rtDbBaseUrl + "/Cliente.json";
    fetch(url, { method: "GET", cache: "no-store", mode: "cors", credentials: "omit" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " " + res.statusText);
        return res.json();
      })
      .then(function (val) {
        clientRows = [];
        if (val && typeof val === "object") {
          Object.keys(val).forEach(function (key) {
            var raw = val[key];
            if (!raw || typeof raw !== "object") return;
            clientRows.push({
              key: key,
              nome: String(pick(raw, "Nome", "nome") || ""),
              cpfCnpj: String(pick(raw, "CPFCNPJ", "cpfCnpj") || key || ""),
              dataCadastro: pick(raw, "DataCadastro", "dataCadastro"),
              dataUltimoAcesso: pick(raw, "DataUltimoAcesso", "dataUltimoAcesso"),
              dataLimiteAcesso: pick(raw, "DataLimiteAcesso", "dataLimiteAcesso"),
              ativo: formatBoolAtivo(pick(raw, "Ativo", "ativo")),
              linkPagamento: String(pick(raw, "LinkPagamento", "linkPagamento") || ""),
              rawRecord: JSON.parse(JSON.stringify(raw)),
            });
          });
        }
        renderGrid();
      })
      .catch(function (err) {
        showInitError("Erro ao ler clientes: " + (err && err.message ? err.message : String(err)));
      })
      .finally(hideLoading);
  }

  if (filterEl) filterEl.addEventListener("input", renderGrid);

  if (sessionStorage.getItem(SESSION_KEY) === AUTH_PASS_SHA256) {
    showApp();
  }
})();
