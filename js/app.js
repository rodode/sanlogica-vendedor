(function () {
  "use strict";

  var loadStatus = document.getElementById("load-status");
  var loadError = document.getElementById("load-error");

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

  /**
   * Leitura via REST do Realtime Database (GET .../Cliente.json).
   * Sem SDK Firebase no navegador (evita travamento no GitHub Pages).
   */
  var cfg = window.__SANLOGICA_FIREBASE_CONFIG;
  if (!cfg || !cfg.firebase) {
    showInitError(
      "Defina window.__SANLOGICA_FIREBASE_CONFIG em js/firebase-config.js (use firebase-config.example.js como base)."
    );
    return;
  }

  var fbCfg = cfg.firebase;
  if (
    !fbCfg.databaseURL ||
    typeof fbCfg.databaseURL !== "string" ||
    fbCfg.databaseURL.indexOf("firebaseio") === -1
  ) {
    showInitError(
      "Em firebase-config.js informe firebase.databaseURL do Realtime Database (ex.: https://PROJETO-default-rtdb.firebaseio.com)."
    );
    return;
  }

  var rtDbBaseUrl = fbCfg.databaseURL.replace(/\/+$/, "");

  var listEl = document.getElementById("list");
  var filterEl = document.getElementById("filter");
  var onlyActiveEl = document.getElementById("only-active");
  var dashboardEl = document.getElementById("dashboard");
  var kpiPrimaryEl = document.getElementById("kpi-primary");
  var kpiSecondaryEl = document.getElementById("kpi-secondary");
  var insightStripEl = document.getElementById("insight-strip");

  var clientRows = [];

  function closeAllCardMenus() {
    document.querySelectorAll(".card-menu.is-open").forEach(function (el) {
      el.classList.remove("is-open");
      var t = el.querySelector(".card-menu-trigger");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeAllCardMenus();
  });

  document.addEventListener("click", function (ev) {
    if (ev.target.closest(".card-menu")) return;
    closeAllCardMenus();
  });

  function saveClienteAtivo(row, novoAtivo, cardEl, onDone) {
    var apiKey = fbCfg.apiKey;
    if (!apiKey || String(apiKey).trim().length < 10) {
      onDone(
        new Error(
          "Configure firebase.apiKey em firebase-config.js (mesma chave do Gestor) para alterar Ativo."
        )
      );
      return;
    }

    var path =
      rtDbBaseUrl +
      "/Cliente/" +
      encodeURIComponent(row.key) +
      ".json?auth=" +
      encodeURIComponent(apiKey);

    cardEl.classList.add("client-card--busy");

    function applyLocalOk() {
      row.ativo = novoAtivo;
      if (row.rawRecord && typeof row.rawRecord === "object") {
        row.rawRecord.Ativo = novoAtivo;
      }
      closeAllCardMenus();
      try {
        renderDashboard(clientRows);
      } catch (e2) {}
      renderList();
    }

    function tryPut() {
      var base = row.rawRecord && typeof row.rawRecord === "object" ? row.rawRecord : {};
      var payload = JSON.parse(JSON.stringify(base));
      payload.Ativo = novoAtivo;
      return fetch(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });
    }

    fetch(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Ativo: novoAtivo }),
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    })
      .then(function (res) {
        if (res.ok) return res;
        return tryPut().then(function (res2) {
          if (!res2.ok) {
            return res2.text().then(function (txt) {
              throw new Error(
                "HTTP " + res2.status + " — " + (txt || res2.statusText || "falha ao gravar")
              );
            });
          }
          return res2;
        });
      })
      .then(function () {
        applyLocalOk();
        onDone(null);
      })
      .catch(function (err) {
        onDone(err);
      })
      .finally(function () {
        cardEl.classList.remove("client-card--busy");
      });
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
      var isBtn = btnEl.tagName === "BUTTON";
      if (isBtn) btnEl.disabled = true;
      setTimeout(function () {
        btnEl.textContent = prev;
        if (isBtn) btnEl.disabled = false;
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

  function formatPct(p) {
    if (p === null || p === undefined || isNaN(p)) return "—";
    return (
      p.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + "%"
    );
  }

  function monthKeyFromDate(d) {
    var mo = d.getMonth() + 1;
    return d.getFullYear() + "-" + (mo < 10 ? "0" : "") + mo;
  }

  function computeMetrics(rows) {
    var now = new Date();
    var hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var d7 = new Date(hoje);
    d7.setDate(d7.getDate() - 7);
    var d30 = new Date(hoje);
    d30.setDate(d30.getDate() - 30);

    var total = rows.length;
    var ativos7 = 0;
    var ativos30 = 0;
    rows.forEach(function (r) {
      var u = parseDate(r.dataUltimoAcesso);
      if (!u) return;
      var ud = new Date(u.getFullYear(), u.getMonth(), u.getDate());
      if (ud >= d7) ativos7++;
      if (ud >= d30) ativos30++;
    });

    function pct(part) {
      if (total === 0) return null;
      return (part / total) * 100;
    }

    var byMonthKey = {};
    rows.forEach(function (r) {
      var d = parseDate(r.dataCadastro);
      if (!d) return;
      var k = monthKeyFromDate(d);
      byMonthKey[k] = (byMonthKey[k] || 0) + 1;
    });
    var monthKeys = Object.keys(byMonthKey);
    var mediaMes =
      monthKeys.length === 0
        ? 0
        : monthKeys.reduce(function (s, k) {
            return s + byMonthKey[k];
          }, 0) / monthKeys.length;

    var mesAntRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var yAnt = mesAntRef.getFullYear();
    var mAnt = mesAntRef.getMonth();
    var totalMesAnterior = rows.filter(function (r) {
      var d = parseDate(r.dataCadastro);
      return d && d.getFullYear() === yAnt && d.getMonth() === mAnt;
    }).length;

    var yCur = now.getFullYear();
    var mCur = now.getMonth();
    var totalMesAtual = rows.filter(function (r) {
      var d = parseDate(r.dataCadastro);
      return d && d.getFullYear() === yCur && d.getMonth() === mCur;
    }).length;

    var ativosContrato = rows.filter(function (r) {
      return r.ativo;
    }).length;
    var inativosContrato = total - ativosContrato;
    var comLinkPagamento = rows.filter(function (r) {
      return r.linkPagamento && String(r.linkPagamento).trim();
    }).length;
    var semUltimoAcesso = rows.filter(function (r) {
      return !parseDate(r.dataUltimoAcesso);
    }).length;

    var semInstalacaoData = rows.filter(function (r) {
      return !parseDate(r.dataCadastro);
    }).length;

    var usoParado30 = total - ativos30;

    var bestK = null;
    var bestN = 0;
    monthKeys.forEach(function (k) {
      if (byMonthKey[k] > bestN) {
        bestN = byMonthKey[k];
        bestK = k;
      }
    });
    var melhorMesLabel = "—";
    if (bestK) {
      var p = bestK.split("-");
      var md = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, 1);
      melhorMesLabel = md.toLocaleString("pt-BR", { month: "long", year: "numeric" });
    }

    var diffMesVsAnt = totalMesAtual - totalMesAnterior;

    return {
      total: total,
      ativos7: ativos7,
      ativos30: ativos30,
      pct7: pct(ativos7),
      pct30: pct(ativos30),
      mediaMes: Math.round(mediaMes),
      totalMesAnterior: totalMesAnterior,
      totalMesAtual: totalMesAtual,
      mesAtualLabel: now.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
      mesAnteriorLabel: mesAntRef.toLocaleString("pt-BR", { month: "long", year: "numeric" }),
      ativosContrato: ativosContrato,
      inativosContrato: inativosContrato,
      pctAtivosContrato: pct(ativosContrato),
      comLinkPagamento: comLinkPagamento,
      semLinkPagamento: total - comLinkPagamento,
      semUltimoAcesso: semUltimoAcesso,
      semInstalacaoData: semInstalacaoData,
      usoParado30: usoParado30,
      pctUsoParado30: pct(usoParado30),
      melhorMesLabel: melhorMesLabel,
      melhorMesQtd: bestN,
      diffMesVsAnt: diffMesVsAnt,
      mesesComInstalacao: monthKeys.length,
    };
  }

  function elKpiCard(label, value, sub, meta, variantClass) {
    var card = document.createElement("div");
    card.className = "kpi-card" + (variantClass ? " " + variantClass : "");
    var lab = document.createElement("div");
    lab.className = "kpi-label";
    lab.textContent = label;
    var val = document.createElement("div");
    val.className = "kpi-value";
    val.textContent = value;
    card.appendChild(lab);
    card.appendChild(val);
    if (sub) {
      var s = document.createElement("div");
      s.className = "kpi-sub";
      s.textContent = sub;
      card.appendChild(s);
    }
    if (meta) {
      var m = document.createElement("div");
      m.className = "kpi-meta";
      m.textContent = meta;
      card.appendChild(m);
    }
    return card;
  }

  function elChip(html) {
    var span = document.createElement("span");
    span.className = "insight-chip";
    span.innerHTML = html;
    return span;
  }

  function renderDashboard(rows) {
    if (!kpiPrimaryEl || !kpiSecondaryEl || !insightStripEl || !dashboardEl) {
      if (dashboardEl) dashboardEl.hidden = true;
      return;
    }
    var m = computeMetrics(rows);

    kpiPrimaryEl.innerHTML = "";
    kpiSecondaryEl.innerHTML = "";
    insightStripEl.innerHTML = "";

    kpiPrimaryEl.appendChild(
      elKpiCard(
        "Ativos últimos 7 dias",
        m.total === 0 ? "—" : m.ativos7.toLocaleString("pt-BR"),
        m.total === 0 ? "—" : formatPct(m.pct7),
        "Último acesso nos últimos 7 dias",
        "kpi-card--emerald"
      )
    );
    kpiPrimaryEl.appendChild(
      elKpiCard(
        "Ativos últimos 30 dias",
        m.total === 0 ? "—" : m.ativos30.toLocaleString("pt-BR"),
        m.total === 0 ? "—" : formatPct(m.pct30),
        "Último acesso nos últimos 30 dias",
        "kpi-card--emerald"
      )
    );
    kpiPrimaryEl.appendChild(
      elKpiCard(
        "Total de instalações",
        m.total.toLocaleString("pt-BR"),
        m.total === 0 ? "—" : "100,00%",
        "Clientes no Firebase (chaves em Cliente)",
        ""
      )
    );
    kpiPrimaryEl.appendChild(
      elKpiCard(
        "Média instalações / mês",
        m.mesesComInstalacao === 0 ? "—" : m.mediaMes.toLocaleString("pt-BR"),
        m.mesesComInstalacao === 0 ? "—" : "média nos meses com ao menos 1",
        m.mesesComInstalacao > 0
          ? m.mesesComInstalacao + " mês(es) com cadastro"
          : null,
        "kpi-card--amber"
      )
    );
    kpiPrimaryEl.appendChild(
      elKpiCard(
        "Instalações mês anterior",
        m.totalMesAnterior.toLocaleString("pt-BR"),
        null,
        capitalizeFirst(m.mesAnteriorLabel),
        ""
      )
    );
    var subMesAtual = null;
    if (m.diffMesVsAnt !== 0) {
      subMesAtual =
        (m.diffMesVsAnt > 0 ? "▲ " : "▼ ") +
        Math.abs(m.diffMesVsAnt).toLocaleString("pt-BR") +
        " vs mês anterior";
    } else if (m.totalMesAtual > 0 && m.totalMesAnterior > 0) {
      subMesAtual = "igual ao mês anterior";
    }
    kpiPrimaryEl.appendChild(
      elKpiCard(
        "Instalações mês atual",
        m.totalMesAtual.toLocaleString("pt-BR"),
        subMesAtual,
        capitalizeFirst(m.mesAtualLabel),
        "kpi-card--amber"
      )
    );

    kpiSecondaryEl.appendChild(
      elKpiCard(
        "Cadastro ativo",
        m.ativosContrato.toLocaleString("pt-BR"),
        m.total === 0 ? "—" : formatPct(m.pctAtivosContrato),
        "Campo Ativo = verdadeiro",
        "kpi-card--emerald"
      )
    );
    kpiSecondaryEl.appendChild(
      elKpiCard(
        "Cadastro inativo",
        m.inativosContrato.toLocaleString("pt-BR"),
        m.total === 0 ? "—" : formatPct(pctPart(m.inativosContrato, m.total)),
        "Campo Ativo = falso",
        "kpi-card--rose"
      )
    );
    kpiSecondaryEl.appendChild(
      elKpiCard(
        "Com link de pagamento",
        m.comLinkPagamento.toLocaleString("pt-BR"),
        m.total === 0 ? "—" : formatPct(pctPart(m.comLinkPagamento, m.total)),
        "Link preenchido no cadastro",
        ""
      )
    );
    kpiSecondaryEl.appendChild(
      elKpiCard(
        "Sem último acesso",
        m.semUltimoAcesso.toLocaleString("pt-BR"),
        m.total === 0 ? "—" : formatPct(pctPart(m.semUltimoAcesso, m.total)),
        "Data de último acesso vazia ou inválida",
        "kpi-card--rose"
      )
    );

    insightStripEl.appendChild(
      elChip(
        "Uso parado (>30d sem entrar): <strong>" +
          m.usoParado30.toLocaleString("pt-BR") +
          "</strong> · " +
          formatPct(m.pctUsoParado30)
      )
    );
    insightStripEl.appendChild(
      elChip(
        "Sem link de pagamento: <strong>" +
          m.semLinkPagamento.toLocaleString("pt-BR") +
          "</strong>"
      )
    );
    insightStripEl.appendChild(
      elChip(
        "Sem data de instalação: <strong>" +
          m.semInstalacaoData.toLocaleString("pt-BR") +
          "</strong>"
      )
    );
    if (m.melhorMesQtd > 0) {
      insightStripEl.appendChild(
        elChip(
          "Pico de instalações: <strong>" +
            m.melhorMesQtd.toLocaleString("pt-BR") +
            "</strong> em " +
            m.melhorMesLabel
        )
      );
    }

    dashboardEl.hidden = false;
  }

  function pctPart(part, total) {
    if (!total) return null;
    return (part / total) * 100;
  }

  function capitalizeFirst(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
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
      var da = parseDate(a.dataCadastro);
      var db = parseDate(b.dataCadastro);
      var ta = da ? da.getTime() : NaN;
      var tb = db ? db.getTime() : NaN;
      if (isNaN(ta) && isNaN(tb)) {
        return a.nome.localeCompare(b.nome, "pt-BR");
      }
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      if (ta !== tb) return ta - tb;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    filtered.forEach(function (row) {
      var card = document.createElement("article");
      card.className = "client-card";

      var header = document.createElement("header");
      header.className = "client-card-head";

      var headLeft = document.createElement("div");
      headLeft.className = "client-card-head-left";
      var h2 = document.createElement("h2");
      h2.textContent = row.nome || "(sem nome)";
      var badge = document.createElement("span");
      badge.className = "badge " + (row.ativo ? "on" : "off");
      badge.textContent = row.ativo ? "Ativo" : "Inativo";
      headLeft.appendChild(h2);
      headLeft.appendChild(badge);

      var menuRoot = document.createElement("div");
      menuRoot.className = "card-menu";

      var menuBtn = document.createElement("button");
      menuBtn.type = "button";
      menuBtn.className = "card-menu-trigger";
      menuBtn.setAttribute("aria-label", "Ações do cliente");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-haspopup", "true");
      var dots = document.createElement("span");
      dots.className = "card-menu-dots";
      dots.setAttribute("aria-hidden", "true");
      for (var di = 0; di < 3; di++) {
        var dot = document.createElement("span");
        dots.appendChild(dot);
      }
      menuBtn.appendChild(dots);

      var dropdown = document.createElement("div");
      dropdown.className = "card-menu-dropdown";
      dropdown.setAttribute("role", "menu");

      var menuAtivarDesativar = document.createElement("button");
      menuAtivarDesativar.type = "button";
      menuAtivarDesativar.className = "card-menu-item";
      menuAtivarDesativar.setAttribute("role", "menuitem");
      menuAtivarDesativar.textContent = row.ativo ? "Desativar" : "Ativar";

      menuBtn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var wasOpen = menuRoot.classList.contains("is-open");
        closeAllCardMenus();
        if (!wasOpen) {
          menuRoot.classList.add("is-open");
          menuBtn.setAttribute("aria-expanded", "true");
        }
      });

      menuAtivarDesativar.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var novo = !row.ativo;
        saveClienteAtivo(row, novo, card, function (err) {
          if (err) {
            window.alert(
              "Não foi possível alterar o cadastro no Firebase.\n\n" +
                (err.message || String(err)) +
                "\n\nConfira as regras de escrita em /Cliente e se a autenticação REST está liberada (como no Gestor Sanlogica)."
            );
          }
        });
      });

      dropdown.appendChild(menuAtivarDesativar);
      menuRoot.appendChild(menuBtn);
      menuRoot.appendChild(dropdown);
      header.appendChild(headLeft);
      header.appendChild(menuRoot);

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

        var spanCopy = document.createElement("span");
        spanCopy.className = "pay-link";
        spanCopy.setAttribute("role", "button");
        spanCopy.setAttribute("tabindex", "0");
        spanCopy.textContent = "Copiar link";
        spanCopy.addEventListener("click", function () {
          copyToClipboard(String(link), spanCopy);
        });
        spanCopy.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            copyToClipboard(String(link), spanCopy);
          }
        });

        ddPay.appendChild(a);
        ddPay.appendChild(spanCopy);
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
    if (!rtDbBaseUrl || !listEl) {
      showInitError("Elementos da página incompletos (lista ausente). Atualize com Ctrl+F5.");
      return;
    }

    if (loadStatus) {
      loadStatus.textContent = "Carregando…";
      loadStatus.hidden = false;
    }
    if (loadError) loadError.hidden = true;
    listEl.innerHTML = "";
    if (dashboardEl) dashboardEl.hidden = true;

    var FETCH_MS = 45000;
    var timeoutPromise = new Promise(function (_, reject) {
      setTimeout(function () {
        reject(
          new Error(
            "Tempo esgotado ao buscar dados. Verifique internet, se o Realtime Database está ativo e se as regras permitem leitura em Cliente."
          )
        );
      }, FETCH_MS);
    });

    var url = rtDbBaseUrl + "/Cliente.json";

    function fetchClienteJson() {
      return fetch(url, {
        method: "GET",
        cache: "no-store",
        mode: "cors",
        credentials: "omit",
      }).then(function (res) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            "HTTP " +
              res.status +
              " — leitura negada. Ajuste as regras do nó Cliente no Realtime Database ou autorize o domínio do GitHub Pages no projeto Firebase."
          );
        }
        if (!res.ok) {
          throw new Error("HTTP " + res.status + " " + res.statusText);
        }
        return res.json();
      });
    }

    Promise.race([fetchClienteJson(), timeoutPromise])
      .then(function (val) {
        clientRows = [];

        if (val && typeof val === "object") {
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
              rawRecord: JSON.parse(JSON.stringify(raw)),
            });
          });
        }

        try {
          renderDashboard(clientRows);
        } catch (e2) {
          if (loadError) {
            loadError.hidden = false;
            loadError.textContent =
              "Dados carregados, mas o painel resumo falhou: " +
              (e2 && e2.message ? e2.message : String(e2));
          }
        }
        renderList();
      })
      .catch(function (err) {
        if (dashboardEl) dashboardEl.hidden = true;
        var code = err && err.code ? String(err.code) : "";
        var msg = err && err.message ? err.message : String(err);
        if (code.indexOf("PERMISSION_DENIED") !== -1 || msg.indexOf("permission") !== -1) {
          msg =
            "Permissão negada ao ler /Cliente. No Firebase → Realtime Database → Regras, permita .read para este caminho (como no Gestor). Detalhe: " +
            msg;
        }
        if (msg.indexOf("Failed to fetch") !== -1) {
          msg +=
            " Possíveis causas: rede offline, bloqueador de conteúdo, ou domínio do site não está em Firebase Console → Configurações → Domínios autorizados (adicione seu usuario.github.io).";
        }
        if (loadError) {
          loadError.hidden = false;
          loadError.textContent = "Erro ao ler clientes: " + msg;
        }
      })
      .finally(function () {
        hideLoading();
      });
  }

  if (filterEl) filterEl.addEventListener("input", renderList);
  if (onlyActiveEl) onlyActiveEl.addEventListener("change", renderList);

  loadClients();
})();
