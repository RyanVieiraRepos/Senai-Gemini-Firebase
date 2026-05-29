# Senai Gemini Firebase - IMC Calculator

## Rodando local

### 1. Backend
1. Abra um terminal em `backend/`
2. Instale dependências:
   ```bash
   npm install
   ```
3. Copie o exemplo de ambiente:
   ```bash
   cp .env.example .env
   ```
4. Preencha o arquivo `backend/.env` com seus dados do Firebase:
   ```env
   PORT=3000
   FIREBASE_PROJECT_ID=seu-project-id
   FIREBASE_PRIVATE_KEY="sua-chave-privada"
   FIREBASE_CLIENT_EMAIL=seu-client-email
   ```
5. Inicie o servidor:
   ```bash
   npm start
   ```
6. Verifique se está no ar:
   - `http://localhost:3000/health`

### 2. Frontend
1. Abra a pasta `frontend/`
2. Sirva os arquivos estáticos em um navegador. Exemplo rápido:
   ```bash
   cd frontend
   python -m http.server 8000
   ```
3. Abra no navegador:
   - `http://localhost:8000`
4. Confirme que `frontend/script.js` possui:
   ```js
   const API_BASE_URL = 'http://localhost:3000/api';
   ```

## Testes locais

1. Insira `peso` e `altura` na interface.
2. Clique em `Calcular IMC`.
3. Verifique se o resultado aparece e se a tabela é atualizada.
4. Faça duas requisições e veja se a terceira retorna o erro de limite diário (`429`).

## Rodando em produção

### Backend em produção
1. Configure variáveis de ambiente no serviço de hospedagem ou no servidor:
   - `PORT`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`
2. Nunca adicione esses valores ao controle de versão.
3. Use o gerenciador de segredos da plataforma de hospedagem (Heroku Config Vars, Vercel Environment Variables, AWS Secrets Manager, etc.).
4. Inicie o backend com `node src/index.js` ou usando o gerenciador de processos da plataforma.
5. Garanta que a porta esteja liberada e que o backend esteja acessível via URL pública.

### Frontend em produção
1. Suba os arquivos estáticos de `frontend/` para o host desejado (GitHub Pages, Netlify, Vercel, etc.).
2. Atualize `frontend/script.js` para usar a URL pública do backend:
   ```js
   const API_BASE_URL = 'https://seu-backend-publico.com/api';
   ```
3. Abra a URL do frontend.

## Segurança de variáveis
- Nunca suba `backend/.env` para o GitHub.
- Adicione `.env` ao `.gitignore` se ainda não estiver listado.
- Em produção, configure os valores diretamente no provedor de hospedagem em vez de armazenar em arquivos públicos.
- Use serviços de gerenciamento de segredos para proteger chaves e variáveis sensíveis.

## Observações

- O frontend é apenas um site estático que consome a API do backend.
- O backend usa Firebase Firestore para armazenar resultados e controlar limite diário.
- No ambiente de produção, mantenha as chaves do Firebase seguras e não as publique.
