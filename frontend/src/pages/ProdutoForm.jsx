import { useEffect, useMemo, useState } from "react";

const vazio = {
  nome: "",
  codigoBarra: "",
  descricao: "",
  precoCusto: "",
  precoVenda: "",
  quantidade: "",
  estoqueMinimo: "5",
  disponivelVenda: true,
  disponivelComanda: false,
};

const MARGEM_PADRAO = 30;

function calcularPrecoPorMargem(custo, margem) {
  const custoNumerico = Number(custo);
  const margemNumerica = Number(margem);

  if (
    !Number.isFinite(custoNumerico) ||
    custoNumerico <= 0 ||
    !Number.isFinite(margemNumerica) ||
    margemNumerica < 0 ||
    margemNumerica >= 100
  ) {
    return 0;
  }

  return custoNumerico / (1 - margemNumerica / 100);
}

function calcularMargem(custo, venda) {
  const custoNumerico = Number(custo);
  const vendaNumerica = Number(venda);

  if (
    !Number.isFinite(custoNumerico) ||
    custoNumerico <= 0 ||
    !Number.isFinite(vendaNumerica) ||
    vendaNumerica <= 0
  ) {
    return 0;
  }

  return (
    ((vendaNumerica - custoNumerico) / vendaNumerica) *
    100
  );
}

function calcularMarkup(custo, venda) {
  const custoNumerico = Number(custo);
  const vendaNumerica = Number(venda);

  if (
    !Number.isFinite(custoNumerico) ||
    custoNumerico <= 0 ||
    !Number.isFinite(vendaNumerica)
  ) {
    return 0;
  }

  return (
    ((vendaNumerica - custoNumerico) / custoNumerico) *
    100
  );
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ProdutoForm({
  initialData,
  onSave,
  onCancel,
  salvando,
}) {
  const [form, setForm] = useState(vazio);
  const [margemDesejada, setMargemDesejada] =
    useState(MARGEM_PADRAO);

  useEffect(() => {
    if (initialData) {
      const precoCusto = initialData.precoCusto ?? "";
      const precoVenda = initialData.precoVenda ?? "";

      const margemAtual = calcularMargem(
        precoCusto,
        precoVenda
      );

      setForm({
        nome: initialData.nome || "",
        codigoBarra: initialData.codigoBarra || "",
        descricao: initialData.descricao || "",
        precoCusto,
        precoVenda,
        quantidade: initialData.quantidade ?? "",
        estoqueMinimo: initialData.estoqueMinimo ?? "5",

        disponivelVenda:
          initialData.disponivelVenda ?? true,

        disponivelComanda:
          initialData.disponivelComanda ?? false,
      });

      setMargemDesejada(
        margemAtual > 0 && margemAtual < 100
          ? Number(margemAtual.toFixed(2))
          : MARGEM_PADRAO
      );
    } else {
      setForm(vazio);
      setMargemDesejada(MARGEM_PADRAO);
    }
  }, [initialData]);

  const alterar = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((atual) => ({
      ...atual,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  function alterarCusto(e) {
    const value = e.target.value;

    setForm((atual) => {
      const precoVendaCalculado =
        calcularPrecoPorMargem(
          value,
          margemDesejada
        );

      return {
        ...atual,
        precoCusto: value,
        precoVenda:
          precoVendaCalculado > 0
            ? precoVendaCalculado.toFixed(2)
            : "",
      };
    });
  }

  function alterarMargem(e) {
    const value = e.target.value;

    setMargemDesejada(value);

    setForm((atual) => {
      const precoVendaCalculado =
        calcularPrecoPorMargem(
          atual.precoCusto,
          value
        );

      return {
        ...atual,
        precoVenda:
          precoVendaCalculado > 0
            ? precoVendaCalculado.toFixed(2)
            : atual.precoVenda,
      };
    });
  }

  function alterarPrecoVenda(e) {
    const value = e.target.value;

    setForm((atual) => ({
      ...atual,
      precoVenda: value,
    }));
  }

  const precoCustoNumerico = Number(
    form.precoCusto || 0
  );

  const precoVendaNumerico = Number(
    form.precoVenda || 0
  );

  const margemAtual = useMemo(() => {
    return calcularMargem(
      precoCustoNumerico,
      precoVendaNumerico
    );
  }, [precoCustoNumerico, precoVendaNumerico]);

  const markupAtual = useMemo(() => {
    return calcularMarkup(
      precoCustoNumerico,
      precoVendaNumerico
    );
  }, [precoCustoNumerico, precoVendaNumerico]);

  const lucroUnitario = useMemo(() => {
    if (
      !Number.isFinite(precoCustoNumerico) ||
      !Number.isFinite(precoVendaNumerico)
    ) {
      return 0;
    }

    return (
      precoVendaNumerico -
      precoCustoNumerico
    );
  }, [precoCustoNumerico, precoVendaNumerico]);

  const margemInvalida =
    margemDesejada !== "" &&
    (
      Number(margemDesejada) < 0 ||
      Number(margemDesejada) >= 100
    );

  const enviar = (e) => {
    e.preventDefault();

    if (!form.nome.trim()) {
      alert("Informe o nome do produto.");
      return;
    }

    if (precoCustoNumerico < 0) {
      alert("O preço de custo não pode ser negativo.");
      return;
    }

    if (precoVendaNumerico < 0) {
      alert("O preço de venda não pode ser negativo.");
      return;
    }

    if (margemInvalida) {
      alert(
        "A margem desejada deve estar entre 0% e 99,99%."
      );
      return;
    }

    onSave({
      nome: form.nome.trim(),
      codigoBarra: form.codigoBarra.trim() || null,
      descricao: form.descricao.trim() || null,
      precoCusto: precoCustoNumerico,
      precoVenda: precoVendaNumerico,
      quantidade: Number(form.quantidade || 0),
      estoqueMinimo: Number(
        form.estoqueMinimo || 5
      ),

      disponivelVenda: Boolean(
        form.disponivelVenda
      ),

      disponivelComanda: Boolean(
        form.disponivelComanda
      ),
    });
  };

  return (
    <form
      className="panel form"
      onSubmit={enviar}
    >
      <h3>
        {initialData
          ? "Editar produto"
          : "Novo produto"}
      </h3>

      <div className="form-grid">
        <input
          className="input"
          name="nome"
          value={form.nome}
          onChange={alterar}
          placeholder="Nome do produto"
        />

        <input
          className="input"
          name="codigoBarra"
          value={form.codigoBarra}
          onChange={alterar}
          placeholder="Código de barra"
        />

        {/* =====================================================
            PRECIFICAÇÃO
        ====================================================== */}

        <div className="precificacao-box full">
          <div className="precificacao-head">
            <div>
              <h4>Precificação</h4>
              <p>
                Defina a margem desejada para calcular
                automaticamente o preço de venda.
              </p>
            </div>
          </div>

          <div className="precificacao-grid">
            <div className="precificacao-campo">
              <label htmlFor="precoCusto">
                Preço de custo
              </label>

              <div className="precificacao-input">
                <span className="prefixo">R$</span>

                <input
                  id="precoCusto"
                  name="precoCusto"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precoCusto}
                  onChange={alterarCusto}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="precificacao-campo">
              <label htmlFor="margemDesejada">
                Margem desejada
              </label>

              <div className="precificacao-input">
                <input
                  id="margemDesejada"
                  type="number"
                  min="0"
                  max="99.99"
                  step="0.01"
                  value={margemDesejada}
                  onChange={alterarMargem}
                  placeholder="30"
                />

                <span className="sufixo">%</span>
              </div>

              {margemInvalida && (
                <small className="precificacao-erro">
                  Informe uma margem entre 0% e 99,99%.
                </small>
              )}
            </div>

            <div className="precificacao-campo">
              <label htmlFor="precoVenda">
                Preço de venda
              </label>

              <div className="precificacao-input">
                <span className="prefixo">R$</span>

                <input
                  id="precoVenda"
                  name="precoVenda"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precoVenda}
                  onChange={alterarPrecoVenda}
                  placeholder="0,00"
                />
              </div>

              <small className="precificacao-ajuda">
                Você pode ajustar manualmente o preço.
              </small>
            </div>
          </div>

          {precoCustoNumerico > 0 &&
            precoVendaNumerico > 0 && (
              <div className="precificacao-resultados">
                <div className="resultado-item">
                  <span>Lucro por unidade</span>

                  <strong>
                    {formatarMoeda(lucroUnitario)}
                  </strong>
                </div>

                <div className="resultado-item">
                  <span>Margem atual</span>

                  <strong>
                    {margemAtual.toFixed(2)}%
                  </strong>
                </div>

                <div className="resultado-item">
                  <span>Markup equivalente</span>

                  <strong>
                    {markupAtual.toFixed(2)}%
                  </strong>
                </div>
              </div>
            )}
        </div>

        {/* =====================================================
            DISPONIBILIDADE
        ====================================================== */}

        <div className="full">
          <div className="disponibilidade-box">
            <div className="disponibilidade-head">
              <h4>Onde este produto pode ser usado?</h4>

              <p>
                Escolha em quais módulos o produto ficará disponível.
              </p>
            </div>

            <label className="disponibilidade-item">
              <input
                type="checkbox"
                name="disponivelVenda"
                checked={form.disponivelVenda}
                onChange={alterar}
              />

              <div>
                <strong>Disponível para vendas</strong>

                <small>
                  Aparece no PDV e nas vendas normais.
                </small>
              </div>
            </label>

            <label className="disponibilidade-item">
              <input
                type="checkbox"
                name="disponivelComanda"
                checked={form.disponivelComanda}
                onChange={alterar}
              />

              <div>
                <strong>Disponível para comandas</strong>

                <small>
                  Aparece nas mesas e comandas do estabelecimento.
                </small>
              </div>
            </label>
          </div>
        </div>

        <input
          className="input"
          name="quantidade"
          type="number"
          min="0"
          value={form.quantidade}
          onChange={alterar}
          placeholder="Quantidade"
        />

        <div className="full">
          <input
            className="input"
            name="estoqueMinimo"
            type="number"
            min="0"
            value={form.estoqueMinimo}
            onChange={alterar}
            placeholder="Estoque mínimo"
          />

          <small className="input-help">
            Quantidade mínima antes de alertar
            estoque baixo
          </small>
        </div>

        <textarea
          className="input textarea"
          name="descricao"
          value={form.descricao}
          onChange={alterar}
          placeholder="Descrição"
        />
      </div>

      <div className="actions">
        {initialData && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}

        <button
          className="btn btn-primary"
          type="submit"
          disabled={salvando || margemInvalida}
        >
          {salvando
            ? "Salvando..."
            : "Salvar"}
        </button>
      </div>
    </form>
  );
}