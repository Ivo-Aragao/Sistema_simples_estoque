const prisma = require("../services/prisma");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { Parser } = require("json2csv");
const { create } = require("xmlbuilder2");

// ===============================
// FILTROS PADRÃO
// ===============================
function montarFiltro(req){

  const {
    categoriaId,
    fornecedorId
  } = req.query;


  const where = {
    ativo:true
  };


  if(categoriaId){

    where.categoriaId = Number(categoriaId);

  }


  if(fornecedorId){

    where.fornecedorId = Number(fornecedorId);

  }


  return where;

}
function montarFiltroMovimentacao(req, tipo = null){

    const {
        categoriaId,
        fornecedorId
    } = req.query;


    const where = {};


    if(tipo){
        where.tipo = tipo;
    }


    if(categoriaId || fornecedorId){

        where.produto = {};

    }


    if(categoriaId){

        where.produto.categoriaId = Number(categoriaId);

    }


    if(fornecedorId){

        where.produto.fornecedorId = Number(fornecedorId);

    }


    return where;

}

async function buscarDados(req){

switch(req.query.tipo){

case "estoque":
return prisma.produto.findMany({
where:montarFiltro(req),
include:{
categoria:true,
fornecedor:true
}
});

case "minimo":

return prisma.produto.findMany({
where:{
...montarFiltro(req),
quantidade:{
lte:999999
}
},
include:{
categoria:true,
fornecedor:true
}
}).then(lista=>
lista.filter(
p=>p.quantidade<=p.estoqueMinimo
)
);

case "zerado":

return prisma.produto.findMany({

where:{
...montarFiltro(req),
quantidade:0
},

include:{
categoria:true,
fornecedor:true
}

});

case "categoria":

return prisma.produto.findMany({

where:montarFiltro(req),

include:{
categoria:true,
fornecedor:true
}

});

case "fornecedor":

return prisma.produto.findMany({

where:montarFiltro(req),

include:{
categoria:true,
fornecedor:true
}

});

case "inventario":

return prisma.produto.findMany({

where:montarFiltro(req),

include:{
categoria:true,
fornecedor:true
}

});

case "entradas":

return prisma.movimentacao.findMany({

where:{
tipo:"ENTRADA"
},

include:{
produto:true
},

orderBy:{
dataMovimentacao:"desc"
}

});

case "saidas":

return prisma.movimentacao.findMany({

where:{
tipo:"SAIDA"
},

include:{
produto:true
},

orderBy:{
dataMovimentacao:"desc"
}

});

case "historico":

return prisma.movimentacao.findMany({

include:{
produto:true
},

orderBy:{
dataMovimentacao:"desc"
}

});

case "movimentados": {

  const agrupados = await prisma.movimentacao.groupBy({
    by: ["produtoId"],
    _sum: {
      quantidade: true,
    },
    orderBy: {
      _sum: {
        quantidade: "desc",
      },
    },
  });

  return agrupados;
}
default:

return [];

}

}

// ===============================
// ESTOQUE COMPLETO
// ===============================
async function estoque(req, res) {
  try {
    const produtos = await buscarDados(req);
    res.json(produtos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}



// ===============================
// ESTOQUE MÍNIMO
// ===============================
async function estoqueMinimo(req,res){

try{


const produtos = await prisma.produto.findMany({

where:
montarFiltro(req),


include:{
categoria:true,
fornecedor:true
}

});



const resultado = produtos.filter(
p=>p.quantidade <= p.estoqueMinimo
);



res.json(resultado);



}catch(error){

console.error(error);

res.status(500).json({
error:error.message
});

}


}




// ===============================
// PRODUTOS ZERADOS
// ===============================
async function produtosSemEstoque(req,res){

try{


const produtos = await prisma.produto.findMany({

where:{
...montarFiltro(req),
quantidade:0
},


include:{
categoria:true,
fornecedor:true
}

});


res.json(produtos);



}catch(error){

console.error(error);

res.status(500).json({
error:error.message
});

}

}




// ===============================
// ENTRADAS
// ===============================
async function entradas(req,res){

try{

const dados = await prisma.movimentacao.findMany({

where: montarFiltroMovimentacao(req,"ENTRADA"),

include:{
produto:{
include:{
categoria:true,
fornecedor:true
}
}
},

orderBy:{
dataMovimentacao:"desc"
}

});


res.json(dados);


}catch(error){

console.error(error);

res.status(500).json({
error:error.message
});

}

}

// ===============================
// SAÍDAS
// ===============================
async function saidas(req,res){

try{


const dados = await prisma.movimentacao.findMany({

where: montarFiltroMovimentacao(req,"SAIDA"),

include:{
produto:{
include:{
categoria:true,
fornecedor:true
}
}
},

orderBy:{
dataMovimentacao:"desc"
}

});


res.json(dados);



}catch(error){

console.error(error);


res.status(500).json({
error:error.message
});


}

}



// ===============================
// HISTÓRICO
// ===============================
async function historico(req,res){

try{


const dados = await prisma.movimentacao.findMany({

where: montarFiltroMovimentacao(req),

include:{
produto:{
include:{
categoria:true,
fornecedor:true
}
}
},

orderBy:{
dataMovimentacao:"desc"
}

});


res.json(dados);


}catch(error){

console.error(error);


res.status(500).json({
error:error.message
});


}

}
// ===============================
// PRODUTOS MAIS MOVIMENTADOS
// ===============================
async function movimentados(req,res){

try{


const movimentacoes = await prisma.movimentacao.findMany({

where: montarFiltroMovimentacao(req),

select:{
produtoId:true,
quantidade:true
}

});



const mapa = {};


movimentacoes.forEach(m=>{

    if(!mapa[m.produtoId]){
        mapa[m.produtoId]=0;
    }


    mapa[m.produtoId]+=m.quantidade;

});



const agrupados = Object.entries(mapa)
.map(([produtoId,quantidade])=>({

produtoId:Number(produtoId),
quantidade

}))
.sort((a,b)=>b.quantidade-a.quantidade);



const ids = agrupados.map(x=>x.produtoId);



const produtos = await prisma.produto.findMany({

where:{
id:{
in:ids
}
},

include:{
categoria:true,
fornecedor:true
}

});



const resultado = agrupados.map(item=>{


const produto = produtos.find(
p=>p.id===item.produtoId
);



return {

id:produto.id,

nome:produto.nome,

categoria:produto.categoria,

fornecedor:produto.fornecedor,

quantidade:item.quantidade,

precoVenda:produto.precoVenda

};


});


res.json(resultado);



}catch(error){

console.error(error);


res.status(500).json({
error:error.message
});


}

}

// ===============================
// POR CATEGORIA
// ===============================
async function categoria(req,res){

try{


const dados = await prisma.produto.findMany({

where:
montarFiltro(req),


include:{
categoria:true
}

});


res.json(dados);


}catch(error){

console.error(error);

res.status(500).json({
error:error.message
});

}


}




// ===============================
// POR FORNECEDOR
// ===============================
async function fornecedor(req,res){

try{


const dados = await prisma.produto.findMany({

where:
montarFiltro(req),


include:{
fornecedor:true
}

});


res.json(dados);



}catch(error){

console.error(error);

res.status(500).json({
error:error.message
});

}


}



async function exportarRelatorio(req, res) {
  try {

    const { formato } = req.query;

    const dados = await buscarDados(req);


if(formato==="csv"){


const parser = new Parser();

const csv = parser.parse(dados);


res.header(
"Content-Type",
"text/csv"
);


res.attachment(
"relatorio.csv"
);


return res.send(csv);

}




if(formato==="xlsx"){


const workbook = new ExcelJS.Workbook();

const sheet =
workbook.addWorksheet("Estoque");



sheet.columns=[

{
header:"Produto",
key:"nome"
},

{
header:"Quantidade",
key:"quantidade"
},

{
header:"Preço",
key:"precoVenda"
}

];



dados.forEach(p => {
    sheet.addRow({
        nome: p.produto?.nome || p.nome,
        quantidade: p.quantidade,
        precoVenda: p.produto?.precoVenda || p.precoVenda
    });
});



res.setHeader(
"Content-Type",
"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
);



res.setHeader(
"Content-Disposition",
"attachment; filename=relatorio.xlsx"
);



return workbook.xlsx.write(res);

}




if(formato==="xml"){


const root = create({
  version:"1.0"
})
.ele("estoque");



dados.forEach(p => {

    const produto = p.produto || p;

    root.ele("produto")
      .ele("id")
        .txt(String(produto.id))
      .up()
      .ele("nome")
        .txt(produto.nome)
      .up()
      .ele("quantidade")
        .txt(String(p.quantidade ?? produto.quantidade))
      .up()
      .ele("precoVenda")
        .txt(String(produto.precoVenda || 0))
      .up()
      .ele("categoria")
        .txt(produto.categoria?.nome || "")
      .up()
      .ele("fornecedor")
        .txt(produto.fornecedor?.nome || "")
      .up()
      .ele("tipo")
        .txt(p.tipo || "")
      .up()
      .ele("data")
        .txt(p.dataMovimentacao || "")
      .up()
      .ele("observacao")
        .txt(p.observacao || "")
      .up()
      .up();

});



const xml = root.end({
  prettyPrint:true
});



res.setHeader(
  "Content-Type",
  "application/xml"
);


res.setHeader(
  "Content-Disposition",
  "attachment; filename=relatorio.xml"
);


return res.send(xml);


}


if (formato === "pdf") {

    const pdf = new PDFDocument({
    size: "A4",
    margin: 40,
    bufferPages: true
});

    res.setHeader(
        "Content-Type",
        "application/pdf"
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename=${req.query.tipo}.pdf`
    );

    pdf.pipe(res);

    // Cabeçalho
    pdf
        .rect(0, 0, 595, 80)
        .fill("#1E3A8A");

    pdf
        .fillColor("white")
        .fontSize(22)
        .text("SISTEMA DE CONTROLE DE ESTOQUE", 40, 25);

    pdf
        .fontSize(13)
        .text(`Relatório: ${req.query.tipo.toUpperCase()}`, 40, 52);

    pdf.moveDown();

    pdf.fillColor("black");

    pdf.y = 100;

    pdf.fontSize(11);

    pdf.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);

    pdf.text(`Categoria: ${req.query.categoriaId || "Todas"}`);

    pdf.text(`Fornecedor: ${req.query.fornecedorId || "Todos"}`);

    pdf.text(
        `Período: ${req.query.inicio || "--"} até ${req.query.fim || "--"}`
    );

    pdf.moveDown();

    pdf
        .moveTo(40, pdf.y)
        .lineTo(560, pdf.y)
        .stroke();

    pdf.moveDown();


let y = pdf.y + 20;

// ==============================
// CABEÇALHO DA TABELA
// ==============================

function desenharCabecalhoTabela() {

    pdf.font("Helvetica-Bold");
    pdf.fontSize(10);
    pdf.fillColor("#000");

    pdf.text("Produto", 40, y, {
        width: 220
    });

    pdf.text("Quantidade", 280, y, {
        width: 70,
        align: "center"
    });

    pdf.text("Preço", 370, y, {
        width: 80,
        align: "right"
    });

    pdf.text("Tipo", 480, y, {
        width: 60,
        align: "center"
    });


    y += 18;


    pdf.moveTo(40, y)
       .lineTo(555, y)
       .strokeColor("#0f172a")
       .lineWidth(1)
       .stroke();


    y += 12;


    pdf.font("Helvetica");
    pdf.fillColor("#000");
}



// ==============================
// RODAPÉ
// ==============================

function desenharRodape() {

    const rodapeY = 755;


    pdf.moveTo(40, rodapeY - 10)
       .lineTo(555, rodapeY - 10)
       .strokeColor("#1e3a8a")
       .lineWidth(1)
       .stroke();



    pdf.font("Helvetica")
       .fontSize(8)
       .fillColor("#555");


    pdf.text(
        `Total de registros: ${dados.length}`,
        40,
        rodapeY,
        {
            width:150
        }
    );


    pdf.text(
        `Emitido em ${new Date().toLocaleString("pt-BR")}`,
        180,
        rodapeY,
        {
            width:230,
            align:"center"
        }
    );


    pdf.text(
        `Página ${pdf.bufferedPageRange().count}`,
        470,
        rodapeY,
        {
            width:70,
            align:"right"
        }
    );


    pdf.font("Helvetica-Bold")
       .fontSize(9)
       .fillColor("#1e3a8a");


    pdf.text(
        "Sistema de Controle de Estoque",
        40,
        rodapeY + 15,
        {
            width:515,
            align:"center"
        }
    );


    pdf.fillColor("#000");

}



// ==============================
// DESENHA TABELA
// ==============================


desenharCabecalhoTabela();


dados.forEach((item, index) => {


    const produto = item.produto || item;


    const ALTURA_LINHA = 22;
    const LIMITE_TABELA = 720;



    // Verifica quebra de página

    if (y + ALTURA_LINHA > LIMITE_TABELA) {


        pdf.addPage();


        y = 60;


        desenharCabecalhoTabela();

    }



    // Linha zebra

    if (index % 2 === 0) {


        pdf.rect(
            40,
            y - 3,
            515,
            18
        )
        .fill("#F5F5F5");


        pdf.fillColor("#000");

    }



    pdf.text(
        produto.nome || "-",
        45,
        y,
        {
            width:220,
            ellipsis:true
        }
    );



    pdf.text(
        String(
            item.quantidade ??
            produto.quantidade ??
            0
        ),
        285,
        y,
        {
            width:60,
            align:"center"
        }
    );



    pdf.text(
        "R$ " + Number(
            produto.precoVenda || 0
        ).toFixed(2),
        365,
        y,
        {
            width:80,
            align:"right"
        }
    );



    pdf.text(
        item.tipo || "-",
        475,
        y,
        {
            width:60,
            align:"center"
        }
    );


    y += ALTURA_LINHA;


});



// ==============================
// FINALIZA PDF
// ==============================

desenharRodape();

pdf.end();

return;
}


}catch(error){

console.error(error);


res.status(500).json({

error:error.message

});


}


}
// ===============================
// INVENTÁRIO
// ===============================
async function inventario(req,res){

return estoque(req,res);

}

async function dashboard(req,res){

try{


const produtos = await prisma.produto.count({

where:{
ativo:true
}

});



const estoque = await prisma.produto.aggregate({

_sum:{
quantidade:true
},

where:{
ativo:true
}

});



const lista = await prisma.produto.findMany({

where:{
ativo:true
},

select:{
quantidade:true,
estoqueMinimo:true
}

});



const baixoEstoque = lista.filter(

p => p.quantidade <= p.estoqueMinimo

).length;



const entradas = await prisma.movimentacao.aggregate({

where:{
tipo:"ENTRADA"
},

_sum:{
quantidade:true
}

});



const saidas = await prisma.movimentacao.aggregate({

where:{
tipo:"SAIDA"
},

_sum:{
quantidade:true
}

});



res.json({

produtos,

estoque:
estoque._sum.quantidade || 0,

entradas:
entradas._sum.quantidade || 0,

saidas:
saidas._sum.quantidade || 0,

baixoEstoque

});


}catch(error){

console.error(error);


res.status(500).json({

error:error.message

});


}


}



// ===============================
// GERADOR
// ===============================
async function gerarRelatorio(req,res){

try{


const {tipo}=req.query;



switch(tipo){


case "estoque":
return estoque(req,res);


case "minimo":
return estoqueMinimo(req,res);


case "zerado":
return produtosSemEstoque(req,res);


case "entradas":
return entradas(req,res);


case "saidas":
return saidas(req,res);


case "historico":
return historico(req,res);


case "movimentados":
return movimentados(req,res);


case "categoria":
return categoria(req,res);


case "fornecedor":
return fornecedor(req,res);


case "inventario":
return inventario(req,res);



default:

return res.status(400).json({
error:"Tipo inválido"
});


}



}catch(error){

console.error(error);


res.status(500).json({
error:error.message
});


}


}




module.exports={

dashboard,
gerarRelatorio,
estoque,
estoqueMinimo,
exportarRelatorio

};