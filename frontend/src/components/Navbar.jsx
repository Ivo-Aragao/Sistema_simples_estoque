export default function Navbar() {
  const nome = localStorage.getItem("usuarioNome") || "Usuário";

  const sair = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuarioNome");
    window.location.href = "/login";
  };

  return (
    <header className="navbar">
      <div>
        <h1>Sistema de Estoque</h1>
        <p>Olá, {nome}</p>
      </div>

      <button className="btn btn-outline" onClick={sair}>
        Sair
      </button>
    </header>
  );
}