const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({
  user:'postgres',       
  password:'senai',       
  host: 'localhost',
  port: 5432,
  database:'saep_db', 
});

app.use(cors());
app.use(express.json());

const ok = (res, data) => res.json(data);
const fail = (res, err, code = 500) => {
  console.error(err);
  res.status(code).json({ error: typeof err === 'string' ? err : 'Erro interno' });
};

// -----------------------------
// HEALTHCHECK
// -----------------------------
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { status: 'ok' });
  } catch (e) { fail(res, e); }
});

// -----------------------------
// USUÁRIOS
// -----------------------------
app.post('/usuarios', async (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (!nome || !email || !senha) return fail(res, 'Campos obrigatórios: nome, email, senha', 400);
  try {
    const r = await pool.query(
      `INSERT INTO usuarios (nome, email, senha)
       VALUES ($1,$2,$3)
       RETURNING id, nome, email`,
      [nome, email, senha]
    );
    ok(res, r.rows[0]);
  } catch (e) {
    if (String(e?.message).includes('unique')) return fail(res, 'E-mail já cadastrado', 409);
    fail(res, e);
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return fail(res, 'Informe email e senha', 400);
  try {
    const r = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE email=$1 AND senha=$2',
      [email, senha]
    );
    if (r.rows.length === 0) return fail(res, 'Credenciais inválidas', 401);
    ok(res, r.rows[0]);
  } catch (e) { fail(res, e); }
});

// -----------------------------
// EQUIPAMENTOS
// -----------------------------
app.get('/produtos', async (req, res) => {
  const q = (req.query.q || '').trim();
  const hasQ = q.length > 0;
  const sql =
    `SELECT id_material, nome, quantidade, estoque_minimo,
            (quantidade < estoque_minimo) AS abaixo_do_minimo
       FROM equipamentos
      ${hasQ ? 'WHERE lower(nome) LIKE lower($1)' : ''}
      ORDER BY nome ASC`;
  try {
    const args = hasQ ? [`%${q}%`] : [];
    const r = await pool.query(sql, args);
    ok(res, r.rows);
  } catch (e) { fail(res, e); }
});

app.get('/equipamentos/:id_material', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id_material, nome, quantidade, estoque_minimo,
              (quantidade < estoque_minimo) AS abaixo_do_minimo
         FROM equipamentos WHERE id_material=$1`,
      [req.params.id_material]
    );
    if (!r.rows.length) return fail(res, 'equipamento não encontrado', 404);
    ok(res, r.rows[0]);
  } catch (e) { fail(res, e); }
});

app.post('/equipamentos', async (req, res) => {
  const { nome, quantidade = 0, estoque_minimo = 0 } = req.body || {};
  if (!nome) return fail(res, 'Campo obrigatório: nome', 400);
  try {
    const r = await pool.query(
      `INSERT INTO equipamentos (nome, quantidade, estoque_minimo)
       VALUES ($1,$2,$3)
       RETURNING id_material, nome, quantidade, estoque_minimo`,
      [nome, Number(quantidade) || 0, Number(estoque_minimo) || 0]
    );
    ok(res, r.rows[0]);
  } catch (e) { fail(res, e); }
});

app.put('/equipamentos/:id_material', async (req, res) => {
  const { nome, quantidade, estoque_minimo } = req.body || {};
  try {
    const r = await pool.query(
      `UPDATE equipamentos
          SET nome = COALESCE($1, nome),
              quantidade = COALESCE($2, quantidade),
              estoque_minimo = COALESCE($3, estoque_minimo)
        WHERE id_material=$4
        RETURNING id_material, nome, quantidade, estoque_minimo`,
      [nome ?? null, quantidade ?? null, estoque_minimo ?? null, req.params.id_material]
    );
    if (!r.rows.length) return fail(res, 'Produto não encontrado', 404);
    ok(res, r.rows[0]);
  } catch (e) { fail(res, e); }
});

app.delete('/equipamentos/:id_material', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM equipamentos WHERE id_material=$1 RETURNING id_material', [req.params.id_material]);
    if (!r.rows.length) return fail(res, 'equipamento não encontrado', 404);
    ok(res, { message: 'equipamento excluído' });
  } catch (e) { fail(res, e); }
});

// -----------------------------
// REGISTRO MOVIMENTAÇÕES
// -----------------------------
app.post('/registro', async (req, res) => {
  const { id_material_fk, usuario_id_fk, tipo, quantidade, data } = req.body || {};

  if (!id_material_fk || !usuario_id_fk || !tipo || !quantidade)
    return fail(res, 'Campos obrigatórios: id_material_fk, usuario_id_fk, tipo, quantidade', 400);

  if (!['entrada', 'saida'].includes(String(tipo).toLowerCase()))
    return fail(res, "tipo deve ser 'entrada' ou 'saida'", 400);

  const delta = tipo.toLowerCase() === 'entrada' ? +Math.abs(quantidade) : -Math.abs(quantidade);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const up = await client.query(
      'UPDATE equipamentos SET quantidade = quantidade + $1 WHERE id_material=$2 RETURNING id_material, nome, quantidade, estoque_minimo',
      [delta, id_material_fk]
    );
    if (!up.rows.length) {
      await client.query('ROLLBACK');
      client.release();
      return fail(res, 'equipamento não encontrado', 404);
    }

    const ins = await client.query(
      `INSERT INTO registro (id_material_fk, usuario_id_fk, tipo_movimentacao, quantidade, data)
       VALUES ($1,$2,$3,$4,COALESCE($5,NOW()))
       RETURNING id_registro, id_material_fk, usuario_id_fk, tipo_movimentacao, quantidade, data`,
      [id_material_fk, usuario_id_fk, tipo, Math.abs(quantidade), data || null]
    );

    await client.query('COMMIT');
    client.release();

    ok(res, {
      movimento: ins.rows[0],
      produto: {
        ...up.rows[0],
        abaixo_do_minimo: up.rows[0].quantidade < up.rows[0].estoque_minimo,
      },
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    client.release();
    fail(res, e);
  }
});

app.get('/registro', async (req, res) => {
  const { id_material_fk } = req.query;
  const hasFilter = !!id_material_fk;

  const sql = `
    SELECT r.id_registro, r.id_material_fk, ie.nome AS item_nome,
           r.usuario_id_fk, u.nome AS responsavel_nome, u.email AS responsavel_email,
           r.tipo_movimentacao, r.quantidade, r.data
      FROM registro r
      JOIN equipamentos ie ON ie.id_material = r.id_material_fk
      JOIN usuarios u ON u.id = r.usuario_id_fk
     ${hasFilter ? 'WHERE r.id_material_fk = $1' : ''}
     ORDER BY r.data DESC, r.id_registro DESC
  `;
  try {
    const r = await pool.query(sql, hasFilter ? [id_material_fk] : []);
    ok(res, r.rows);
  } catch (e) { fail(res, e); }
});

// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
