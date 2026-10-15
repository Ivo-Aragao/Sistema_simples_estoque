function removerAcentos(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarUnidades(texto) {
  return texto
    .replace(/\bLITRO\b|\bLITROS\b|\bLT\b|\bLTS\b/g, "L")
    .replace(
      /\bKILO\b|\bKILOS\b|\bQUILO\b|\bQUILOS\b|\bKG\b|\bKGS\b/g,
      "KG"
    )
    .replace(/\bMILILITRO\b|\bMILILITROS\b|\bML\b|\bMLS\b/g, "ML")
    .replace(/\bGRAMA\b|\bGRAMAS\b|\bGR\b/g, "G")
    .replace(/\bUNIDADE\b|\bUNIDADES\b|\bUNID\b|\bUND\b/g, "UN")
    .replace(/\bCAIXA\b|\bCAIXAS\b|\bCX\b/g, "CX")
    .replace(/\bPACOTE\b|\bPACOTES\b|\bPCT\b/g, "PCT")
    .replace(/\bFARDO\b|\bFARDOS\b|\bFD\b/g, "FD")
    .replace(/\s*,\s*(?=\d)/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarNomeProduto(nome) {
  let texto = removerAcentos(nome).toUpperCase();

  texto = normalizarUnidades(texto);

  texto = texto.replace(
    /(\d+(?:\.\d+)?)\s+(ML|L|KG|G|MG|UN|CX|PCT|FD)\b/g,
    "$1$2"
  );

  texto = texto
    .replace(/[^\p{L}\p{N}.\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return texto;
}

function extrairMedidas(nome) {
  const normalizado = normalizarUnidades(
    removerAcentos(nome).toUpperCase()
  );

  const regex =
    /(\d+(?:\.\d+)?)\s*(ML|L|KG|G|MG|UN|CX|PCT|FD)\b/g;

  const medidas = [];

  let match;

  while ((match = regex.exec(normalizado)) !== null) {
    let valor = Number(match[1]);
    let unidade = match[2];

    if (Number.isNaN(valor)) {
      continue;
    }

    // Converte 2000 ML -> 2 L
    if (unidade === "ML" && valor >= 1000) {
      valor = valor / 1000;
      unidade = "L";
    }

    // Converte 5000 G -> 5 KG
    if (unidade === "G" && valor >= 1000) {
      valor = valor / 1000;
      unidade = "KG";
    }

    medidas.push(`${valor}${unidade}`);
  }

  return medidas.sort();
}

function tokenizar(nome) {
  const normalizado = normalizarNomeProduto(nome);

  const stopwords = new Set([
    "DE",
    "DA",
    "DO",
    "DAS",
    "DOS",
    "PARA",
    "COM",
    "SEM",
    "TIPO",
  ]);

  return normalizado
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !stopwords.has(token));
}

function distanciaLevenshtein(a, b) {
  const linha = Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) {
    linha[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];

    linha[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const atual = linha[j];

      const custo =
        a[i - 1] === b[j - 1]
          ? 0
          : 1;

      linha[j] = Math.min(
        linha[j] + 1,
        linha[j - 1] + 1,
        anterior + custo
      );

      anterior = atual;
    }
  }

  return linha[b.length];
}

function similaridadeTexto(a, b) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const distancia = distanciaLevenshtein(a, b);

  return (
    1 -
    distancia /
      Math.max(a.length, b.length, 1)
  );
}

function similaridadeNome(nomeA, nomeB) {
  const normalizadoA =
    normalizarNomeProduto(nomeA);

  const normalizadoB =
    normalizarNomeProduto(nomeB);

  if (
    !normalizadoA ||
    !normalizadoB
  ) {
    return 0;
  }

  if (
    normalizadoA === normalizadoB
  ) {
    return 1;
  }

  const tokensA = new Set(
    tokenizar(nomeA)
  );

  const tokensB = new Set(
    tokenizar(nomeB)
  );

  const menores =
    tokensA.size <= tokensB.size
      ? tokensA
      : tokensB;

  const maiores =
    tokensA.size <= tokensB.size
      ? tokensB
      : tokensA;

  let intersecao = 0;

  for (const token of menores) {
    if (maiores.has(token)) {
      intersecao++;
    }
  }

  const uniao =
    new Set([
      ...tokensA,
      ...tokensB,
    ]).size;

  const jaccard =
    uniao > 0
      ? intersecao / uniao
      : 0;

  const containment =
    menores.size > 0
      ? intersecao / menores.size
      : 0;

  const textoScore =
    similaridadeTexto(
      normalizadoA,
      normalizadoB
    );

  const medidasA =
    extrairMedidas(nomeA);

  const medidasB =
    extrairMedidas(nomeB);

  let medidasScore = 0.5;

  if (
    medidasA.length > 0 &&
    medidasB.length > 0
  ) {
    medidasScore =
      JSON.stringify(medidasA) ===
      JSON.stringify(medidasB)
        ? 1
        : 0;
  } else if (
    medidasA.length === 0 &&
    medidasB.length === 0
  ) {
    medidasScore = 1;
  }

  let score =
    jaccard * 0.30 +
    containment * 0.25 +
    textoScore * 0.25 +
    medidasScore * 0.20;

  // Se os dois produtos têm medidas explícitas
  // diferentes, não permitimos um score alto.
  if (
    medidasA.length > 0 &&
    medidasB.length > 0 &&
    medidasScore === 0
  ) {
    score = Math.min(score, 0.59);
  }

  return Number(score.toFixed(4));
}

function encontrarPorSimilaridade(
  nome,
  produtos
) {
  if (!nome || !produtos?.length) {
    return null;
  }

  const resultados = produtos
    .filter(
      (produto) =>
        produto.ativo !== false
    )
    .map((produto) => ({
      produto,
      score: similaridadeNome(
        nome,
        produto.nome
      ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score
    );

  if (!resultados.length) {
    return null;
  }

  const melhor = resultados[0];
  const segundo = resultados[1];

  // Alta confiança.
  if (melhor.score < 0.90) {
    return null;
  }

  // Evita escolher automaticamente
  // entre dois produtos quase igualmente parecidos.
  if (
    segundo &&
    melhor.score - segundo.score < 0.05
  ) {
    return null;
  }

  return {
    produto: melhor.produto,
    score: melhor.score,
  };
}

module.exports = {
  normalizarNomeProduto,
  extrairMedidas,
  similaridadeNome,
  encontrarPorSimilaridade,
};