import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">Gestão facil</div>
        <p className="brand-sub">Gestão simples para pequenos negócios</p>
      </div>

      <nav className="menu">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? "menu-link active" : "menu-link"
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/vendas"
          className={({ isActive }) =>
            isActive ? "menu-link active" : "menu-link"
          }
        >
          Vendas
        </NavLink>
          <NavLink
            to="/mesas"
            className={({ isActive }) =>
              isActive
                ? "menu-link active"
                : "menu-link"
            }
          >
            Restaurante
          </NavLink>
        <NavLink
          to="/produtos"
          className={({ isActive }) =>
            isActive ? "menu-link active" : "menu-link"
          }
        >
          Produtos
        </NavLink>

        <NavLink
          to="/movimentacoes"
          className={({ isActive }) =>
            isActive ? "menu-link active" : "menu-link"
          }
        >
          Movimentações
        </NavLink>

          <NavLink
            to="/xml-nfe"
            className={({ isActive }) =>
              isActive ? "menu-link active" : "menu-link"
            }
          >
            XML da NFe
          </NavLink>
        <NavLink
          to="/relatorios"
          className={({ isActive }) =>
            isActive ? "menu-link active" : "menu-link"
          }
        >
          Relatórios
        </NavLink>

        <NavLink 
        to="/configuracoes"
        className={({ isActive }) =>
            isActive ? "menu-link active" : "menu-link"
          }
        >
          Configurações
        </NavLink>
      </nav>
    </aside>
  );
}