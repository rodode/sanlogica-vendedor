(function () {
  "use strict";

  var cfg = window.__SANLOGICA_FIREBASE_CONFIG;
  if (!cfg || !cfg.firebase) {
    console.error("Defina window.__SANLOGICA_FIREBASE_CONFIG em js/firebase-config.js");
    return;
  }

  firebase.initializeApp(cfg.firebase);

  var db = firebase.database();

  var loadStatus = document.getElementById("load-status");
  var loadError = document.getElementById("load-error");
  var listEl = document.getElementById("list");
  var filterEl = document.getElementById("filter");
  var onlyActiveEl = document.getElementById("only-active");

  var clientRows = [];

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
    return isNaN(d.getTime()) ? null : d;
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
    if (value === true || value === "true" || value === 1) return true;
    if (value === false || value === "false" || value === 0) return false;
    return false;
  }

  function copyToClipboard(text, btnEl) {
    function feedback() {
      if (!btnEl) return;
      var prev = btnEl.textContent;
      btnEl.textContent = "Copiado!";
      btnEl.disabled = true;
      setTimeout(function () {
        btnEl.textContent = prev;
        btnEl.disabled = false;
      }, 2000);
    }
    function fail() {
      window.prompt("Copie o link:", text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(feedback).catch(function () {
        legacyCopy();
      });
    } else {
      legacyCopy();
    }
    function legacyCopy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        if (document.execCommand("copy")) feedback();
        else fail();
      } catch (e) {
        fail();
      }
      document.body.removeChild(ta);
    }
  }

  function renderList() {
    var q = (filterEl.value || "").trim().toLowerCase();
    var only = onlyActiveEl.checked;

    var filtered = clientRows.filter(function (row) {
      if (only && !row.ativo) return false;
      if (!q) return true;
      return row.nome.toLowerCase().indexOf(q) !== -1;
    });

    listEl.innerHTML = "";

    if (filtered.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Nenhum cliente neste filtro.";
      listEl.appendChild(empty);
      return;
    }

    filtered.sort(function (a, b) {
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    filtered.forEach(function (row) {
      var card = document.createElement("article");
      card.className = "client-card";

      var header = document.createElement("header");
      var h2 = document.createElement("h2");
      h2.textContent = row.nome || "(sem nome)";
      var badge = document.createElement("span");
      badge.className = "badge " + (row.ativo ? "on" : "off");
      badge.textContent = row.ativo ? "Ativo" : "Inativo";
      header.appendChild(h2);
      header.appendChild(badge);

      var dl = document.createElement("dl");

      function addRow(label, valueHtml) {
        var dt = document.createElement("dt");
        dt.textContent = label;
        var dd = document.createElement("dd");
        dd.innerHTML = valueHtml;
        dl.appendChild(dt);
        dl.appendChild(dd);
      }

      addRow("Instalação", formatDate(row.dataCadastro));
      addRow("Último acesso", formatDate(row.dataUltimoAcesso));

      var link = row.linkPagamento;
      if (link) {
        var dtPay = document.createElement("dt");
        dtPay.textContent = "Pagamento";
        var ddPay = document.createElement("dd");
        ddPay.className = "pay-actions";

        var a = document.createElement("a");
        a.className = "pay-link";
        a.href = link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Abrir link";

        var btnCopy = document.createElement("button");
        btnCopy.type = "button";
        btnCopy.className = "btn-pay-copy";
        btnCopy.textContent = "Copiar link";
        btnCopy.addEventListener("click", function () {
          copyToClipboard(String(link), btnCopy);
        });

        ddPay.appendChild(a);
        ddPay.appendChild(btnCopy);
        dl.appendChild(dtPay);
        dl.appendChild(ddPay);
      } else {
        addRow("Pagamento", "—");
      }

      card.appendChild(header);
      card.appendChild(dl);
      listEl.appendChild(card);
    });
  }

  function loadClients() {
    loadStatus.textContent = "Carregando…";
    loadStatus.hidden = false;
    loadError.hidden = true;
    listEl.innerHTML = "";

    db.ref("Cliente")
      .once("value")
      .then(function (snap) {
        loadStatus.hidden = true;
        var val = snap.val();
        clientRows = [];

        if (!val || typeof val !== "object") {
          renderList();
          return;
        }

        Object.keys(val).forEach(function (key) {
          var raw = val[key];
          if (!raw || typeof raw !== "object") return;

          clientRows.push({
            key: key,
            nome: String(pick(raw, "Nome", "nome") || ""),
            dataCadastro: pick(raw, "DataCadastro", "dataCadastro"),
            dataUltimoAcesso: pick(raw, "DataUltimoAcesso", "dataUltimoAcesso"),
            ativo: formatBoolAtivo(pick(raw, "Ativo", "ativo")),
            linkPagamento: String(pick(raw, "LinkPagamento", "linkPagamento") || ""),
          });
        });

        renderList();
      })
      .catch(function (err) {
        loadStatus.hidden = true;
        loadError.hidden = false;
        loadError.textContent =
          "Erro ao ler clientes: " +
          (err && err.message ? err.message : String(err)) +
          ". No Firebase, as regras do nó Cliente precisam permitir leitura sem login (ex.: .read: true) ou o site não consegue listar — igual ao acesso que o Gestor já usa.";
      });
  }

  filterEl.addEventListener("input", renderList);
  onlyActiveEl.addEventListener("change", renderList);

  loadClients();
})();
