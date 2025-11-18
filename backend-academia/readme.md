
---

# Backend - Sistema de Estoque 

Este é o backend RESTful em **Node.js + Express + PostgreSQL** do sistema de controle de estoque da academia.  
Ele fornece autenticação simples de divulgadores, cadastro e gerenciamento de produtos, além do registro de movimentações de entrada e saída com atualização automática de saldo.

---

## 🚀 Tecnologias

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

---

## 🧰 Pré-requisitos

- **Node.js** (v18 ou superior)
- **PostgreSQL** (rodando localmente)
- Banco de dados chamado **`saep_db`**

---

## 📦 Instalação e execução

```bash
git clone https://github.com/seu-usuario/meia-meia-meia-backend.git
cd backend-academia
npm install
node server.js
````

O servidor iniciará por padrão em **[http://localhost:3000](http://localhost:3000)**

---

## 🔗 Rotas disponíveis

| Método     | Rota                         | Descrição                                                  |
| ---------- | ---------------------------- | ---------------------------------------------------------- |
| **POST**   | `/usuarios`                  | Cadastra novo divulgador                                   |
| **POST**   | `/auth/login`                | Login simples (retorna `{ id, nome, email }`)              |
| **GET**    | `/produtos?q=`               | Lista produtos (ordem alfabética; busca opcional)          |
| **GET**    | `/produtos/:id`              | Obtém um produto específico                                |
| **POST**   | `/produtos`                  | Cria um novo produto                                       |
| **PUT**    | `/produtos/:id`              | Atualiza um produto existente                              |
| **DELETE** | `/produtos/:id`              | Exclui um produto                                          |
| **POST**   | `/movimentacoes`             | Registra entrada/saída, atualiza o saldo e grava histórico |
| **GET**    | `/movimentacoes?produto_id=` | Lista o histórico completo ou filtrado por produto         |
| **GET**    | `/health`                    | Verifica se o backend está ativo                           |

---

## 🗃️ Estrutura do banco de dados

Banco: **`saep_db`**

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,              
    email VARCHAR(255) UNIQUE NOT NULL, 
    nome VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE equipamentos (
    id_material SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
    estoque_minimo INTEGER NOT NULL DEFAULT 0);

CREATE TABLE registro (
    id_registro SERIAL PRIMARY KEY, 
    
    usuario_id_fk INTEGER NOT NULL,
    id_material_fk INTEGER NOT NULL,
    
    tipo_movimentacao TEXT NOT NULL,
    data TIMESTAMP NOT NULL, 
    quantidade INTEGER NOT NULL,

 
    FOREIGN KEY (usuario_id_fk)  REFERENCES usuarios(id),
    FOREIGN KEY (id_material_fk) REFERENCES equipamentos(id_material)
);
```

---

## 🌱 Dados iniciais (seeds)

```sql

-- Tabela de usuários
INSERT INTO usuarios (nome, email, senha) VALUES
  ('Ana Souza',  'ana@example.com',   '123'),
  ('Bruno Lima', 'bruno@example.com', '123'),
  ('Carla Dias', 'carla@example.com', '123');

-- Tabela de produtos
INSERT INTO produtos (nome, quantidade, estoque_minimo) VALUES
  ('bola', 40, 10),
  ('peso 30kg', 60, 15),
  ('corda', 25, 10);

-- Movimentações (histórico inicial)
-- Entradas iniciais feitas por Ana
INSERT INTO movimentacoes (produto_id, usuario_id, tipo, quantidade, data_movimentacao) VALUES
  ((SELECT id FROM produtos WHERE nome='bola'),
   (SELECT id FROM usuarios WHERE email='ana@example.com'),
   'entrada', 20, NOW() - INTERVAL '2 days'),
  ((SELECT id FROM produtos WHERE nome='peso 30kg'),
   (SELECT id FROM usuarios WHERE email='ana@example.com'),
   'entrada', 10, NOW() - INTERVAL '2 days'),
  ((SELECT id FROM produtos WHERE nome='corda'),
   (SELECT id FROM usuarios WHERE email='ana@example.com'),
   'entrada', 15, NOW() - INTERVAL '2 days');

-- Saídas feitas por Bruno
INSERT INTO movimentacoes (produto_id, usuario_id, tipo, quantidade, data_movimentacao) VALUES
  ((SELECT id FROM produtos WHERE nome='bola'),
   (SELECT id FROM usuarios WHERE email='bruno@example.com'),
   'saida', 5, NOW() - INTERVAL '1 day'),
  ((SELECT id FROM produtos WHERE nome='peso 30kg'),
   (SELECT id FROM usuarios WHERE email='bruno@example.com'),
   'saida', 10, NOW() - INTERVAL '1 day'),
  ((SELECT id FROM produtos WHERE nome='corda'),
   (SELECT id FROM usuarios WHERE email='bruno@example.com'),
   'saida', 3, NOW() - INTERVAL '1 day');

-- Reposição feita por Carla
INSERT INTO movimentacoes (produto_id, usuario_id, tipo, quantidade, data_movimentacao) VALUES
  ((SELECT id FROM produtos WHERE nome='bola'),
   (SELECT id FROM usuarios WHERE email='carla@example.com'),
   'entrada', 10, NOW()),
  ((SELECT id FROM produtos WHERE nome='peso 30kg'),
   (SELECT id FROM usuarios WHERE email='carla@example.com'),
   'entrada', 20, NOW()),
  ((SELECT id FROM produtos WHERE nome='corda'),
   (SELECT id FROM usuarios WHERE email='carla@example.com'),
   'entrada', 8, NOW());
---

## 🧪 Teste rápido

1. Inicie o PostgreSQL e rode os comandos SQL acima no banco `saep_db`.
2. Execute:

   ```bash
   node server.js
   ```
3. No navegador ou Insomnia/Postman, teste:

   * `GET http://localhost:3000/health`
   * `POST http://localhost:3000/auth/login` com:

     ```json
     { "email": "ana@example.com", "senha": "123" }
     ```
4. Acesse o frontend e entre com o mesmo login.

---

## 💡 Observações

* A busca `/produtos?q=` agora **não usa `unaccent()`**, para evitar dependência de extensões PostgreSQL.
* O alerta de estoque é disparado **somente quando `quantidade < estoque_minimo`**.
* O backend **sempre confirma** a movimentação, exibindo o alerta de estoque logo após.
* O projeto segue o padrão mínimo exigido pela **prova SAEP**, totalmente compatível com o frontend React criado para ela.

---

## 📄 Licença

Projeto sob licença MIT.

---


