# Zalike MySQL Bridge

Microsserviço responsável por fazer a comunicação entre o **PocketBase**, executando no Skip Cloud, e o **MySQL externo da Zalike**.

O serviço foi criado para solucionar uma limitação do ambiente do Skip Cloud: o build não conseguiu empacotar a dependência `mysql2` nas hooks do PocketBase devido a um erro relacionado ao `pnpm`.

Com essa separação, o PocketBase não precisa acessar o MySQL diretamente. Ele realiza apenas requisições HTTP utilizando o `fetch()`, enquanto o Bridge fica responsável pela conexão e consulta ao banco.

## Como funciona

```text
PocketBase (Skip Cloud)
        │
        │ HTTP / fetch()
        ▼
Zalike MySQL Bridge
        │
        │ SELECT
        ▼
MySQL Zalike
