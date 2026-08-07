import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
  Package,
  Mail,
  Lock,
  User,
  ArrowRight
} from "lucide-react";


export default function Login() {


  const [modo, setModo] = useState("login");


  const [form,setForm] = useState({
    nome:"",
    email:"",
    senha:""
  });


  const navigate = useNavigate();



  const alterar = (e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };




  const entrar = async(e)=>{

    e.preventDefault();


    try{


      if(modo==="registro"){


        await api.post("/auth/registro",{
          nome:form.nome,
          email:form.email,
          senha:form.senha
        });


        alert("Conta criada. Agora faça login.");

        setModo("login");

        return;

      }



      const resposta = await api.post("/auth/login",{
        email:form.email,
        senha:form.senha
      });



      localStorage.setItem(
        "token",
        resposta.data.token
      );


      localStorage.setItem(
        "usuarioNome",
        resposta.data.usuario.nome
      );


      navigate("/");



    }catch(error){


      alert(
        error.response?.data?.error ||
        "Erro ao autenticar."
      );


    }


  };




return (

<div className="login-container">


  <div className="login-brand">


      <div className="brand-logo">
        <Package size={42}/>
      </div>


      <h1>
        Controle de Estoque
      </h1>


      <p>
        Gerencie produtos, fornecedores,
        movimentações e relatórios
        em um único sistema.
      </p>


      <div className="features">

        <span>
          ✓ Controle de entradas e saídas
        </span>

        <span>
          ✓ Relatórios profissionais
        </span>

        <span>
          ✓ Gestão completa do estoque
        </span>

      </div>


  </div>





  <div className="login-card">


      <h2>
        {modo==="login"
        ?"Bem-vindo de volta"
        :"Criar conta"}
      </h2>


      <p className="subtitle">
        {modo==="login"
        ?"Entre para acessar o painel"
        :"Cadastre seu usuário no sistema"}
      </p>



      <form onSubmit={entrar}>


      {modo==="registro" && (

      <div className="field">

        <User size={18}/>

        <input
          name="nome"
          placeholder="Nome completo"
          value={form.nome}
          onChange={alterar}
        />

      </div>

      )}





      <div className="field">

        <Mail size={18}/>

        <input
          name="email"
          type="email"
          placeholder="E-mail"
          value={form.email}
          onChange={alterar}
        />

      </div>





      <div className="field">

        <Lock size={18}/>

        <input
          name="senha"
          type="password"
          placeholder="Senha"
          value={form.senha}
          onChange={alterar}
        />

      </div>





      <button
        className="login-button"
        type="submit"
      >

        {modo==="login"
        ?"Entrar"
        :"Cadastrar"}

        <ArrowRight size={18}/>

      </button>



      </form>





      <button
        className="switch-button"
        onClick={()=>
          setModo(
            modo==="login"
            ?"registro"
            :"login"
          )
        }
      >

      {modo==="login"
      ?"Ainda não possui conta? Criar usuário"
      :"Já possui conta? Entrar"}

      </button>


{modo === "login" && (
  <div
    style={{
      textAlign: "center",
      marginTop: 10
    }}
  >
    <Link
      to="/esqueci-senha"
      className="switch-button"
    >
      Esqueci minha senha
    </Link>
  </div>
)}

  </div>


</div>

);


}