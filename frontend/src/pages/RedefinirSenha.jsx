import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function RedefinirSenha() {

    const [senha, setSenha] = useState("");
    const [confirmar, setConfirmar] = useState("");

    const [params] = useSearchParams();

    const navigate = useNavigate();

    const token = params.get("token");

    async function salvar(e) {

        e.preventDefault();

        if (senha !== confirmar) {

            return alert("As senhas não conferem.");

        }

        try {

            await api.post("/auth/redefinir-senha", {

                token,

                senha

            });

            alert("Senha alterada com sucesso.");

            navigate("/login");

        } catch (error) {

            alert(
                error.response?.data?.error ||
                "Erro."
            );

        }

    }

    return (

        <div className="login-container">

            <div className="login-card">

                <h2>Nova senha</h2>

                <p className="subtitle">
                    Informe sua nova senha.
                </p>

                <form onSubmit={salvar}>

                    <div className="field">

                        <input
                            type="password"
                            placeholder="Nova senha"
                            value={senha}
                            onChange={(e)=>setSenha(e.target.value)}
                            required
                        />

                    </div>

                    <div className="field">

                        <input
                            type="password"
                            placeholder="Confirmar senha"
                            value={confirmar}
                            onChange={(e)=>setConfirmar(e.target.value)}
                            required
                        />

                    </div>

                    <button className="login-button">

                        Salvar nova senha

                    </button>

                </form>

            </div>

        </div>

    );

}