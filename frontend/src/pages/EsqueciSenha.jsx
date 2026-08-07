import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function EsqueciSenha() {

    const [email, setEmail] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [carregando, setCarregando] = useState(false);

    async function enviar(e) {
        e.preventDefault();

        try {

            setCarregando(true);

            const resposta = await api.post("/auth/esqueci-senha", {
                email
            });

            setMensagem(resposta.data.message);

        } catch (error) {

            alert(error.response?.data?.error || "Erro.");

        } finally {

            setCarregando(false);

        }
    }

    return (

        <div className="login-container">

            <div className="login-card">

                <h2>Esqueci minha senha</h2>

                <p className="subtitle">
                    Informe seu e-mail para receber o link de recuperação.
                </p>

                <form onSubmit={enviar}>

                    <div className="field">

                        <input
                            type="email"
                            placeholder="E-mail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                    </div>

                    <button
                        className="login-button"
                        disabled={carregando}
                    >
                        {carregando ? "Enviando..." : "Enviar link"}
                    </button>

                </form>

                {mensagem && (
                    <p
                        style={{
                            marginTop:20,
                            color:"green"
                        }}
                    >
                        {mensagem}
                    </p>
                )}

                <Link
                    to="/login"
                    className="switch-button"
                >
                    Voltar ao login
                </Link>

            </div>

        </div>

    );

}