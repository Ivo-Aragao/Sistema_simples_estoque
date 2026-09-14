const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../services/prisma");
const crypto = require("crypto");
const transporter = require("../services/email");

async function cadastrarUsuario(req, res) {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
    }

    const usuarioExiste = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExiste) {
      return res.status(400).json({ error: "E-mail já cadastrado." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const empresa = await prisma.empresa.create({
  data: {
    nome: nomeEmpresa,
  },
});

const usuario = await prisma.usuario.create({
  data: {
    nome,
    email,
    senha: senhaHash,
    empresaId: empresa.id,
  },
});

    res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function esqueciSenha(req,res){

try{

const {email}=req.body;

const usuario=await prisma.usuario.findUnique({
where:{email}
});

if(!usuario){

return res.json({
message:"Se o e-mail existir, enviaremos as instruções."
});

}

const token=crypto.randomBytes(32).toString("hex");

const expira=new Date(
Date.now()+15*60*1000
);

await prisma.usuario.update({

where:{
id:usuario.id
},

data:{
tokenRecuperacao:token,
tokenExpiraEm:expira
}

});


const link = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;

await transporter.sendMail({

from:process.env.EMAIL_USER,

to:usuario.email,

subject:"Recuperação de senha",

html:`
<h2>Recuperação de senha</h2>

<p>Clique no link abaixo:</p>

<a href="${link}">
Redefinir senha
</a>

<p>Este link expira em 15 minutos.</p>

`

});


res.json({
message:"Verifique seu e-mail."
});


}catch(error){

res.status(500).json({
error:error.message
});

}

}
async function redefinirSenha(req,res){

try{

const {
token,
senha
}=req.body;

const usuario=await prisma.usuario.findFirst({

where:{
tokenRecuperacao:token,
tokenExpiraEm:{
gt:new Date()
}
}

});

if(!usuario){

return res.status(400).json({
error:"Token inválido ou expirado."
});

}

const hash=await bcrypt.hash(
senha,
10
);

await prisma.usuario.update({

where:{
id:usuario.id
},

data:{
senha:hash,
tokenRecuperacao:null,
tokenExpiraEm:null
}

});

res.json({
message:"Senha alterada com sucesso."
});

}catch(error){

res.status(500).json({
error:error.message
});

}

}

async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Preencha e-mail e senha." });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(400).json({ error: "Senha inválida." });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  login,
  cadastrarUsuario,
  esqueciSenha,
  redefinirSenha
};