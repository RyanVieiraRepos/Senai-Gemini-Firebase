# IMC Calculator with Database Implementation Plan

## Overview
Enhance the IMC calculator to:
- Store results in a database
- Implement rate limiting (2 calculations per user per day)
- Display all users' results in real-time
- Auto-refresh results every 2 minutes

---

## 1. Database Schema

### Firebase Firestore Collections

#### Collection: `users`
```
{
  uid: string (auto-generated)
  email: string (optional)
  createdAt: timestamp
  lastCalculation: timestamp
  calculationCount: number (resets daily)
}
```

#### Collection: `imc_results`
```
{
  resultId: string (auto-generated)
  userId: string (reference to users)
  peso: number
  altura: number
  imc: number
  categoria: string
  createdAt: timestamp
  userIdentifier: string (anonymous ID or email)
}
```

#### Collection: `rate_limits`
```
{
  limitId: string (auto-generated)
  userId: string
  ipAddress: string
  date: string (YYYY-MM-DD format)
  count: number (incremented each calculation)
  expiresAt: timestamp (next day at 00:00)
}
```

#### Collection: `ip_rate_limits`
```
{
  ipLimitId: string (auto-generated)
  ipAddress: string
  date: string (YYYY-MM-DD format)
  count: number (incremented each calculation)
  expiresAt: timestamp (next day at 00:00)
}
```

---

## 2. Backend Implementation (Node.js + Express)

### Required Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "firebase-admin": "^12.0.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0",
    "dotenv": "^16.0.0"
  }
}
```

### File Structure
```
backend/
├── src/
│   ├── config/
│   │   └── firebase.js          (Firebase initialization)
│   ├── controllers/
│   │   ├── imc.controller.js    (IMC calculation logic)
│   │   └── results.controller.js (Fetch results)
│   ├── middleware/
│   │   ├── auth.js              (User authentication/identification)
│   │   └── rateLimit.js         (Rate limiting middleware)
│   ├── routes/
│   │   ├── imc.routes.js
│   │   └── results.routes.js
│   ├── services/
│   │   ├── imc.service.js       (Business logic)
│   │   └── firestore.service.js (DB operations)
│   └── index.js                 (Main server file)
├── package.json
└── .env
```

### Key Files

#### `backend/src/config/firebase.js`
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
```

#### `backend/src/middleware/auth.js`
```javascript
const { v4: uuidv4 } = require('uuid');

module.exports = (req, res, next) => {
  let userId = req.headers['x-user-id'];
  
  if (!userId) {
    userId = uuidv4();
  }
  
  // Extract IP address
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket?.remoteAddress;
  
  req.userId = userId;
  req.ipAddress = ipAddress;
  next();
};
```

#### `backend/src/middleware/rateLimit.js`
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

module.exports = async (req, res, next) => {
  const userId = req.userId;
  const ipAddress = req.ipAddress;
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Check user ID rate limit
    const userLimitDoc = db.collection('rate_limits').doc(`${userId}_${today}`);
    const userLimitSnapshot = await userLimitDoc.get();
    const userCount = userLimitSnapshot.exists ? userLimitSnapshot.data().count : 0;
    
    if (userCount >= 2) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Maximum 2 calculations per day allowed (user)'
      });
    }
    
    // Check IP address rate limit
    const ipLimitDoc = db.collection('ip_rate_limits').doc(`${ipAddress}_${today}`);
    const ipLimitSnapshot = await ipLimitDoc.get();
    const ipCount = ipLimitSnapshot.exists ? ipLimitSnapshot.data().count : 0;
    
    if (ipCount >= 2) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Maximum 2 calculations per day allowed (IP address)'
      });
    }
    
    req.remainingCalculations = 2 - userCount;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Rate limit check failed' });
  }
};
```

#### `backend/src/services/imc.service.js`
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

class IMCService {
  async calculateAndStore(userId, ipAddress, peso, altura) {
    const imc = peso / (altura * altura);
    const categoria = this.getCategory(imc);
    
    const result = {
      userId,
      ipAddress,
      peso,
      altura,
      imc: parseFloat(imc.toFixed(1)),
      categoria,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userIdentifier: this.generateUserIdentifier(userId)
    };
    
    // Store result
    const docRef = await db.collection('imc_results').add(result);
    
    // Update user rate limit
    const today = new Date().toISOString().split('T')[0];
    const userLimitDoc = db.collection('rate_limits').doc(`${userId}_${today}`);
    await userLimitDoc.set({
      userId,
      date: today,
      count: admin.firestore.FieldValue.increment(1),
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 1))
    }, { merge: true });
    
    // Update IP rate limit
    const ipLimitDoc = db.collection('ip_rate_limits').doc(`${ipAddress}_${today}`);
    await ipLimitDoc.set({
      ipAddress,
      date: today,
      count: admin.firestore.FieldValue.increment(1),
      expiresAt: new Date(new Date().setDate(new Date().getDate() + 1))
    }, { merge: true });
    
    return { id: docRef.id, ...result };
  }
  
  getCategory(imc) {
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    if (imc < 35) return 'Obesidade grau I';
    if (imc < 40) return 'Obesidade grau II';
    return 'Obesidade grau III';
  }
  
  generateUserIdentifier(userId) {
    return userId.substring(0, 8).toUpperCase();
  }
  
  async getAllResults(limit = 50) {
    const snapshot = await db.collection('imc_results')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}

module.exports = new IMCService();
```

#### `backend/src/controllers/imc.controller.js`
```javascript
const IMCService = require('../services/imc.service');

exports.calculate = async (req, res) => {
  try {
    const { peso, altura } = req.body;
    const userId = req.userId;
    const ipAddress = req.ipAddress;
    
    // Validation
    if (!peso || !altura || peso <= 0 || altura <= 0) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const result = await IMCService.calculateAndStore(userId, ipAddress, peso, altura);
    
    res.json({
      success: true,
      result,
      remainingCalculations: req.remainingCalculations - 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

#### `backend/src/controllers/results.controller.js`
```javascript
const IMCService = require('../services/imc.service');

exports.getAll = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const results = await IMCService.getAllResults(parseInt(limit));
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

#### `backend/src/routes/imc.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rateLimitMiddleware = require('../middleware/rateLimit');
const imcController = require('../controllers/imc.controller');

router.post(
  '/calculate',
  authMiddleware,
  rateLimitMiddleware,
  imcController.calculate
);

module.exports = router;
```

#### `backend/src/routes/results.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/results.controller');

router.get('/all', resultsController.getAll);

module.exports = router;
```

#### `backend/src/index.js`
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const imcRoutes = require('./routes/imc.routes');
const resultsRoutes = require('./routes/results.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/imc', imcRoutes);
app.use('/api/results', resultsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### `backend/.env`
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
PORT=3000
```

---

## 3. Frontend Implementation

### Modified `frontend/script.js`
```javascript
// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes
let userId = localStorage.getItem('userId');

if (!userId) {
  userId = generateUUID();
  localStorage.setItem('userId', userId);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function calcular() {
  const peso = parseFloat(document.getElementById('peso').value);
  const altura = parseFloat(document.getElementById('altura').value);
  const erroEl = document.getElementById('erro');
  const resEl = document.getElementById('resultado');

  erroEl.classList.remove('visible');
  resEl.classList.remove('visible');

  // Validation
  if (isNaN(peso) || isNaN(altura) || peso <= 0 || altura <= 0) {
    erroEl.textContent = 'Por favor, informe valores válidos para peso e altura.';
    erroEl.classList.add('visible');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/imc/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ peso, altura })
    });

    if (response.status === 429) {
      erroEl.textContent = 'Limite diário atingido: máximo 2 cálculos por dia';
      erroEl.classList.add('visible');
      return;
    }

    if (!response.ok) {
      throw new Error('Erro ao calcular IMC');
    }

    const data = await response.json();
    const result = data.result;

    // Display result
    document.getElementById('imc-valor').textContent = result.imc.toString().replace('.', ',');
    document.getElementById('imc-categoria').textContent = result.categoria;
    document.getElementById('imc-tip').textContent = getTip(result.categoria);

    resEl.className = `result visible ${getCSSClass(result.categoria)}`;

    // Clear inputs
    document.getElementById('peso').value = '';
    document.getElementById('altura').value = '';

    // Refresh all results immediately
    await carregarResultados();
  } catch (error) {
    erroEl.textContent = 'Erro ao enviar dados. Tente novamente.';
    erroEl.classList.add('visible');
    console.error(error);
  }
}

async function carregarResultados() {
  try {
    const response = await fetch(`${API_BASE_URL}/results/all?limit=100`);
    
    if (!response.ok) {
      throw new Error('Erro ao carregar resultados');
    }

    const data = await response.json();
    atualizarTabelaResultados(data.data);
  } catch (error) {
    console.error('Erro ao carregar resultados:', error);
  }
}

function atualizarTabelaResultados(resultados) {
  const tbody = document.querySelector('table tbody');
  
  if (!tbody) return;

  // Clear existing results (keep reference rows)
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    if (index >= 6) { // Keep first 6 reference rows
      row.remove();
    }
  });

  // Add new results
  resultados.forEach(resultado => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${resultado.userIdentifier}</td>
      <td>${resultado.imc.toFixed(1)}</td>
      <td>${resultado.categoria}</td>
      <td>${formatDate(resultado.createdAt)}</td>
    `;
    tbody.appendChild(row);
  });
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  
  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate(); // Firestore Timestamp
  } else if (typeof timestamp === 'object' && timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleString('pt-BR');
}

function getCSSClass(categoria) {
  const classMap = {
    'Abaixo do peso': 'cat-abaixo',
    'Peso normal': 'cat-normal',
    'Sobrepeso': 'cat-sobrepeso',
    'Obesidade grau I': 'cat-obesidade1',
    'Obesidade grau II': 'cat-obesidade2',
    'Obesidade grau III': 'cat-obesidade3'
  };
  return classMap[categoria] || '';
}

function getTip(categoria) {
  const tips = {
    'Abaixo do peso': 'Considere consultar um nutricionista para avaliar sua alimentação.',
    'Peso normal': 'Parabéns! Mantenha uma alimentação equilibrada e pratique atividades físicas.',
    'Sobrepeso': 'Pequenas mudanças na dieta e mais atividade física podem ajudar bastante.',
    'Obesidade grau I': 'Recomenda-se acompanhamento médico e nutricional.',
    'Obesidade grau II': 'Procure orientação médica especializada o quanto antes.',
    'Obesidade grau III': 'Acompanhamento médico urgente é fortemente recomendado.'
  };
  return tips[categoria] || '';
}

// Event listeners
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') calcular();
});

// Load results on page load
window.addEventListener('load', carregarResultados);

// Auto-refresh results every 2 minutes
setInterval(carregarResultados, REFRESH_INTERVAL);
```

### Modified `frontend/index.html`
Update the table section to include a 4-column header:

```html
<div class="table-section">
  <div class="table-title">Últimos Cálculos (Atualiza a cada 2 minutos)</div>
  <table>
    <thead>
      <tr>
        <th>Usuário</th>
        <th>IMC</th>
        <th>Categoria</th>
        <th>Data/Hora</th>
      </tr>
    </thead>
    <tbody>
      <!-- Results will be populated dynamically -->
    </tbody>
  </table>
</div>
```

### Modified `frontend/styles.css`
Add new styles for the results table:

```css
tbody tr {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

table tbody td:nth-child(2) {
  font-weight: 600;
  color: #0f3460;
}

table tbody td:nth-child(3) {
  font-weight: 500;
  text-transform: capitalize;
}

table tbody td:nth-child(4) {
  font-size: 12px;
  color: #9ca3af;
}

.table-title::after {
  content: '';
  display: inline-block;
  margin-left: 8px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 4. Firebase Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database
4. Set security rules for Firestore

### Step 2: Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /imc_results/{document=**} {
      allow read: if true;
      allow create: if true;
      allow update: if false;
      allow delete: if false;
    }
    match /rate_limits/{document=**} {
      allow read: if true;
      allow write: if true;
    }
    match /users/{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

### Step 3: Generate Service Account Key
1. Go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `backend/src/config/serviceAccountKey.json`

---

## 5. Installation & Setup Steps

### Backend Setup
```bash
cd backend
npm install
# Add serviceAccountKey.json to src/config/
npm start
```

### Frontend Setup
```bash
# Already in frontend folder
# Update API_BASE_URL in script.js to match your backend URL
```

### Environment Variables
Create `backend/.env`:
```
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=your-email
```

---

## 6. API Endpoints

### POST `/api/imc/calculate`
**Request:**
```json
{
  "peso": 70,
  "altura": 1.75
}
```

**Response (200):**
```json
{
  "success": true,
  "result": {
    "id": "doc-id",
    "userId": "uuid",
    "peso": 70,
    "altura": 1.75,
    "imc": 22.9,
    "categoria": "Peso normal",
    "createdAt": "timestamp",
    "userIdentifier": "ABC123DE"
  },
  "remainingCalculations": 1
}
```

**Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 2 calculations per day allowed (user)"
}
```

or

```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 2 calculations per day allowed (IP address)"
}
```

### GET `/api/results/all?limit=100`
**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": "doc-id",
      "userId": "uuid",
      "peso": 70,
      "altura": 1.75,
      "imc": 22.9,
      "categoria": "Peso normal",
      "createdAt": "timestamp",
      "userIdentifier": "ABC123DE"
    }
  ]
}
```

---

## 7. Testing Checklist

- [ ] User receives UUID and stores in localStorage
- [ ] IMC calculation works client-side
- [ ] Results sent to backend with rate limit check
- [ ] Results stored in Firestore
- [ ] User ID rate limit enforced (2 per day)
- [ ] IP address rate limit enforced (2 per day)
- [ ] Rate limit error messages differentiate between user and IP limits
- [ ] User identifier anonymized (first 8 chars)
- [ ] IP address extracted correctly from request headers
- [ ] Results table updates after calculation
- [ ] Auto-refresh works every 2 minutes
- [ ] Multiple users see each other's results
- [ ] Timestamps format correctly
- [ ] Rate limits reset at midnight (UTC)

---

## 8. Deployment Considerations

### Backend (Heroku/Railway/Google Cloud)
```bash
# Add Procfile
web: node src/index.js
```

### Frontend (GitHub Pages/Vercel/Netlify)
- Update `API_BASE_URL` to deployed backend URL
- Build and deploy static files

### Database
- Firebase handles scaling automatically
- Monitor Firestore usage and costs
- Set up automated cleanup for old data (optional)

---

## 9. Future Enhancements

- [ ] User authentication with email
- [ ] User profile with calculation history
- [ ] Export results as CSV/PDF
- [ ] Charts showing BMI trends
- [ ] Email notifications
- [ ] Advanced filtering/sorting
- [ ] Data export for analytics
- [ ] Real-time WebSocket updates instead of polling
