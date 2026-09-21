import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Configuracoes.css";

export default function Configuracoes() {
  const navigate = useNavigate();

  const [empresa, setEmpresa] = useState(null);

  const [nome, setNome] = useState("");
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");


  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    try {
      setCarregando(true);

      const response = await api.get("/empresa");

      const dados = response.data;

      setEmpresa(dados);
      setNome(dados?.nome || "");
      setPreview(dados?.logoUrl || "");
    } catch (error) {
      console.error("Erro ao carregar empresa:", error);

      setMensagem(
        error.response?.data?.error ||
          "Não foi possível carregar os dados da empresa."
      );
    } finally {
      setCarregando(false);
    }
  }

  function selecionarLogo(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) {
      return;
    }

    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione uma imagem válida.");
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5 MB.");
      return;
    }

    setLogo(arquivo);

    const url = URL.createObjectURL(arquivo);
    setPreview(url);
  }

  async function salvarNome() {
    try {
      setSalvando(true);
      setMensagem("");

      const response = await api.put("/empresa", {
        nome,
      });

      setEmpresa(response.data);

      setMensagem("Dados da empresa salvos com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);

      setMensagem(
        error.response?.data?.error ||
          "Não foi possível salvar os dados da empresa."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function enviarLogo() {
    if (!logo) {
      return;
    }

    try {
      setSalvando(true);
      setMensagem("");

      const formData = new FormData();

      formData.append("logo", logo);

      const response = await api.post(
        "/empresa/logo",
        formData
      );

      setEmpresa(response.data);
      setPreview(response.data.logoUrl || "");
      setLogo(null);

      setMensagem("Logo atualizada com sucesso.");
    } catch (error) {
      console.error("Erro ao enviar logo:", error);

      setMensagem(
        error.response?.data?.error ||
          "Não foi possível enviar a logo."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="configuracoes-page">
        <div className="configuracoes-container">
          <div className="configuracoes-card">
            <p>Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="configuracoes-page">
    <div className="configuracoes-container">

      <div className="configuracoes-header">
        <button
          type="button"
          className="botao-voltar"
          onClick={() => navigate("/")}
        >
          ← Voltar
        </button>

        <div>
          <h1>Configurações</h1>
          <p>
            Configure os dados da sua empresa e do sistema.
          </p>
        </div>
      </div>

      {mensagem && (
        <div className="configuracoes-mensagem">
          {mensagem}
        </div>
      )}


        <div className="configuracoes-card">
          <h2>Minha Empresa</h2>

          <p className="configuracoes-descricao">
            Essas informações serão utilizadas no sistema
            e no comprovante das vendas.
          </p>

          <div className="campo-configuracao">
            <label htmlFor="nome">
              Nome da empresa
            </label>

            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(event) =>
                setNome(event.target.value)
              }
              placeholder="Nome da empresa"
            />
          </div>

          <button
            type="button"
            className="configuracoes-botao"
            onClick={salvarNome}
            disabled={salvando}
          >
            {salvando
              ? "Salvando..."
              : "Salvar nome"}
          </button>
        </div>

        <div className="configuracoes-card">
          <h2>Logo da empresa</h2>

          <p className="configuracoes-descricao">
            Escolha uma imagem para utilizar como logo
            da empresa.
          </p>

          <div className="logo-area">

            <div className="logo-preview">
              {preview ? (
                <img
                  src={preview}
                  alt="Logo da empresa"
                />
              ) : (
                <span>
                  Nenhuma logo cadastrada
                </span>
              )}
            </div>

            <div className="logo-acoes">

              <label
                htmlFor="logo"
                className="botao-escolher-logo"
              >
                Escolher imagem
              </label>

              <input
                id="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={selecionarLogo}
                hidden
              />

              {logo && (
                <>
                  <p className="nome-arquivo">
                    {logo.name}
                  </p>

                  <button
                    type="button"
                    className="configuracoes-botao"
                    onClick={enviarLogo}
                    disabled={salvando}
                  >
                    {salvando
                      ? "Enviando..."
                      : "Salvar logo"}
                  </button>
                </>
              )}

              <small>
                PNG, JPG ou WEBP. Máximo de 5 MB.
              </small>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}