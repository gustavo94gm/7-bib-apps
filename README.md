# 7ª BIB — Sistema de Gerenciamento de Chamados

Sistema interno do 7º Batalhão de Infantaria Blindado (7º BIB) que reúne duas rotinas operacionais do batalhão em um só lugar:

- **Chamados de TI**: abertura e acompanhamento de chamados de suporte técnico. Qualquer militar pode abrir um chamado sem precisar de login; o setor de TI (Admin/Infor) gerencia atribuição, status e comentários.
- **Controle de visitantes (RP Avançado)**: registro de entrada e saída de visitantes no posto de guarda (nome, CPF, crachá, destino, situação, horário), com autopreenchimento por CPF já cadastrado e relatórios de consulta.

## Stack

- [Nuxt 4](https://nuxt.com/) + Vue 3 + [Nuxt UI](https://ui.nuxt.com/)
- PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- [better-auth](https://www.better-auth.com/) para autenticação (papéis `admin` e `rp`)
- [Bun](https://bun.sh/) como runtime/gerenciador de pacotes

## Usuários e acesso

- **Requisitante**: qualquer militar do batalhão — abre chamado sem conta.
- **RP Avançado**: acesso restrito às rotas `/visitor/*` (registro e relatório de visitantes).
- **Admin**: acesso irrestrito — gerencia chamados, usuários, categorias, graduações, seções e relatórios.

## Setup

Requer um banco PostgreSQL rodando. Suba o banco de desenvolvimento com Docker:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Configure as variáveis de ambiente (copie `.env.example` para `.env` e preencha):

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
```

Instale as dependências:

```bash
bun install
```

Aplique o schema no banco:

```bash
bun run drizzle-kit push
```

## Desenvolvimento

```bash
bun run dev
```

Servidor sobe em `http://localhost:3000`.

## Produção

```bash
bun run build
bun run preview
```

Também há `Dockerfile` e `docker-compose.yml` para deploy em produção.
