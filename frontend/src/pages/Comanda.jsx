import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import socket from "../services/socket";
import "./Comanda.css";

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Comanda() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [comanda, setComanda] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [quantidades, setQuantidades] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // =========================================================
  // PAGAMENTO
  // =========================================================

  const [mostrarPagamento, setMostrarPagamento] = useState(false);

  const [formaPagamento, setFormaPagamento] =
    useState("DINHEIRO");

  const [valorPagamento, setValorPagamento] =
    useState("");

  const [processandoPagamento, setProcessandoPagamento] =
    useState(false);

  // =========================================================
  // CARREGAR COMANDA
  // =========================================================

  async function carregarComanda() {
    console.log(
      "[COMANDA] Iniciando carregamento:",
      id
    );

    try {
      const response = await api.get(
        `/comandas/${id}`,
        {
          timeout: 10000,
        }
      );

      console.log(
        "[COMANDA] Resposta recebida:",
        response.status,
        response.data
      );

      setComanda(response.data);

      return true;
    } catch (error) {
      console.error(
        "[COMANDA] Erro ao carregar:",
        error
      );

      console.error(
        "[COMANDA] Status:",
        error.response?.status
      );

      console.error(
        "[COMANDA] Resposta:",
        error.response?.data
      );

      console.error(
        "[COMANDA] Código:",
        error.code
      );

      alert(
        error.response?.data?.error ||
          "Não foi possível carregar a comanda."
      );

      navigate("/mesas");

      return false;
    }
  }

  // =========================================================
  // CARREGAR PRODUTOS
  // =========================================================

  async function carregarProdutos() {
  console.log(
    "[PRODUTOS] Iniciando carregamento"
  );

  try {
    const response = await api.get(
      "/produtos",
      {
        params: {
          contexto: "comanda",
        },
        timeout: 10000,
      }
    );

    console.log(
      "[PRODUTOS] Resposta recebida:",
      response.status
    );

    const lista =
      response.data?.itens ||
      response.data?.produtos ||
      response.data?.data ||
      response.data ||
      [];

    setProdutos(
      Array.isArray(lista)
        ? lista.filter(
            (produto) =>
              produto.ativo !== false
          )
        : []
    );

    return true;
  } catch (error) {
    console.error(
      "[PRODUTOS] Erro ao carregar:",
      error
    );

    console.error(
      "[PRODUTOS] Status:",
      error.response?.status
    );

    console.error(
      "[PRODUTOS] Resposta:",
      error.response?.data
    );

    console.error(
      "[PRODUTOS] Código:",
      error.code
    );

    setProdutos([]);

    return false;
  }
}
  // =========================================================
  // CARREGAR DADOS
  // =========================================================

  async function carregarDados() {
    console.log(
      "[COMANDA] carregarDados() iniciou"
    );

    setCarregando(true);

    try {
      const comandaCarregada =
        await carregarComanda();

      if (!comandaCarregada) {
        return;
      }

      console.log(
        "[COMANDA] carregarComanda() terminou"
      );

      await carregarProdutos();

      console.log(
        "[COMANDA] carregarProdutos() terminou"
      );
    } catch (error) {
      console.error(
        "[COMANDA] Erro em carregarDados():",
        error
      );
    } finally {
      console.log(
        "[COMANDA] Finalizando carregamento"
      );

      setCarregando(false);
    }
  }

  // =========================================================
  // CARREGAMENTO INICIAL
  //
  // IMPORTANTE:
  // TODOS OS HOOKS FICAM ANTES DOS RETURNS.
  // =========================================================

  useEffect(() => {
    console.log(
      "[COMANDA] COMPONENTE MONTADO"
    );

    console.log(
      "[COMANDA] ID DA URL:",
      id
    );

    if (!id) {
      console.error(
        "[COMANDA] ID não informado na URL."
      );

      setCarregando(false);

      alert(
        "ID da comanda não informado."
      );

      navigate("/mesas");

      return;
    }

    carregarDados();
  }, [id]);

  // =========================================================
  // SOCKET.IO
  // =========================================================

  useEffect(() => {
    console.log(
      "[SOCKET] Registrando listeners da comanda:",
      id
    );

    function atualizarComanda(dados) {
      console.log(
        "[SOCKET] Evento recebido:",
        dados
      );

      if (
        dados?.comandaId == null
      ) {
        return;
      }

      if (
        Number(dados.comandaId) !==
        Number(id)
      ) {
        return;
      }

      console.log(
        "[SOCKET] Atualizando comanda:",
        id
      );

      carregarComanda();
    }

    socket.on(
      "item-comanda-adicionado",
      atualizarComanda
    );

    socket.on(
      "item-comanda-atualizado",
      atualizarComanda
    );

    socket.on(
      "item-comanda-removido",
      atualizarComanda
    );

    socket.on(
      "pagamento-comanda-atualizado",
      atualizarComanda
    );

    return () => {
      console.log(
        "[SOCKET] Removendo listeners da comanda:",
        id
      );

      socket.off(
        "item-comanda-adicionado",
        atualizarComanda
      );

      socket.off(
        "item-comanda-atualizado",
        atualizarComanda
      );

      socket.off(
        "item-comanda-removido",
        atualizarComanda
      );

      socket.off(
        "pagamento-comanda-atualizado",
        atualizarComanda
      );
    };
  }, [id]);

  // =========================================================
  // FILTRAR PRODUTOS
  // =========================================================

  const produtosFiltrados = useMemo(() => {
    const termo =
      busca.trim().toLowerCase();

    if (!termo) {
      return produtos;
    }

    return produtos.filter(
      (produto) => {
        const nome = String(
          produto.nome || ""
        ).toLowerCase();

        const codigo = String(
          produto.codigoBarra || ""
        ).toLowerCase();

        return (
          nome.includes(termo) ||
          codigo.includes(termo)
        );
      }
    );
  }, [produtos, busca]);

  // =========================================================
  // QUANTIDADE PARA ADICIONAR
  // =========================================================

  function obterQuantidadeProduto(
    produtoId
  ) {
    return Number(
      quantidades[produtoId] || 1
    );
  }

  function alterarQuantidadeProduto(
    produtoId,
    valor
  ) {
    const quantidade = Math.max(
      1,
      Number(valor) || 1
    );

    setQuantidades(
      (estadoAtual) => ({
        ...estadoAtual,
        [produtoId]: quantidade,
      })
    );
  }

  // =========================================================
  // ADICIONAR PRODUTO
  // =========================================================

  async function adicionarProduto(
    produto
  ) {
    const quantidade =
      obterQuantidadeProduto(
        produto.id
      );

    if (quantidade <= 0) {
      alert(
        "Informe uma quantidade válida."
      );

      return;
    }

    if (
      Number(
        produto.quantidade || 0
      ) < quantidade
    ) {
      alert(
        `Estoque insuficiente. Disponível: ${produto.quantidade}.`
      );

      return;
    }

    if (
      comanda?.status !== "ABERTA"
    ) {
      alert(
        "Esta comanda não está aberta."
      );

      return;
    }

    try {
      setSalvando(true);

      await api.post(
        `/comandas/${id}/itens`,
        {
          produtoId: produto.id,
          quantidade,
        }
      );

      setQuantidades(
        (estadoAtual) => ({
          ...estadoAtual,
          [produto.id]: 1,
        })
      );

      await carregarComanda();
    } catch (error) {
      console.error(
        "Erro ao adicionar item:",
        error
      );

      alert(
        error.response?.data?.error ||
          "Não foi possível adicionar o item."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =========================================================
  // ALTERAR QUANTIDADE DO ITEM
  // =========================================================

  async function alterarQuantidadeItem(
    item,
    novaQuantidade
  ) {
    const quantidade =
      Number(novaQuantidade);

    if (
      !Number.isInteger(
        quantidade
      ) ||
      quantidade <= 0
    ) {
      return;
    }

    if (
      (item.status || "PENDENTE") !==
      "PENDENTE"
    ) {
      alert(
        "Este item já foi enviado para atendimento e não pode mais ter a quantidade alterada."
      );

      return;
    }

    try {
      setSalvando(true);

      await api.put(
        `/comandas/${id}/itens/${item.id}`,
        {
          quantidade,
        }
      );

      await carregarComanda();
    } catch (error) {
      console.error(
        "Erro ao alterar item:",
        error
      );

      alert(
        error.response?.data?.error ||
          "Não foi possível alterar a quantidade."
      );

      await carregarComanda();
    } finally {
      setSalvando(false);
    }
  }

  // =========================================================
  // STATUS DO ITEM
  // =========================================================

  function obterStatusItem(item) {
    return item.status || "PENDENTE";
  }

  function obterTextoStatus(
    status
  ) {
    const textos = {
      PENDENTE: "Pendente",
      ENVIADO: "Enviado",
      PREPARANDO: "Preparando",
      PRONTO: "Pronto",
      PARCIALMENTE_SERVIDO:
        "Parcialmente servido",
      SERVIDO: "Servido",
    };

    return (
      textos[status] || status
    );
  }

  function obterProximoStatus(
    status
  ) {
    const proximos = {
      PENDENTE: "ENVIADO",
      ENVIADO: "PREPARANDO",
      PREPARANDO: "PRONTO",
    };

    return (
      proximos[status] || null
    );
  }

  // =========================================================
  // ATUALIZAR STATUS DO ITEM
  // =========================================================

  async function atualizarStatusItem(
    item,
    novoStatus,
    novaQuantidadeServida
  ) {
    try {
      setSalvando(true);

      await api.patch(
        `/comandas/${id}/itens/${item.id}/status`,
        {
          status: novoStatus,

          ...(novaQuantidadeServida !==
          undefined
            ? {
                quantidadeServida:
                  novaQuantidadeServida,
              }
            : {}),
        }
      );

      await carregarComanda();
    } catch (error) {
      console.error(
        "Erro ao atualizar status:",
        error
      );

      alert(
        error.response?.data?.error ||
          "Não foi possível atualizar o status do item."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =========================================================
  // AVANÇAR ITEM
  // =========================================================

  async function avancarItem(item) {
    const status =
      obterStatusItem(item);

    if (
      status === "PRONTO" ||
      status ===
        "PARCIALMENTE_SERVIDO"
    ) {
      const quantidadeAtual =
        Number(
          item.quantidadeServida ||
            0
        );

      const quantidadeTotal =
        Number(
          item.quantidade || 0
        );

      const novaQuantidade =
        quantidadeAtual + 1;

      if (
        novaQuantidade >=
        quantidadeTotal
      ) {
        await atualizarStatusItem(
          item,
          "SERVIDO",
          quantidadeTotal
        );

        return;
      }

      await atualizarStatusItem(
        item,
        "PARCIALMENTE_SERVIDO",
        novaQuantidade
      );

      return;
    }

    const proximo =
      obterProximoStatus(status);

    if (!proximo) {
      return;
    }

    await atualizarStatusItem(
      item,
      proximo
    );
  }

  // =========================================================
  // REMOVER ITEM
  // =========================================================

  async function removerItem(item) {
    const status =
      item.status || "PENDENTE";

    if (status !== "PENDENTE") {
      alert(
        "Este item já foi enviado para atendimento e não pode mais ser removido."
      );

      return;
    }

    const nome =
      item.produto?.nome ||
      item.nomeProduto ||
      "este item";

    const confirmar =
      window.confirm(
        `Remover "${nome}" da comanda?`
      );

    if (!confirmar) {
      return;
    }

    try {
      setSalvando(true);

      await api.delete(
        `/comandas/${id}/itens/${item.id}`
      );

      await carregarComanda();
    } catch (error) {
      console.error(
        "Erro ao remover item:",
        error
      );

      alert(
        error.response?.data?.error ||
          "Não foi possível remover o item."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =========================================================
  // INICIAR FECHAMENTO
  // =========================================================

  function iniciarFechamento() {
    if (!comanda?.itens?.length) {
      alert(
        "A comanda não possui itens."
      );

      return;
    }

    if (
      comanda.status !== "ABERTA"
    ) {
      alert(
        "Esta comanda já foi fechada."
      );

      return;
    }

    const valorRestante =
      Number(
        comanda.remaining ??
          comanda.resumo?.restante ??
          comanda.total ??
          comanda.itens.reduce(
            (total, item) =>
              total +
              Number(
                item.subtotal || 0
              ),
            0
          )
      );

    setValorPagamento(
      valorRestante > 0
        ? valorRestante.toFixed(2)
        : ""
    );

    setFormaPagamento(
      "DINHEIRO"
    );

    setMostrarPagamento(true);
  }

  // =========================================================
  // REGISTRAR PAGAMENTO
  // =========================================================

  async function registrarPagamento() {
    const valor =
      Number(valorPagamento);

    const restanteAtual =
      Number(
        comanda.remaining ??
          comanda.resumo?.restante ??
          comanda.total ??
          0
      );

    if (
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      alert(
        "Informe um valor válido."
      );

      return;
    }

    if (
      valor >
      restanteAtual + 0.01
    ) {
      alert(
        "O valor não pode ser maior que o restante."
      );

      return;
    }

    try {
      setProcessandoPagamento(
        true
      );

      const response =
        await api.post(
          `/comandas/${id}/pagamentos`,
          {
            valor,
            forma: formaPagamento,
          }
        );

      const resultado =
        response.data;

      if (resultado.quitada) {
        alert(
          "Comanda fechada com sucesso!"
        );

        setMostrarPagamento(
          false
        );

        navigate("/mesas");

        return;
      }

      alert(
        `Pagamento registrado. Restante: ${formatarMoeda(
          resultado.restante
        )}`
      );

      setMostrarPagamento(
        false
      );

      await carregarComanda();
    } catch (error) {
      console.error(
        "Erro ao registrar pagamento:",
        error
      );

      alert(
        error.response?.data?.error ||
          "Não foi possível registrar o pagamento."
      );
    } finally {
      setProcessandoPagamento(
        false
      );
    }
  }

  // =========================================================
  // CARREGANDO
  // =========================================================

  if (carregando) {
    return (
      <div className="comanda-page">
        <div className="comanda-loading">
          Carregando comanda...
        </div>
      </div>
    );
  }

  if (!comanda) {
    return null;
  }

  // =========================================================
  // TOTAIS
  // =========================================================

  const totalComanda =
    Number(
      comanda.total ??
        comanda.resumo?.total ??
        comanda.itens?.reduce(
          (total, item) =>
            total +
            Number(
              item.subtotal || 0
            ),
          0
        ) ??
        0
    );

  const totalPago =
    Number(
      comanda.totalPaid ??
        comanda.resumo?.totalPago ??
        0
    );

  const restante =
    Math.max(
      0,
      Number(
        comanda.remaining ??
          comanda.resumo?.restante ??
          totalComanda -
            totalPago
      )
    );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="comanda-page">
      <div className="comanda-container">

        {/* =================================================== */}
        {/* CABEÇALHO */}
        {/* =================================================== */}

        <header className="comanda-header">
          <button
            className="comanda-btn-voltar"
            onClick={() =>
              navigate("/mesas")
            }
          >
            ← Mesas
          </button>

          <div className="comanda-titulo">
            <h1>
              Comanda #
              {String(
                comanda.id
              ).padStart(4, "0")}
            </h1>

            <div className="comanda-subtitulo">
              {comanda.mesa ? (
                <span>
                  Mesa{" "}
                  {comanda.mesa.numero}
                </span>
              ) : (
                <span>
                  Comanda sem mesa
                </span>
              )}

              <span
                className={`comanda-status ${
                  comanda.status ===
                  "ABERTA"
                    ? "aberta"
                    : "fechada"
                }`}
              >
                {comanda.status}
              </span>
            </div>
          </div>

          <div className="comanda-header-acoes">
            <button
              className="comanda-btn-fechar"
              onClick={
                iniciarFechamento
              }
              disabled={
                salvando ||
                comanda.status !==
                  "ABERTA" ||
                !comanda.itens?.length
              }
            >
              Fechar comanda
            </button>
          </div>
        </header>

        {/* =================================================== */}
        {/* CONTEÚDO PRINCIPAL */}
        {/* =================================================== */}

        <main className="comanda-grid">

          {/* ================================================= */}
          {/* PRODUTOS */}
          {/* ================================================= */}

          <section className="comanda-produtos">
            <div className="comanda-card">

              <div className="comanda-card-header">
                <div>
                  <h2>
                    Adicionar produtos
                  </h2>

                  <p>
                    Pesquise por nome ou
                    código de barras.
                  </p>
                </div>
              </div>

              <div className="comanda-busca">
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(
                    event
                  ) =>
                    setBusca(
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="comanda-produtos-lista">
                {produtosFiltrados.length ===
                0 ? (
                  <div className="comanda-vazio">
                    Nenhum produto
                    encontrado.
                  </div>
                ) : (
                  produtosFiltrados.map(
                    (produto) => {
                      const estoque =
                        Number(
                          produto.quantidade ||
                            0
                        );

                      const quantidade =
                        obterQuantidadeProduto(
                          produto.id
                        );

                      const semEstoque =
                        estoque <= 0;

                      return (
                        <div
                          key={produto.id}
                          className="produto-comanda"
                        >
                          <div className="produto-comanda-info">
                            <strong>
                              {produto.nome}
                            </strong>

                            <span>
                              {formatarMoeda(
                                produto.precoVenda
                              )}
                            </span>

                            <small>
                              Estoque:{" "}
                              {estoque}
                            </small>
                          </div>

                          <div className="produto-comanda-acoes">
                            <input
                              type="number"
                              min="1"
                              value={
                                quantidade
                              }
                              disabled={
                                semEstoque ||
                                salvando ||
                                comanda.status !==
                                  "ABERTA"
                              }
                              onChange={(
                                event
                              ) =>
                                alterarQuantidadeProduto(
                                  produto.id,
                                  event
                                    .target
                                    .value
                                )
                              }
                            />

                            <button
                              type="button"
                              onClick={() =>
                                adicionarProduto(
                                  produto
                                )
                              }
                              disabled={
                                semEstoque ||
                                salvando ||
                                comanda.status !==
                                  "ABERTA" ||
                                quantidade >
                                  estoque
                              }
                            >
                              {semEstoque
                                ? "Sem estoque"
                                : "Adicionar"}
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>
          </section>

          {/* ================================================= */}
          {/* RESUMO DA COMANDA */}
          {/* ================================================= */}

          <aside className="comanda-resumo">
            <div className="comanda-card">

              <div className="comanda-card-header">
                <div>
                  <h2>
                    Itens da comanda
                  </h2>

                  <p>
                    {comanda.itens
                      ?.length || 0}{" "}
                    item(ns)
                  </p>
                </div>
              </div>

              {/* ============================================= */}
              {/* ITENS */}
              {/* ============================================= */}

              <div className="comanda-itens">
                {!comanda.itens?.length ? (
                  <div className="comanda-vazio">
                    Nenhum item
                    adicionado.
                  </div>
                ) : (
                  comanda.itens.map(
                    (item) => {
                      const nomeProduto =
                        item.produto?.nome ||
                        item.nomeProduto ||
                        "Produto";

                      const status =
                        obterStatusItem(
                          item
                        );

                      const quantidade =
                        Number(
                          item.quantidade ||
                            0
                        );

                      const quantidadeServida =
                        Number(
                          item.quantidadeServida ||
                            0
                        );

                      const podeEditar =
                        status ===
                        "PENDENTE";

                      const itemServido =
                        status ===
                        "SERVIDO";

                      return (
                        <div
                          key={item.id}
                          className={`comanda-item status-${String(
                            status
                          ).toLowerCase()}`}
                        >

                          {/* ---------------------------------- */}
                          {/* CABEÇALHO DO ITEM */}
                          {/* ---------------------------------- */}

                          <div className="comanda-item-topo">
                            <div>
                              <strong>
                                {
                                  nomeProduto
                                }
                              </strong>

                              <div className="comanda-item-status">
                                <span
                                  className={`status-item-badge status-${String(
                                    status
                                  ).toLowerCase()}`}
                                >
                                  {obterTextoStatus(
                                    status
                                  )}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="comanda-item-remover"
                              onClick={() =>
                                removerItem(
                                  item
                                )
                              }
                              disabled={
                                salvando ||
                                !podeEditar
                              }
                              title={
                                !podeEditar
                                  ? "Este item já foi enviado para atendimento."
                                  : "Remover item"
                              }
                            >
                              ×
                            </button>
                          </div>

                          {/* ---------------------------------- */}
                          {/* PREÇO */}
                          {/* ---------------------------------- */}

                          <div className="comanda-item-info">
                            <span>
                              {formatarMoeda(
                                item.precoUnitario
                              )}{" "}
                              cada
                            </span>

                            <span>
                              {formatarMoeda(
                                item.subtotal
                              )}
                            </span>
                          </div>

                          {/* ---------------------------------- */}
                          {/* SERVIDO */}
                          {/* ---------------------------------- */}

                          <div className="comanda-item-servico">
                            <span>
                              Servido:{" "}
                              <strong>
                                {
                                  quantidadeServida
                                }
                              </strong>
                              {" / "}
                              <strong>
                                {
                                  quantidade
                                }
                              </strong>
                            </span>
                          </div>

                          {/* ---------------------------------- */}
                          {/* AÇÕES */}
                          {/* ---------------------------------- */}

                          <div className="comanda-item-acoes">

                            {/* QUANTIDADE */}
                            {podeEditar && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    alterarQuantidadeItem(
                                      item,
                                      quantidade -
                                        1
                                    )
                                  }
                                  disabled={
                                    salvando ||
                                    quantidade <=
                                      1
                                  }
                                >
                                  −
                                </button>

                                <span>
                                  {
                                    quantidade
                                  }
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    alterarQuantidadeItem(
                                      item,
                                      quantidade +
                                        1
                                    )
                                  }
                                  disabled={
                                    salvando
                                  }
                                >
                                  +
                                </button>
                              </>
                            )}

                            {/* STATUS */}
                            {!itemServido && (
                              <button
                                type="button"
                                className="comanda-btn-status"
                                onClick={() =>
                                  avancarItem(
                                    item
                                  )
                                }
                                disabled={
                                  salvando
                                }
                              >
                                {status ===
                                  "PENDENTE" &&
                                  "Enviar para cozinha"}

                                {status ===
                                  "ENVIADO" &&
                                  "Iniciar preparo"}

                                {status ===
                                  "PREPARANDO" &&
                                  "Marcar como pronto"}

                                {status ===
                                  "PRONTO" &&
                                  "Servir 1"}

                                {status ===
                                  "PARCIALMENTE_SERVIDO" &&
                                  "Servir +1"}
                              </button>
                            )}

                            {/* SERVIDO */}
                            {itemServido && (
                              <span className="comanda-item-servido">
                                ✓ Servido
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )
                )}
              </div>

              {/* ============================================= */}
              {/* TOTAIS */}
              {/* ============================================= */}

              <div className="comanda-totais">

                <div className="comanda-total-linha">
                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {formatarMoeda(
                      comanda.resumo?.subtotal ??
                        comanda.subtotal ??
                        totalComanda
                    )}
                  </strong>
                </div>

                {Number(
                  comanda.desconto || 0
                ) > 0 && (
                  <div className="comanda-total-linha">
                    <span>
                      Desconto
                    </span>

                    <strong>
                      -{" "}
                      {formatarMoeda(
                        comanda.desconto
                      )}
                    </strong>
                  </div>
                )}

                <div className="comanda-total-linha comanda-total-final">
                  <span>
                    Total
                  </span>

                  <strong>
                    {formatarMoeda(
                      totalComanda
                    )}
                  </strong>
                </div>

                {totalPago > 0 && (
                  <>
                    <div className="comanda-total-linha">
                      <span>
                        Pago
                      </span>

                      <strong>
                        {formatarMoeda(
                          totalPago
                        )}
                      </strong>
                    </div>

                    <div className="comanda-total-linha">
                      <span>
                        Restante
                      </span>

                      <strong>
                        {formatarMoeda(
                          restante
                        )}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* ============================================= */}
              {/* FECHAR */}
              {/* ============================================= */}

              <button
                type="button"
                className="comanda-btn-principal"
                onClick={
                  iniciarFechamento
                }
                disabled={
                  salvando ||
                  comanda.status !==
                    "ABERTA" ||
                  !comanda.itens?.length
                }
              >
                Fechar e receber
              </button>
            </div>
          </aside>
        </main>
      </div>

      {/* ===================================================== */}
      {/* MODAL DE PAGAMENTO */}
      {/* ===================================================== */}

      {mostrarPagamento && (
        <div className="pagamento-overlay">
          <div className="pagamento-modal">

            {/* =============================================== */}
            {/* CABEÇALHO */}
            {/* =============================================== */}

            <div className="pagamento-header">
              <div>
                <h2>
                  Receber comanda
                </h2>

                <p>
                  Mesa{" "}
                  {comanda.mesa?.numero}
                </p>
              </div>

              <button
                type="button"
                className="pagamento-fechar"
                onClick={() =>
                  setMostrarPagamento(
                    false
                  )
                }
                disabled={
                  processandoPagamento
                }
              >
                ×
              </button>
            </div>

            {/* =============================================== */}
            {/* TOTAL */}
            {/* =============================================== */}

            <div className="pagamento-total">
              <span>
                Total da comanda
              </span>

              <strong>
                {formatarMoeda(
                  totalComanda
                )}
              </strong>
            </div>

            {/* =============================================== */}
            {/* RESTANTE */}
            {/* =============================================== */}

            <div className="pagamento-restante">
              <span>
                Restante
              </span>

              <strong>
                {formatarMoeda(
                  restante
                )}
              </strong>
            </div>

            {/* =============================================== */}
            {/* FORMULÁRIO */}
            {/* =============================================== */}

            <div className="pagamento-form">

              <label htmlFor="formaPagamento">
                Forma de pagamento
              </label>

              <div className="formas-pagamento">

                <button
                  type="button"
                  className={
                    formaPagamento ===
                    "DINHEIRO"
                      ? "forma-selecionada"
                      : ""
                  }
                  onClick={() =>
                    setFormaPagamento(
                      "DINHEIRO"
                    )
                  }
                  disabled={
                    processandoPagamento
                  }
                >
                  💵
                  <span>
                    Dinheiro
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    formaPagamento ===
                    "PIX"
                      ? "forma-selecionada"
                      : ""
                  }
                  onClick={() =>
                    setFormaPagamento(
                      "PIX"
                    )
                  }
                  disabled={
                    processandoPagamento
                  }
                >
                  🔑
                  <span>
                    PIX
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    formaPagamento ===
                    "CARTAO"
                      ? "forma-selecionada"
                      : ""
                  }
                  onClick={() =>
                    setFormaPagamento(
                      "CARTAO"
                    )
                  }
                  disabled={
                    processandoPagamento
                  }
                >
                  💳
                  <span>
                    Cartão
                  </span>
                </button>

              </div>

              <label htmlFor="valorPagamento">
                Valor recebido
              </label>

              <input
                id="valorPagamento"
                type="number"
                min="0"
                step="0.01"
                value={
                  valorPagamento
                }
                onChange={(event) =>
                  setValorPagamento(
                    event.target.value
                  )
                }
                disabled={
                  processandoPagamento
                }
              />
            </div>

            {/* =============================================== */}
            {/* AÇÕES */}
            {/* =============================================== */}

            <div className="pagamento-acoes">

              <button
                type="button"
                className="pagamento-cancelar"
                onClick={() =>
                  setMostrarPagamento(
                    false
                  )
                }
                disabled={
                  processandoPagamento
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="pagamento-confirmar"
                onClick={
                  registrarPagamento
                }
                disabled={
                  processandoPagamento
                }
              >
                {processandoPagamento
                  ? "Processando..."
                  : "Confirmar pagamento"}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}