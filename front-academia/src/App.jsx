import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 8000,
});

// util
const notEmpty = (v) => String(v ?? "").trim().length > 0;
const toInt = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export default function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);

  // LOGIN
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  const doLogin = async (e) => {
    e?.preventDefault();
    if (!notEmpty(loginEmail) || !notEmpty(loginSenha)) {
      alert("Informe email e senha.");
      return;
    }
    try {
      const { data } = await API.post("/auth/login", {
        email: loginEmail,
        senha: loginSenha,
      });
      setUser(data);
      setView("home");
      setLoginEmail("");
      setLoginSenha("");
    } catch (err) {
      alert(err?.response?.data?.error || "Falha no login");
    }
  };

  const logout = () => {
    setUser(null);
    setView("login");
  };

  // PRODUTOS
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [q, setQ] = useState("");

  const emptyProduto = { id: null, nome: "", quantidade: 0, estoque_minimo: 0 };
  const [produtoForm, setProdutoForm] = useState(emptyProduto);
  const [editandoId, setEditandoId] = useState(null);

  const carregarProdutos = async (term = q) => {
    setLoadingProdutos(true);
    try {
      const url = notEmpty(term)
        ? `/produtos?q=${encodeURIComponent(term)}`
        : "/produtos";

      const { data } = await API.get(url);
      setProdutos(Array.isArray(data) ? data : []);
    } catch (e) {
      alert("Erro ao carregar produtos");
    } finally {
      setLoadingProdutos(false);
    }
  };

  useEffect(() => {
    if (view === "produtos" || view === "estoque") carregarProdutos();
  }, [view]);

  const produtosOrdenados = useMemo(() => {
    return [...produtos].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
  }, [produtos]);

  const limparProdutoForm = () => {
    setProdutoForm(emptyProduto);
    setEditandoId(null);
  };

  const validarProdutoForm = () => {
    const { nome, quantidade, estoque_minimo } = produtoForm;
    if (!notEmpty(nome)) return "Informe o nome do produto.";
    if (toInt(quantidade) < 0) return "Quantidade não pode ser negativa.";
    if (toInt(estoque_minimo) < 0) return "Estoque mínimo não pode ser negativo.";
    return null;
  };

  const criarProduto = async () => {
    const msg = validarProdutoForm();
    if (msg) return alert(msg);
    try {
      await API.post("/equipamentos", {
        nome: produtoForm.nome.trim(),
        quantidade: toInt(produtoForm.quantidade),
        estoque_minimo: toInt(produtoForm.estoque_minimo),
      });
      await carregarProdutos();
      limparProdutoForm();
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao criar produto");
    }
  };

  const iniciarEdicao = (p) => {
    setEditandoId(p.id_material);
    setProdutoForm({
      id: p.id_material,
      nome: p.nome,
      quantidade: p.quantidade,
      estoque_minimo: p.estoque_minimo,
    });
  };

  const salvarProduto = async () => {
    if (!editandoId) return;
    const msg = validarProdutoForm();
    if (msg) return alert(msg);
    try {
      await API.put(`/equipamentos/${editandoId}`, {
        nome: produtoForm.nome.trim(),
        quantidade: toInt(produtoForm.quantidade),
        estoque_minimo: toInt(produtoForm.estoque_minimo),
      });
      await carregarProdutos();
      limparProdutoForm();
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao salvar produto");
    }
  };

  const excluirProduto = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    try {
      await API.delete(`/produtos/${id}`);
      await carregarProdutos();
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao excluir produto");
    }
  };

  const buscar = async (e) => {
    e?.preventDefault();
    await carregarProdutos(q);
  };

  // ESTOQUE
  const [movProdutoId, setMovProdutoId] = useState("");
  const [movTipo, setMovTipo] = useState("entrada");
  const [movQuantidade, setMovQuantidade] = useState("");
  const [movData, setMovData] = useState("");

  const enviarMovimentacao = async () => {
    if (!user) return alert("Faça login.");
    if (!movProdutoId) return alert("Selecione um produto.");
    if (!["entrada", "saida"].includes(movTipo)) return alert("Tipo inválido.");
    const qtd = toInt(movQuantidade);
    if (!(qtd > 0)) return alert("Informe uma quantidade > 0.");

    try {
     const payload = {
     id_material_fk: Number(movProdutoId),
     usuario_id_fk: user.id, 
     tipo: movTipo,
     quantidade: qtd,
     data: notEmpty(movData) ? new Date(movData).toISOString() : null,
    };


      const { data } = await API.post("/registro", payload);

      alert("Movimentação registrada com sucesso.");
      if (data?.produto?.abaixo_do_minimo) {
        alert("⚠️ Estoque abaixo do mínimo para este produto!");
      }

      await carregarProdutos();
      setMovQuantidade("");
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao registrar movimentação");
    }
  };

  // RENDER
  return (
    <div className="app-container">
      <h1>academia — Gestão de Estoque</h1>

      {/* LOGIN */}
      {view === "login" && (
        <section className="form">
          <h2>Login</h2>
          <div className="input-container">
            <label>Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-container">
            <label>Senha</label>
            <input
              type="password"
              value={loginSenha}
              onChange={(e) => setLoginSenha(e.target.value)}
              required
            />
          </div>
          <button onClick={doLogin}>Entrar</button>
        </section>
      )}

      {/* HOME */}
      {view === "home" && (
        <section className="form">
          <h2>Olá, {user?.nome}</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setView("produtos")}>Cadastro de Produto</button>
            <button onClick={() => setView("estoque")}>Gestão de Estoque</button>
            <button onClick={logout}>Sair</button>
          </div>
        </section>
      )}

      {/* PRODUTOS */}
      {view === "produtos" && (
        <section className="form">
          <h2>Cadastro de Produto</h2>

          <form onSubmit={buscar} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Buscar por nome"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit">Buscar</button>
            <button
              type="button"
              onClick={() => {
                setQ("");
                carregarProdutos("");
              }}
            >
              Limpar
            </button>
          </form>

          <div style={{ display: "grid", gap: 8 }}>
            <div className="input-container">
              <label>Nome</label>
              <input
                type="text"
                value={produtoForm.nome}
                onChange={(e) =>
                  setProdutoForm((s) => ({ ...s, nome: e.target.value }))
                }
              />
            </div>

            <div className="input-container">
              <label>Quantidade</label>
              <input
                type="number"
                value={produtoForm.quantidade}
                onChange={(e) =>
                  setProdutoForm((s) => ({ ...s, quantidade: e.target.value }))
                }
              />
            </div>

            <div className="input-container">
              <label>Estoque mínimo</label>
              <input
                type="number"
                value={produtoForm.estoque_minimo}
                onChange={(e) =>
                  setProdutoForm((s) => ({ ...s, estoque_minimo: e.target.value }))
                }
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {editandoId ? (
                <>
                  <button onClick={salvarProduto}>Salvar alterações</button>
                  <button onClick={limparProdutoForm}>Cancelar</button>
                </>
              ) : (
                <button onClick={criarProduto}>Cadastrar produto</button>
              )}
              <button onClick={() => setView("home")}>Voltar</button>
            </div>
          </div>

          <table style={{ width: "100%", marginTop: 10 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qtd</th>
                <th>Mín</th>
                <th>Alerta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosOrdenados.map((p) => (
                <tr key={p.id_material}>
                  <td>{p.nome}</td>
                  <td>{p.quantidade}</td>
                  <td>{p.estoque_minimo}</td>
                  <td>{p.quantidade < p.estoque_minimo ? "⚠️" : "—"}</td>
                  <td>
                    <button onClick={() => iniciarEdicao(p)}>Editar</button>
                    <button onClick={() => excluirProduto(p.id_material)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {produtosOrdenados.length === 0 && (
                <tr>
                  <td colSpan={5}>Nenhum produto.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* ESTOQUE */}
      {view === "estoque" && (
        <section className="form">
          <h2>Gestão de Estoque</h2>

          <h3>Produtos</h3>
          <ul>
            {produtosOrdenados.map((p) => (
              <li key={p.id_material}>
                {p.nome} — Qtd: {p.quantidade} / Min: {p.estoque_minimo}{" "}
                {p.quantidade < p.estoque_minimo ? "⚠️" : ""}
              </li>
            ))}
          </ul>

          <h3>Registrar Entrada/Saída</h3>

          <div className="input-container">
            <label>Produto</label>
            <select
              value={movProdutoId}
              onChange={(e) => setMovProdutoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {produtosOrdenados.map((p) => (
                <option key={p.id_material} value={p.id_material}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="input-container">
            <label>Tipo</label>
            <label>
              <input
                type="radio"
                name="tipo"
                value="entrada"
                checked={movTipo === "entrada"}
                onChange={(e) => setMovTipo(e.target.value)}
              />
              Entrada
            </label>
            <label>
              <input
                type="radio"
                name="tipo"
                value="saida"
                checked={movTipo === "saida"}
                onChange={(e) => setMovTipo(e.target.value)}
              />
              Saída
            </label>
          </div>

          <div className="input-container">
            <label>Quantidade</label>
            <input
              type="number"
              min={1}
              value={movQuantidade}
              onChange={(e) => setMovQuantidade(e.target.value)}
            />
          </div>

          <div className="input-container">
            <label>Data</label>
            <input
              type="date"
              value={movData}
              onChange={(e) => setMovData(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={enviarMovimentacao}>Registrar</button>
            <button onClick={() => setView("home")}>Voltar</button>
          </div>
        </section>
      )}
    </div>
  );
}