import { useEffect, useState } from "react";

const vazio = {
  nome: "",
  codigoBarra: "",
  descricao: "",
  precoCusto: "",
  precoVenda: "",
  quantidade: "",
  estoqueMinimo: "5",
};

export default function ProdutoForm({ initialData, onSave, onCancel, salvando }) {
  const [form, setForm] = useState(vazio);

  useEffect(() => {
    if (initialData) {
      setForm({
        nome: initialData.nome || "",
        codigoBarra: initialData.codigoBarra || "",
        descricao: initialData.descricao || "",
        precoCusto: initialData.precoCusto ?? "",
        precoVenda: initialData.precoVenda ?? "",
        quantidade: initialData.quantidade ?? "",
        estoqueMinimo: initialData.estoqueMinimo ?? "5",
      });
    } else {
      setForm(vazio);
    }
  }, [initialData]);

  const alterar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const enviar = (e) => {
    e.preventDefault();

    onSave({
      nome: form.nome,
      codigoBarra: form.codigoBarra || null,
      descricao: form.descricao || null,
      precoCusto: Number(form.precoCusto || 0),
      precoVenda: Number(form.precoVenda || 0),
      quantidade: Number(form.quantidade || 0),
      estoqueMinimo: Number(form.estoqueMinimo || 5),
    });
  };

  return (
    <form className="panel form" onSubmit={enviar}>
      <h3>{initialData ? "Editar produto" : "Novo produto"}</h3>

      <div className="form-grid">
        <input className="input" name="nome" value={form.nome} onChange={alterar} placeholder="Nome do produto" />
        <input className="input" name="codigoBarra" value={form.codigoBarra} onChange={alterar} placeholder="Código de barra" />
        <input className="input" name="precoCusto" type="number" step="0.01" value={form.precoCusto} onChange={alterar} placeholder="Preço de custo" />
        <input className="input" name="precoVenda" type="number" step="0.01" value={form.precoVenda} onChange={alterar} placeholder="Preço de venda" />
        <input className="input" name="quantidade" type="number" value={form.quantidade} onChange={alterar} placeholder="Quantidade" />
<div className="full">
  <input
    className="input"
    name="estoqueMinimo"
    type="number"
    value={form.estoqueMinimo}
    onChange={alterar}
    placeholder="Estoque mínimo"
  />
  <small className="input-help">
    Quantidade mínima antes de alertar estoque baixo
  </small>
</div>
<textarea className="input textarea" name="descricao" value={form.descricao} onChange={alterar} placeholder="Descrição" />
      </div>

      <div className="actions">
        {initialData && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="btn btn-primary" type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}