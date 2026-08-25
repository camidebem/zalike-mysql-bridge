import express from "express";
import mysql from "mysql2/promise";
import "dotenv/config";

const app = express();
app.use(express.json());

// Pool de conexões — reaproveita conexões em vez de abrir uma nova a cada request
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

// Chave simples de autenticação entre o PocketBase e esse microsserviço,
// pra ninguém mais conseguir chamar esses endpoints livremente.
function checkApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== process.env.BRIDGE_API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET /cliente-lookup?cnpj=11.396.335/0001-97
app.get("/cliente-lookup", checkApiKey, async (req, res) => {
  const { cnpj } = req.query;
  if (!cnpj) {
    return res.status(400).json({ error: "cnpj é obrigatório" });
  }

  try {
    const [clienteRows] = await pool.query(
      `SELECT id_cliente, nome, fantasia, cnpj, id_convenio, id_representante
       FROM t_cliente
       WHERE cnpj = ?`,
      [cnpj]
    );

    if (clienteRows.length === 0) {
      return res.status(404).json({ error: "cliente não encontrado" });
    }

    const cliente = clienteRows[0];

    const [formaPagtoRows] = await pool.query(
      `SELECT
          t_formapagto.id AS forma_pagto_codigo,
          t_formapagto.descricao AS forma_pagto_descricao
       FROM t_cliente
       LEFT JOIN t_clientes_formapagto ON t_cliente.id_cliente = t_clientes_formapagto.id_cliente
       LEFT JOIN t_formapagto ON t_formapagto.id = t_clientes_formapagto.id_formpagto
       WHERE t_cliente.id_cliente = ?`,
      [cliente.id_cliente]
    );

    const [vendedorRows] = await pool.query(
      `SELECT t_vendedor.id_vendedor, t_vendedor.nome AS vendedor_nome
       FROM t_cliente
       INNER JOIN t_vendedor ON t_cliente.id_representante = t_vendedor.id_vendedor
       WHERE t_cliente.id_cliente = ?`,
      [cliente.id_cliente]
    );

    res.json({
      id_cliente: cliente.id_cliente,
      nome: cliente.nome,
      fantasia: cliente.fantasia,
      id_convenio: cliente.id_convenio,
      forma_pagto_codigo: formaPagtoRows[0]?.forma_pagto_codigo ?? null,
      forma_pagto_descricao: formaPagtoRows[0]?.forma_pagto_descricao ?? null,
      representante_codigo: vendedorRows[0]?.id_vendedor ?? null,
    });
  } catch (err) {
    console.error("Erro em /cliente-lookup:", err);
    res.status(500).json({ error: "erro interno ao consultar o banco" });
  }
});

// GET /produto-lookup?codigo=7899536100147&id_convenio=18&id_cliente=745
app.get("/produto-lookup", checkApiKey, async (req, res) => {
  const { codigo, id_convenio, id_cliente } = req.query;
  if (!codigo || !id_cliente) {
    return res.status(400).json({ error: "codigo e id_cliente são obrigatórios" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
          t_produto.id AS produto_codigo,
          t_produto.referencia,
          t_codbarra.codbarra,
          t_convenio_codigo_no_cliente.codigo_no_cliente
       FROM t_cliente
       INNER JOIN t_codbarra
           ON (t_codbarra.id_convenio = 0 OR t_codbarra.id_convenio = t_cliente.id_convenio)
       INNER JOIN t_produto
           ON t_produto.id = t_codbarra.id_produto
       LEFT JOIN t_convenio_codigo_no_cliente
           ON (t_convenio_codigo_no_cliente.id_produto = t_produto.id
               AND t_convenio_codigo_no_cliente.id_convenio = t_cliente.id_convenio)
       WHERE t_cliente.id_cliente = ?
         AND (
               t_codbarra.codbarra = ?
               OR t_convenio_codigo_no_cliente.codigo_no_cliente = ?
               OR t_produto.referencia = ?
             )
       LIMIT 1`,
      [id_cliente, codigo, codigo, codigo]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "produto não encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Erro em /produto-lookup:", err);
    res.status(500).json({ error: "erro interno ao consultar o banco" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bridge MySQL Zalike rodando na porta ${port}`);
});
