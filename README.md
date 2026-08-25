# Zalike MySQL Bridge

Microsserviço pequeno que fica entre o PocketBase (rodando no Skip Cloud) e o
MySQL externo da Zalike. Existe porque o build do Skip Cloud não conseguiu
empacotar o `mysql2` dentro das hooks do PocketBase (erro de `pnpm`), então
essa conexão foi isolada aqui — o PocketBase só precisa fazer `fetch()`
(nativo, sem dependências) para chamar esse serviço.

## Endpoints

- `GET /health` — checagem simples, sem autenticação.
- `GET /cliente-lookup?cnpj=11.396.335/0001-97` — retorna dados do cliente,
  forma de pagamento padrão e código do representante.
- `GET /produto-lookup?codigo=X&id_cliente=Y` — retorna o código interno do
  produto, buscando por EAN, código do cliente ou referência.

Ambos exigem o header `x-api-key` com o valor de `BRIDGE_API_KEY`.

## Rodando localmente

```bash
npm install
cp .env.example .env
# edite o .env com a senha real e uma chave aleatória
npm start
```

Teste com:
```bash
curl -H "x-api-key: SUA_CHAVE" "http://localhost:3000/cliente-lookup?cnpj=11.396.335/0001-97"
```

## Deploy no Railway ou Render

1. Suba esse código para um repositório no GitHub (pode ser privado).
2. No Railway (railway.app) ou Render (render.com), crie um novo projeto
   "Deploy from GitHub repo" apontando para esse repositório.
3. Nas configurações de variáveis de ambiente do serviço, cadastre:
   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `BRIDGE_API_KEY`
   (os mesmos valores do seu `.env`, nunca comitados no repositório).
4. Após o deploy, você recebe uma URL pública, tipo
   `https://zalike-mysql-bridge.up.railway.app`.
5. Teste essa URL com o mesmo `curl` do passo anterior, trocando `localhost:3000`
   pela URL pública.

## Importante

- O `.env` nunca deve ser commitado — já existe um `.gitignore` cobrindo isso.
- Esse serviço só faz leitura (`SELECT`), nunca escreve no banco da Zalike.
- Lembre-se do limite de 5 tentativas de conexão com credencial errada antes
  do firewall bloquear o IP — não configure retries agressivos apontando
  para esse serviço.
