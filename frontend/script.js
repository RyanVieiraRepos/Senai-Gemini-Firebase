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

  if (peso > 500) {
    erroEl.textContent = 'Valor de peso inválido. Insira um peso entre 1 e 500 kg.';
    erroEl.classList.add('visible');
    return;
  }

  if (altura < 0.5 || altura > 3) {
    erroEl.textContent = 'Valor de altura inválido. Insira a altura em metros (ex: 1.75).';
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
      const data = await response.json();
      erroEl.textContent = data.message || 'Limite diário atingido: máximo 2 cálculos por dia';
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

  // Clear existing results
  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.forEach(row => row.remove());

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
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return '-';
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
