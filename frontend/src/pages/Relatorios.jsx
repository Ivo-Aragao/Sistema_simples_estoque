import { useEffect, useState } from "react";
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

  async function carregar(tipoSelecionado) {

const relatorioTipo = tipoSelecionado || tipo;

const res = await api.get("/relatorios",{
 params:{
   tipo: relatorioTipo,
   categoriaId,
   fornecedorId,
   inicio,
   fim
 }
});

setDados(
 Array.isArray(res.data)
 ? res.data
 : []
);

}
async function exportar(formato){

  try{


    const response = await api.get("/relatorios/exportar",{

      params:{
        tipo,
        formato,
        categoriaId,
        fornecedorId,
        inicio,
        fim
      },

      responseType:"blob"

    });



    const url = window.URL.createObjectURL(
      new Blob([response.data])
    );


    const link = document.createElement("a");

    link.href=url;


    let extensao=formato;


    link.setAttribute(
      "download",
      `relatorio.${extensao}`
    );


    document.body.appendChild(link);


    link.click();


    link.remove();



  }catch(error){

    console.log(error);

    alert("Erro ao gerar relatório");

  }

}
  async function carregarFiltros() {
    const [cat, forn] = await Promise.all([
      api.get("/categorias"),
      api.get("/fornecedores"),
    ]);

    setCategorias(cat.data);
    setFornecedores(forn.data);
  }

  useEffect(() => {
    carregarFiltros();
  }, []);

  useEffect(() => {
    carregar();
  }, [tipo, categoriaId, fornecedorId, inicio, fim]);

  const TITULOS = {
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
  return (
    <div className="page">

      <h2 className="page-title">
  {TITULOS[tipo]}
</h2>

      <div className="panel">

        <div className="relatorio-filtros">

          <select
            className="input"
            value={tipo}
            onChange={(e)=>setTipo(e.target.value)}
          >

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
            onChange={(e)=>setCategoriaId(e.target.value)}
          >

            <option value="">
              Categoria
            </option>

            {categorias.map(c=>(
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
            onChange={(e)=>setFornecedorId(e.target.value)}
          >

            <option value="">
              Fornecedor
            </option>

            {fornecedores.map(f=>(
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
            onChange={(e)=>setInicio(e.target.value)}
          />

          <input
            type="date"
            className="input"
            value={fim}
            onChange={(e)=>setFim(e.target.value)}
          />

        </div>

        <div className="relatorio-botoes">

            <button
                className="btn btn-primary"
                onClick={() => carregar("minimo")}
                >
                Estoque Mínimo
                </button>

          <button
            className="btn btn-primary"
            onClick={()=>exportar("pdf")}
            >
            PDF
            </button>


            <button
            className="btn btn-primary"
            onClick={()=>exportar("xlsx")}
            >
            Excel
            </button>


            <button
            className="btn btn-primary"
            onClick={()=>exportar("csv")}
            >
            CSV
            </button>


            <button
            className="btn btn-primary"
            onClick={()=>exportar("xml")}
            >
            XML
            </button>
        </div>

      </div>

      <div className="panel">

        <div className="table-wrap">

  {/* ENTRADAS E SAÍDAS */}
  {(tipo === "entradas" || tipo === "saidas") && (
    <table>

      <thead>
        <tr>
          <th>Data</th>
          <th>Produto</th>
          <th>Quantidade</th>
          <th>Observação</th>
        </tr>
      </thead>

      <tbody>
        {dados.map((m) => (
          <tr key={m.id}>
            <td>
              {m.dataMovimentacao
                ? new Date(m.dataMovimentacao).toLocaleDateString("pt-BR")
                : "-"}
            </td>

            <td>{m.produto?.nome || "-"}</td>

            <td>{m.quantidade}</td>

            <td>{m.observacao || "-"}</td>
          </tr>
        ))}
      </tbody>

    </table>
  )}

  {/* HISTÓRICO */}
  {tipo === "historico" && (
    <table>

      <thead>
        <tr>
          <th>Data</th>
          <th>Tipo</th>
          <th>Produto</th>
          <th>Quantidade</th>
          <th>Observação</th>
        </tr>
      </thead>

      <tbody>
        {dados.map((m) => (
          <tr key={m.id}>
            <td>
              {m.dataMovimentacao
                ? new Date(m.dataMovimentacao).toLocaleDateString("pt-BR")
                : "-"}
            </td>

            <td>{m.tipo}</td>

            <td>{m.produto?.nome || "-"}</td>

            <td>{m.quantidade}</td>

            <td>{m.observacao || "-"}</td>
          </tr>
        ))}
      </tbody>

    </table>
  )}

  {/* MAIS MOVIMENTADOS */}
  {tipo === "movimentados" && (
    <table>

      <thead>
        <tr>
          <th>#</th>
          <th>Produto</th>
          <th>Total Movimentado</th>
        </tr>
      </thead>

      <tbody>
        {dados.map((item, index) => (
          <tr key={index}>
            <td>{index + 1}</td>

            <td>
              {item.produto?.nome ||
                item.nome ||
                `Produto ${item.produtoId}`}
            </td>

            <td>{item._sum?.quantidade || 0}</td>
          </tr>
        ))}
      </tbody>

    </table>
  )}

  {/* RELATÓRIOS DE PRODUTOS */}
  {!["entradas", "saidas", "historico", "movimentados"].includes(tipo) && (
    <table>

      <thead>
        <tr>
          <th>Produto</th>
          <th>Categoria</th>
          <th>Fornecedor</th>
          <th>Quantidade</th>
          <th>Preço</th>
        </tr>
      </thead>

      <tbody>
        {dados.map((item) => (
          <tr key={item.id}>
            <td>{item.nome}</td>

            <td>{item.categoria?.nome || "-"}</td>

            <td>{item.fornecedor?.nome || "-"}</td>

            <td>{item.quantidade}</td>

            <td>
              R$ {Number(item.precoVenda || 0).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>

    </table>
  )}

</div>
      </div>

    </div>
  );
}