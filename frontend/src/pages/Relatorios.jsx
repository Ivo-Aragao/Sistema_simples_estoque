import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function Relatorios() {
  const [tipo, setTipo] = useState("estoque");

  const [dados, setDados] = useState([]);

  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  const [categoriaId, setCategoriaId] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");

  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");


  // =========================================================
  // TÍTULOS
  // =========================================================

  const TITULOS = {
    vendas: "Relatório de Vendas",
    restaurante: "Relatório do Restaurante",
    estoque: "Relatório de Estoque",
    minimo: "Produtos com Estoque Mínimo",
    zerado: "Produtos sem Estoque",
    entradas: "Relatório de Entradas",
    saidas: "Relatório de Saídas",
    historico: "Histórico de Movimentações",
    movimentados: "Produtos Mais Movimentados",
    categoria: "Produtos por Categoria",
    fornecedor: "Produtos por Fornecedor",
    inventario: "Inventário Geral",
  };


  // =========================================================
  // FORMATA MOEDA
  // =========================================================

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }


  // =========================================================
  // ORIGEM DA SAÍDA
  // =========================================================

  function obterOrigemMovimentacao(item) {
    if (item.origem) {
      return item.origem;
    }

    const texto = String(
      item.observacao || ""
    ).toLowerCase();

    if (texto.includes("comanda")) {
      return "RESTAURANTE";
    }

    if (texto.includes("venda")) {
      return "VENDA";
    }

    return "OUTRA SAÍDA";
  }


  // =========================================================
  // CARREGAR RELATÓRIO
  // =========================================================

  async function carregar(tipoSelecionado) {
    const relatorioTipo =
      tipoSelecionado || tipo;

    try {
      setCarregando(true);
      setErro("");

      const res = await api.get(
        "/relatorios",
        {
          params: {
            tipo: relatorioTipo,
            categoriaId,
            fornecedorId,
            inicio,
            fim,
          },
        }
      );

      setDados(
        Array.isArray(res.data)
          ? res.data
          : []
      );

    } catch (error) {
      console.error(
        "Erro ao carregar relatório:",
        error
      );

      setDados([]);

      setErro(
        error.response?.data?.error ||
          "Não foi possível carregar o relatório."
      );

    } finally {
      setCarregando(false);
    }
  }


  // =========================================================
  // EXPORTAR
  // =========================================================

  async function exportar(formato) {

  try {

    const response = await api.get(
      "/relatorios/exportar",
      {
        params: {
          tipo,
          formato,
          categoriaId,
          fornecedorId,
          inicio,
          fim,

          // evita cache do navegador
          _t: Date.now(),
        },

        responseType: "blob",

        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );


    const blob = new Blob(
      [response.data],
      {
        type:
          formato === "pdf"
            ? "application/pdf"
            : undefined,
      }
    );


    const url =
      window.URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href = url;

    link.download =
      `relatorio-${tipo}.${formato}`;


    document.body.appendChild(link);

    link.click();

    link.remove();


    window.URL.revokeObjectURL(url);


  } catch (error) {

    console.error(
      "Erro ao exportar relatório:",
      error
    );

    alert(
      "Erro ao gerar relatório."
    );
  }
}


  // =========================================================
  // CARREGAR CATEGORIAS E FORNECEDORES
  // =========================================================

  async function carregarFiltros() {

    try {

      const [
        cat,
        forn
      ] = await Promise.all([
        api.get("/categorias"),
        api.get("/fornecedores"),
      ]);


      setCategorias(
        Array.isArray(cat.data)
          ? cat.data
          : []
      );


      setFornecedores(
        Array.isArray(forn.data)
          ? forn.data
          : []
      );

    } catch (error) {

      console.error(
        "Erro ao carregar filtros:",
        error
      );

    }

  }


  // =========================================================
  // EFFECTS
  // =========================================================

  useEffect(() => {

    carregarFiltros();

  }, []);


  useEffect(() => {

    carregar();

  }, [
    tipo,
    categoriaId,
    fornecedorId,
    inicio,
    fim,
  ]);


  // =========================================================
  // RESUMO DO RELATÓRIO
  // =========================================================

  const resumo = useMemo(() => {

    let quantidadeTotal = 0;
    let valorTotal = 0;


    // =======================================================
    // VENDAS / RESTAURANTE
    // =======================================================

    if (
      tipo === "vendas" ||
      tipo === "restaurante"
    ) {

      dados.forEach((venda) => {

        const quantidadeItens =
          venda.itens?.reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.quantidade || 0
              ),
            0
          ) || 0;


        quantidadeTotal +=
          quantidadeItens;


        valorTotal += Number(
          venda.total || 0
        );

      });

    }


    // =======================================================
    // OUTROS RELATÓRIOS
    // =======================================================

    else {

      dados.forEach((item) => {

        const produto =
          item.produto || item;


        const quantidade =
          Number(
            item.quantidade ??
            item._sum?.quantidade ??
            0
          );


        quantidadeTotal +=
          quantidade;


        // ---------------------------------------------------
        // ENTRADAS usam preço de custo
        // ---------------------------------------------------

        if (tipo === "entradas") {

          valorTotal +=
            quantidade *
            Number(
              produto.precoCusto || 0
            );

        }


        // ---------------------------------------------------
        // DEMAIS RELATÓRIOS usam preço de venda
        // ---------------------------------------------------

        else {

          valorTotal +=
            quantidade *
            Number(
              produto.precoVenda || 0
            );

        }

      });

    }


    return {
      quantidadeTotal,
      valorTotal,
      registros: dados.length,
    };

  }, [dados, tipo]);


  // =========================================================
  // COMPONENTE DE RESUMO
  // =========================================================

  function ResumoRelatorio() {

    return (
      <div
        className="relatorio-resumo"
        style={{
          marginTop: "20px",
          padding: "18px 20px",
          borderTop: "2px solid #1E3A8A",
          background: "#f8fafc",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >

        <div>
          <span
            style={{
              display: "block",
              fontSize: "13px",
              color: "#64748b",
              marginBottom: "4px",
            }}
          >
            Registros
          </span>

          <strong
            style={{
              fontSize: "18px",
              color: "#0f172a",
            }}
          >
            {resumo.registros}
          </strong>
        </div>


        <div>
          <span
            style={{
              display: "block",
              fontSize: "13px",
              color: "#64748b",
              marginBottom: "4px",
            }}
          >
            Quantidade total
          </span>

          <strong
            style={{
              fontSize: "18px",
              color: "#0f172a",
            }}
          >
            {resumo.quantidadeTotal}
          </strong>
        </div>


        <div>
          <span
            style={{
              display: "block",
              fontSize: "13px",
              color: "#64748b",
              marginBottom: "4px",
            }}
          >
            Valor total
          </span>

          <strong
            style={{
              fontSize: "20px",
              color: "#1E3A8A",
            }}
          >
            {formatarMoeda(
              resumo.valorTotal
            )}
          </strong>
        </div>

      </div>
    );
  }


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="page">


      {/* =====================================================
          TÍTULO
      ====================================================== */}

      <h2 className="page-title">
        {TITULOS[tipo]}
      </h2>


      {/* =====================================================
          FILTROS
      ====================================================== */}

      <div className="panel">

        <div className="relatorio-filtros">

          <select
            className="input"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value)
            }
          >

            <option value="vendas">
              Vendas
            </option>

            <option value="restaurante">
              Restaurante
            </option>

            <option value="estoque">
              Estoque Completo
            </option>

            <option value="minimo">
              Estoque Mínimo
            </option>

            <option value="zerado">
              Produtos sem Estoque
            </option>

            <option value="entradas">
              Entradas
            </option>

            <option value="saidas">
              Saídas
            </option>

            <option value="historico">
              Histórico
            </option>

            <option value="movimentados">
              Produtos mais movimentados
            </option>

            <option value="categoria">
              Produtos por Categoria
            </option>

            <option value="fornecedor">
              Produtos por Fornecedor
            </option>

            <option value="inventario">
              Inventário
            </option>

          </select>


          <select
            className="input"
            value={categoriaId}
            onChange={(e) =>
              setCategoriaId(
                e.target.value
              )
            }
          >

            <option value="">
              Categoria
            </option>

            {categorias.map((c) => (

              <option
                key={c.id}
                value={c.id}
              >
                {c.nome}
              </option>

            ))}

          </select>


          <select
            className="input"
            value={fornecedorId}
            onChange={(e) =>
              setFornecedorId(
                e.target.value
              )
            }
          >

            <option value="">
              Fornecedor
            </option>

            {fornecedores.map((f) => (

              <option
                key={f.id}
                value={f.id}
              >
                {f.nome}
              </option>

            ))}

          </select>


          <input
            type="date"
            className="input"
            value={inicio}
            onChange={(e) =>
              setInicio(
                e.target.value
              )
            }
          />


          <input
            type="date"
            className="input"
            value={fim}
            onChange={(e) =>
              setFim(
                e.target.value
              )
            }
          />

        </div>


        {/* ===================================================
            BOTÕES
        ==================================================== */}

        <div className="relatorio-botoes">

          <button
            className="btn btn-primary"
            onClick={() =>
              setTipo("minimo")
            }
          >
            Estoque Mínimo
          </button>


          <button
            className="btn btn-primary"
            onClick={() =>
              exportar("pdf")
            }
          >
            PDF
          </button>


          <button
            className="btn btn-primary"
            onClick={() =>
              exportar("xlsx")
            }
          >
            Excel
          </button>


          <button
            className="btn btn-primary"
            onClick={() =>
              exportar("csv")
            }
          >
            CSV
          </button>


          <button
            className="btn btn-primary"
            onClick={() =>
              exportar("xml")
            }
          >
            XML
          </button>

        </div>

      </div>


      {/* =====================================================
          RESULTADO
      ====================================================== */}

      <div className="panel">

        {carregando && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
            }}
          >
            Carregando relatório...
          </div>
        )}


        {erro && (
          <div
            style={{
              padding: "15px",
              marginBottom: "15px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "8px",
            }}
          >
            {erro}
          </div>
        )}


        {!carregando &&
          !erro &&
          dados.length === 0 && (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Nenhum registro encontrado.
            </div>
          )}


        {!carregando &&
          dados.length > 0 && (

          <div className="table-wrap">


            {/* =================================================
                VENDAS E RESTAURANTE
            ================================================== */}

            {(tipo === "vendas" ||
              tipo === "restaurante") && (

              <>
                <table>

                  <thead>

                    <tr>

                      <th>
                        Data
                      </th>

                      <th>
                        Venda
                      </th>

                      {tipo === "restaurante" && (
                        <th>
                          Mesa
                        </th>
                      )}

                      <th>
                        Itens
                      </th>

                      <th>
                        Pagamento
                      </th>

                      <th>
                        Total
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {dados.map((venda) => {

                      const quantidadeItens =
                        venda.itens?.reduce(
                          (
                            total,
                            item
                          ) =>
                            total +
                            Number(
                              item.quantidade || 0
                            ),
                          0
                        ) || 0;


                      return (

                        <tr
                          key={venda.id}
                        >

                          <td>
                            {venda.criadoEm
                              ? new Date(
                                  venda.criadoEm
                                ).toLocaleDateString(
                                  "pt-BR"
                                )
                              : "-"}
                          </td>


                          <td>
                            #{venda.id}
                          </td>


                          {tipo === "restaurante" && (
                            <td>
                              {venda.comanda?.mesa?.numero
                                ? `Mesa ${venda.comanda.mesa.numero}`
                                : "-"}
                            </td>
                          )}


                          <td>
                            {quantidadeItens}
                          </td>


                          <td>
                            {venda.formaPagamento ||
                              "-"}
                          </td>


                          <td>
                            {formatarMoeda(
                              venda.total
                            )}
                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>


                <ResumoRelatorio />

              </>

            )}


            {/* =================================================
                ENTRADAS E SAÍDAS
            ================================================== */}

            {(tipo === "entradas" ||
              tipo === "saidas") && (

              <>

                <table>

                  <thead>

                    <tr>

                      <th>
                        Data
                      </th>

                      <th>
                        Produto
                      </th>

                      <th>
                        Quantidade
                      </th>

                      <th>
                        Preço
                      </th>

                      {tipo === "saidas" && (
                        <th>
                          Origem
                        </th>
                      )}

                      <th>
                        Observação
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {dados.map((m) => {

                      const preco =
                        tipo === "entradas"
                          ? Number(
                              m.produto?.precoCusto ||
                              0
                            )
                          : Number(
                              m.produto?.precoVenda ||
                              0
                            );


                      return (

                        <tr
                          key={m.id}
                        >

                          <td>
                            {m.dataMovimentacao
                              ? new Date(
                                  m.dataMovimentacao
                                ).toLocaleDateString(
                                  "pt-BR"
                                )
                              : "-"}
                          </td>


                          <td>
                            {m.produto?.nome ||
                              "-"}
                          </td>


                          <td>
                            {m.quantidade || 0}
                          </td>


                          <td>
                            {formatarMoeda(
                              preco
                            )}
                          </td>


                          {tipo === "saidas" && (
                            <td>
                              {obterOrigemMovimentacao(
                                m
                              )}
                            </td>
                          )}


                          <td>
                            {m.observacao ||
                              "-"}
                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>


                <ResumoRelatorio />

              </>

            )}


            {/* =================================================
                HISTÓRICO
            ================================================== */}

            {tipo === "historico" && (

              <>

                <table>

                  <thead>

                    <tr>

                      <th>
                        Data
                      </th>

                      <th>
                        Origem
                      </th>

                      <th>
                        Tipo
                      </th>

                      <th>
                        Produto
                      </th>

                      <th>
                        Quantidade
                      </th>

                      <th>
                        Observação
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {dados.map((m) => {

                      const origem =
                        m.tipo === "SAIDA"
                          ? obterOrigemMovimentacao(m)
                          : m.tipo === "ENTRADA"
                            ? "ENTRADA"
                            : "-";


                      return (

                        <tr
                          key={m.id}
                        >

                          <td>
                            {m.dataMovimentacao
                              ? new Date(
                                  m.dataMovimentacao
                                ).toLocaleDateString(
                                  "pt-BR"
                                )
                              : "-"}
                          </td>


                          <td>
                            {origem}
                          </td>


                          <td>
                            {m.tipo || "-"}
                          </td>


                          <td>
                            {m.produto?.nome ||
                              "-"}
                          </td>


                          <td>
                            {m.quantidade || 0}
                          </td>


                          <td>
                            {m.observacao ||
                              "-"}
                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>


                <ResumoRelatorio />

              </>

            )}


            {/* =================================================
                MAIS MOVIMENTADOS
            ================================================== */}

            {tipo === "movimentados" && (

              <>

                <table>

                  <thead>

                    <tr>

                      <th>
                        #
                      </th>

                      <th>
                        Produto
                      </th>

                      <th>
                        Total Movimentado
                      </th>

                      <th>
                        Preço
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {dados.map(
                      (item, index) => (

                        <tr
                          key={
                            item.id ||
                            item.produtoId ||
                            index
                          }
                        >

                          <td>
                            {index + 1}
                          </td>


                          <td>
                            {item.nome ||
                              item.produto?.nome ||
                              `Produto ${item.produtoId}`}
                          </td>


                          <td>
                            {item.quantidade ||
                              0}
                          </td>


                          <td>
                            {formatarMoeda(
                              item.precoVenda
                            )}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>


                <ResumoRelatorio />

              </>

            )}


            {/* =================================================
                RELATÓRIOS DE PRODUTOS
            ================================================== */}

            {[
              "vendas",
              "restaurante",
              "entradas",
              "saidas",
              "historico",
              "movimentados",
            ].includes(tipo) === false && (

              <>

                <table>

                  <thead>

                    <tr>

                      <th>
                        Produto
                      </th>

                      <th>
                        Categoria
                      </th>

                      <th>
                        Fornecedor
                      </th>

                      <th>
                        Quantidade
                      </th>

                      <th>
                        Preço
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {dados.map(
                      (item) => (

                        <tr
                          key={item.id}
                        >

                          <td>
                            {item.nome ||
                              "-"}
                          </td>


                          <td>
                            {item.categoria?.nome ||
                              "-"}
                          </td>


                          <td>
                            {item.fornecedor?.nome ||
                              "-"}
                          </td>


                          <td>
                            {item.quantidade ||
                              0}
                          </td>


                          <td>
                            {formatarMoeda(
                              item.precoVenda
                            )}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>


                <ResumoRelatorio />

              </>

            )}

          </div>

        )}

      </div>

    </div>
  );
}