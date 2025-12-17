(() => {
  const STORAGE_KEY = "financas.registros.v1";

  const form = document.querySelector("#form-registro");
  const btnLimpar = document.querySelector("#btn-limpar");
  const btnApagarTudo = document.querySelector("#btn-apagar-tudo");

  const filtroTipo = document.querySelector("#filtro-tipo");
  const busca = document.querySelector("#busca");

  const lista = document.querySelector("#lista-registros");
  const estadoVazio = document.querySelector("#estado-vazio");

  const totalReceitasEl = document.querySelector("#total-receitas");
  const totalDespesasEl = document.querySelector("#total-despesas");
  const saldoEl = document.querySelector("#saldo");

  const modal = document.querySelector("#modal");
  const formEditar = document.querySelector("#form-editar");
  const btnCancelarModal = document.querySelector("#btn-cancelar-modal");

  const nf = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function gerarId() {
    return (crypto?.randomUUID?.() || String(Date.now()) + "-" + String(Math.random()).slice(2));
  }

  function hojeISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatarDataPtBr(iso) {
    const [yyyy, mm, dd] = iso.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  function lerStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function salvarStorage(registros) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  }

  function normalizarTexto(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function validarRegistro({ data, tipo, item, valor }) {
    if (!data) return "Informe a data.";
    if (tipo !== "receita" && tipo !== "despesa") return "Informe o tipo.";
    if (!item || item.trim().length < 2) return "Informe uma descrição válida.";
    if (Number.isNaN(Number(valor)) || Number(valor) <= 0) return "Informe um valor maior que zero.";
    return null;
  }

  function calcularTotais(registros) {
    let receitas = 0;
    let despesas = 0;

    for (const r of registros) {
      const v = Number(r.valor) || 0;
      if (r.tipo === "receita") receitas += v;
      if (r.tipo === "despesa") despesas += v;
    }

    return { receitas, despesas, saldo: receitas - despesas };
  }

  function aplicarFiltros(registros) {
    const tipo = filtroTipo.value;
    const q = normalizarTexto(busca.value);

    return registros.filter((r) => {
      const okTipo = tipo === "todos" ? true : r.tipo === tipo;
      const okBusca = q ? normalizarTexto(r.item).includes(q) : true;
      return okTipo && okBusca;
    });
  }

  function ordenarPorDataDesc(registros) {
    return [...registros].sort((a, b) => {
      if (a.data === b.data) return String(b.criadoEm || "").localeCompare(String(a.criadoEm || ""));
      return String(b.data).localeCompare(String(a.data));
    });
  }

  function render() {
    const registros = lerStorage();
    const filtrados = aplicarFiltros(ordenarPorDataDesc(registros));

    lista.innerHTML = "";

    if (filtrados.length === 0) {
      estadoVazio.hidden = registros.length !== 0;
    } else {
      estadoVazio.hidden = true;
    }

    for (const r of filtrados) {
      const el = document.createElement("div");
      el.className = `registro ${r.tipo}`;
      el.setAttribute("role", "listitem");
      el.dataset.id = r.id;

      const sinal = r.tipo === "despesa" ? "-" : "";
      const valorTxt = `${sinal}${nf.format(Number(r.valor) || 0)}`;

      el.innerHTML = `
        <span class="data">${formatarDataPtBr(r.data)}</span>
        <span class="item">${escapeHtml(r.item)}</span>
        <span class="valor">${valorTxt}</span>
        <div class="botoes">
          <button class="btn" data-acao="editar" type="button">Editar</button>
          <button class="btn btn-perigo" data-acao="excluir" type="button">Excluir</button>
        </div>
      `;

      lista.appendChild(el);
    }

    const { receitas, despesas, saldo } = calcularTotais(registros);
    totalReceitasEl.textContent = nf.format(receitas);
    totalDespesasEl.textContent = nf.format(despesas);
    saldoEl.textContent = nf.format(saldo);

    saldoEl.style.color = saldo < 0 ? "rgb(221, 126, 126)" : "rgb(145, 201, 62)";
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function abrirModalEditar(registro) {
    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");

    document.querySelector("#editar-id").value = registro.id;
    document.querySelector("#editar-data").value = registro.data;
    document.querySelector("#editar-tipo").value = registro.tipo;
    document.querySelector("#editar-item").value = registro.item;
    document.querySelector("#editar-valor").value = String(registro.valor);

    document.querySelector("#editar-item").focus();
  }

  function fecharModalEditar() {
    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
    formEditar.reset();
  }

  function adicionarRegistro(payload) {
    const registros = lerStorage();
    registros.push(payload);
    salvarStorage(registros);
  }

  function atualizarRegistro(id, patch) {
    const registros = lerStorage();
    const idx = registros.findIndex((r) => r.id === id);
    if (idx === -1) return;

    registros[idx] = { ...registros[idx], ...patch };
    salvarStorage(registros);
  }

  function removerRegistro(id) {
    const registros = lerStorage().filter((r) => r.id !== id);
    salvarStorage(registros);
  }

  function apagarTudo() {
    localStorage.removeItem(STORAGE_KEY);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = document.querySelector("#data").value;
    const tipo = document.querySelector("#tipo").value;
    const item = document.querySelector("#item").value;
    const valor = Number(document.querySelector("#valor").value);

    const erro = validarRegistro({ data, tipo, item, valor });
    if (erro) {
      alert(erro);
      return;
    }

    adicionarRegistro({
      id: gerarId(),
      data,
      tipo,
      item: item.trim(),
      valor: Number(valor.toFixed(2)),
      criadoEm: new Date().toISOString()
    });

    form.reset();
    document.querySelector("#data").value = hojeISO();
    document.querySelector("#tipo").value = "receita";

    render();
  });

  btnLimpar.addEventListener("click", () => {
    form.reset();
    document.querySelector("#data").value = hojeISO();
    document.querySelector("#tipo").value = "receita";
    document.querySelector("#item").focus();
  });

  btnApagarTudo.addEventListener("click", () => {
    const registros = lerStorage();
    if (registros.length === 0) return;

    const ok = confirm("Tem certeza que deseja apagar todos os registros?");
    if (!ok) return;

    apagarTudo();
    render();
  });

  filtroTipo.addEventListener("change", render);
  busca.addEventListener("input", render);

  lista.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-acao]");
    if (!btn) return;

    const card = e.target.closest(".registro");
    const id = card?.dataset?.id;
    if (!id) return;

    const acao = btn.dataset.acao;
    const registros = lerStorage();
    const registro = registros.find((r) => r.id === id);
    if (!registro) return;

    if (acao === "editar") {
      abrirModalEditar(registro);
      return;
    }

    if (acao === "excluir") {
      const ok = confirm("Excluir este registro?");
      if (!ok) return;

      removerRegistro(id);
      render();
      return;
    }
  });

  formEditar.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = document.querySelector("#editar-id").value;
    const data = document.querySelector("#editar-data").value;
    const tipo = document.querySelector("#editar-tipo").value;
    const item = document.querySelector("#editar-item").value;
    const valor = Number(document.querySelector("#editar-valor").value);

    const erro = validarRegistro({ data, tipo, item, valor });
    if (erro) {
      alert(erro);
      return;
    }

    atualizarRegistro(id, {
      data,
      tipo,
      item: item.trim(),
      valor: Number(valor.toFixed(2))
    });

    fecharModalEditar();
    render();
  });

  btnCancelarModal.addEventListener("click", fecharModalEditar);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModalEditar();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("aberto")) fecharModalEditar();
  });

  // Boot
  document.querySelector("#data").value = hojeISO();
  render();
})();
