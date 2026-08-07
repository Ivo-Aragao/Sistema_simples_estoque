import { useRef, useState, useEffect } from "react";
import api from "../services/api";

export default function XmlNfe() {
  const inputRef = useRef(null);

  const [arquivo, setArquivo] = useState(null);
  const [itens, setItens] = useState([]);

  useEffect(() => {
    console.log("Estado itens:", itens);
  }, [itens]);

  async function importar() {
    if (!arquivo) {
      alert("Selecione um arquivo XML.");
      return;
    }

    try {
      const form = new FormData();
      form.append("xml", arquivo);

      const res = await api.post("/importacoes/xml", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Resposta do backend:", res.data);

      // Atualiza os itens recebidos
      setItens(res.data.itens || []);

      alert("XML importado com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Erro ao importar XML.");
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">Importação de XML da NFe</h2>

      <p className="page-subtitle">
        Entrada de mercadorias vinculada ao documento fiscal
      </p>

      <div className="panel">
        <h3>Selecionar arquivo XML</h3>

        <div className="xml-upload">
          <input
            className="input"
            type="text"
            readOnly
            value={arquivo ? arquivo.name : ""}
            placeholder="Selecione um arquivo XML"
          />

          <input
            ref={inputRef}
            type="file"
            accept=".xml"
            style={{ display: "none" }}
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
          />

          <button
            className="btn btn-outline"
            onClick={() => inputRef.current?.click()}
          >
            Procurar
          </button>

          <button
            className="btn btn-primary"
            onClick={importar}
          >
            Importar itens
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Itens identificados no XML</h3>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Qtd.</th>
                <th>Valor</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {itens.length > 0 ? (
                itens.map((item, index) => (
                  <tr key={index}>
                    <td>{item.codigo || "-"}</td>
                    <td>{item.nome}</td>
                    <td>{item.quantidade}</td>
                    <td>R$ {Number(item.valor).toFixed(2)}</td>
                    <td>
                      <span
                        className={
                          item.acao === "Criado"
                            ? "badge badge-success"
                            : "badge badge-warning"
                        }
                      >
                        {item.acao}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    Nenhum item encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}