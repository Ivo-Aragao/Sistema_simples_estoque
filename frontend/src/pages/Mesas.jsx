import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Mesas.css";

const STATUS = {
  LIVRE: "LIVRE",
  OCUPADA: "OCUPADA",
  RESERVADA: "RESERVADA",
};

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Mesas() {
  const [mesas, setMesas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [numero, setNumero] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    carregarMesas();
  }, []);

  async function carregarMesas() {
    try {
      setCarregando(true);
      setErro("");

      const response = await api.get("/mesas");

      setMesas(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar mesas:", error);

      setErro(
        error.response?.data?.error ||
          "Não foi possível carregar as mesas."
      );
    } finally {
      setCarregando(false);
    }
  }

  function abrirFormulario() {
    setNumero("");
    setCapacidade("");
    setObservacao("");
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    setNumero("");
    setCapacidade("");
    setObservacao("");
    setMostrarFormulario(false);
  }

  async function criarMesa(event) {
    event.preventDefault();

    const numeroNumerico = Number(numero);

    if (
      !Number.isInteger(numeroNumerico) ||
      numeroNumerico <= 0
    ) {
      alert("Informe um número de mesa válido.");
      return;
    }

    try {
      setSalvando(true);

      await api.post("/mesas", {
        numero: numeroNumerico,
        capacidade:
          capacidade === ""
            ? null
            : Number(capacidade),
        observacao:
          observacao.trim() || null,
      });

      fecharFormulario();

      await carregarMesas();
    } catch (error) {
      console.error("Erro ao criar mesa:", error);

      alert(
        error.response?.data?.error ||
          "Não foi possível criar a mesa."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMesa(mesa) {
    if (mesa.status === STATUS.OCUPADA) {
      alert(
        "Não é possível excluir uma mesa ocupada."
      );
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente excluir a Mesa ${mesa.numero}?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await api.delete(`/mesas/${mesa.id}`);

      await carregarMesas();
    } catch (error) {
      console.error("Erro ao excluir mesa:", error);

      alert(
        error.response?.data?.error ||
          "Não foi possível excluir a mesa."
      );
    }
  }

  async function abrirMesa(mesa) {
  if (mesa.status === STATUS.RESERVADA) {
    alert("Esta mesa está reservada.");
    return;
  }

  if (mesa.status === STATUS.OCUPADA) {
    if (mesa.comandaAberta?.id) {
      window.location.href = `/comandas/${mesa.comandaAberta.id}`;
      return;
    }

    alert("Esta mesa está ocupada.");
    return;
  }

  try {
    setSalvando(true);

    const response = await api.post("/comandas", {
      mesaId: mesa.id,
    });

    const comanda = response.data;

    window.location.href = `/comandas/${comanda.id}`;
  } catch (error) {
    console.error("Erro ao abrir comanda:", error);

    alert(
      error.response?.data?.error ||
        "Não foi possível abrir a comanda."
    );

    await carregarMesas();
  } finally {
    setSalvando(false);
  }
}

  function obterClasseStatus(status) {
    if (status === STATUS.OCUPADA) {
      return "mesa-card mesa-ocupada";
    }

    if (status === STATUS.RESERVADA) {
      return "mesa-card mesa-reservada";
    }

    return "mesa-card mesa-livre";
  }

  function obterTextoStatus(status) {
    if (status === STATUS.OCUPADA) {
      return "Ocupada";
    }

    if (status === STATUS.RESERVADA) {
      return "Reservada";
    }

    return "Livre";
  }

  if (carregando) {
    return (
      <div className="mesas-page">
        <div className="mesas-container">
          <div className="mesas-loading">
            Carregando mesas...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mesas-page">
      <div className="mesas-container">

        {/* =====================================================
            CABEÇALHO
        ====================================================== */}

        <div className="mesas-header">
  <div className="mesas-header-esquerda">
    <button
      type="button"
      className="mesas-btn secundario mesas-btn-voltar"
      onClick={() => navigate("/")}
    >
      ← Dashboard
    </button>

    <div>
      <h1>Mesas</h1>

      <p>
        Controle as mesas, comandas e atendimento
        do seu estabelecimento.
      </p>
    </div>
  </div>

  <div className="mesas-header-acoes">
    <button
      type="button"
      className="mesas-btn secundario"
      onClick={carregarMesas}
    >
      ↻ Atualizar
    </button>

    <button
      type="button"
      className="mesas-btn principal"
      onClick={abrirFormulario}
    >
      + Nova mesa
    </button>
  </div>
</div>

        {/* =====================================================
            ERRO
        ====================================================== */}

        {erro && (
          <div className="mesas-alerta">
            {erro}
          </div>
        )}

        {/* =====================================================
            RESUMO
        ====================================================== */}

        <div className="mesas-resumo">

          <div className="mesas-resumo-item">
            <div className="mesas-resumo-icone livre">
              ✓
            </div>

            <div>
              <span>Livres</span>

              <strong>
                {
                  mesas.filter(
                    (mesa) =>
                      mesa.status === STATUS.LIVRE
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="mesas-resumo-item">
            <div className="mesas-resumo-icone ocupada">
              ●
            </div>

            <div>
              <span>Ocupadas</span>

              <strong>
                {
                  mesas.filter(
                    (mesa) =>
                      mesa.status === STATUS.OCUPADA
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="mesas-resumo-item">
            <div className="mesas-resumo-icone reservada">
              ◷
            </div>

            <div>
              <span>Reservadas</span>

              <strong>
                {
                  mesas.filter(
                    (mesa) =>
                      mesa.status === STATUS.RESERVADA
                  ).length
                }
              </strong>
            </div>
          </div>

          <div className="mesas-resumo-item">
            <div className="mesas-resumo-icone total">
              #
            </div>

            <div>
              <span>Total de mesas</span>

              <strong>{mesas.length}</strong>
            </div>
          </div>

        </div>

        {/* =====================================================
            LEGENDA
        ====================================================== */}

        <div className="mesas-legenda">
          <span>
            <i className="legenda-ponto livre"></i>
            Livre
          </span>

          <span>
            <i className="legenda-ponto ocupada"></i>
            Ocupada
          </span>

          <span>
            <i className="legenda-ponto reservada"></i>
            Reservada
          </span>
        </div>

        {/* =====================================================
            MESAS
        ====================================================== */}

        {mesas.length === 0 ? (
          <div className="mesas-vazio">
            <div className="mesas-vazio-icone">
              🍽️
            </div>

            <h2>Nenhuma mesa cadastrada</h2>

            <p>
              Cadastre a primeira mesa para começar
              a controlar o atendimento.
            </p>

            <button
              type="button"
              className="mesas-btn principal"
              onClick={abrirFormulario}
            >
              + Cadastrar primeira mesa
            </button>
          </div>
        ) : (
          <div className="mesas-grid">
            {mesas.map((mesa) => {
              const comanda = mesa.comandaAberta;

              return (
                <div
                  key={mesa.id}
                  className={obterClasseStatus(
                    mesa.status
                  )}
                >
                  {/* topo */}

                  <div className="mesa-topo">
                    <div>
                      <span className="mesa-label">
                        MESA
                      </span>

                      <strong className="mesa-numero">
                        {String(mesa.numero).padStart(
                          2,
                          "0"
                        )}
                      </strong>
                    </div>

                    <span className="mesa-status">
                      <i></i>
                      {obterTextoStatus(
                        mesa.status
                      )}
                    </span>
                  </div>

                  {/* conteúdo */}

                  <div className="mesa-conteudo">

                    {mesa.capacidade && (
                      <div className="mesa-info">
                        👥 {mesa.capacidade} lugares
                      </div>
                    )}

                    {mesa.status ===
                      STATUS.OCUPADA &&
                      comanda && (
                        <>
                          <div className="mesa-comanda">
                            <span>
                              Comanda
                            </span>

                            <strong>
                              #{comanda.id}
                            </strong>
                          </div>

                          <div className="mesa-total">
                            <span>Total atual</span>

                            <strong>
                              {formatarMoeda(
                                comanda.total
                              )}
                            </strong>
                          </div>
                        </>
                      )}

                    {mesa.status ===
                      STATUS.LIVRE && (
                      <div className="mesa-disponivel">
                        Pronta para atendimento
                      </div>
                    )}

                    {mesa.status ===
                      STATUS.RESERVADA && (
                      <div className="mesa-disponivel">
                        Mesa reservada
                      </div>
                    )}

                  </div>

                  {/* ações */}

                  <div className="mesa-acoes">

                    <button
                      type="button"
                      className="mesa-btn-abrir"
                      onClick={() =>
                        abrirMesa(mesa)
                      }
                    >
                      {mesa.status ===
                      STATUS.LIVRE
                        ? "Abrir mesa"
                        : mesa.status ===
                          STATUS.OCUPADA
                        ? "Ver comanda"
                        : "Visualizar"}
                    </button>

                    {mesa.status !==
                      STATUS.OCUPADA && (
                      <button
                        type="button"
                        className="mesa-btn-excluir"
                        onClick={() =>
                          excluirMesa(mesa)
                        }
                        title="Excluir mesa"
                      >
                        ×
                      </button>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =====================================================
            MODAL NOVA MESA
        ====================================================== */}

        {mostrarFormulario && (
          <div
            className="mesa-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                fecharFormulario();
              }
            }}
          >
            <div className="mesa-modal">

              <div className="mesa-modal-header">
                <div>
                  <h2>Nova mesa</h2>

                  <p>
                    Cadastre uma mesa para o
                    estabelecimento.
                  </p>
                </div>

                <button
                  type="button"
                  className="mesa-modal-fechar"
                  onClick={fecharFormulario}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={criarMesa}
              >

                <div className="mesa-form-grid">

                  <div className="mesa-form-campo">
                    <label htmlFor="numero">
                      Número da mesa
                    </label>

                    <input
                      id="numero"
                      type="number"
                      min="1"
                      value={numero}
                      onChange={(event) =>
                        setNumero(
                          event.target.value
                        )
                      }
                      placeholder="Ex.: 1"
                      autoFocus
                    />
                  </div>

                  <div className="mesa-form-campo">
                    <label htmlFor="capacidade">
                      Capacidade
                    </label>

                    <input
                      id="capacidade"
                      type="number"
                      min="1"
                      value={capacidade}
                      onChange={(event) =>
                        setCapacidade(
                          event.target.value
                        )
                      }
                      placeholder="Ex.: 4"
                    />
                  </div>

                </div>

                <div className="mesa-form-campo">
                  <label htmlFor="observacao">
                    Observação
                  </label>

                  <textarea
                    id="observacao"
                    value={observacao}
                    onChange={(event) =>
                      setObservacao(
                        event.target.value
                      )
                    }
                    placeholder="Ex.: mesa próxima ao balcão"
                    rows="3"
                  />
                </div>

                <div className="mesa-modal-acoes">

                  <button
                    type="button"
                    className="mesas-btn secundario"
                    onClick={fecharFormulario}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="mesas-btn principal"
                    disabled={salvando}
                  >
                    {salvando
                      ? "Salvando..."
                      : "Criar mesa"}
                  </button>

                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}