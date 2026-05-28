function calcular() {
  var peso    = parseFloat(document.getElementById('peso').value);
  var altura  = parseFloat(document.getElementById('altura').value);
  var erroEl  = document.getElementById('erro');
  var resEl   = document.getElementById('resultado');

  erroEl.classList.remove('visible');
  resEl.classList.remove('visible');
  resEl.className = 'result';

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

  var imc = peso / (altura * altura);

  var categoria, cssClass, tip;

  if (imc < 18.5) {
    categoria = 'Abaixo do peso';
    cssClass  = 'cat-abaixo';
    tip       = 'Considere consultar um nutricionista para avaliar sua alimentação.';
  } else if (imc < 25) {
    categoria = 'Peso normal';
    cssClass  = 'cat-normal';
    tip       = 'Parabéns! Mantenha uma alimentação equilibrada e pratique atividades físicas.';
  } else if (imc < 30) {
    categoria = 'Sobrepeso';
    cssClass  = 'cat-sobrepeso';
    tip       = 'Pequenas mudanças na dieta e mais atividade física podem ajudar bastante.';
  } else if (imc < 35) {
    categoria = 'Obesidade grau I';
    cssClass  = 'cat-obesidade1';
    tip       = 'Recomenda-se acompanhamento médico e nutricional.';
  } else if (imc < 40) {
    categoria = 'Obesidade grau II';
    cssClass  = 'cat-obesidade2';
    tip       = 'Procure orientação médica especializada o quanto antes.';
  } else {
    categoria = 'Obesidade grau III';
    cssClass  = 'cat-obesidade3';
    tip       = 'Acompanhamento médico urgente é fortemente recomendado.';
  }

  document.getElementById('imc-valor').textContent    = imc.toFixed(1).replace('.', ',');
  document.getElementById('imc-categoria').textContent = categoria;
  document.getElementById('imc-tip').textContent      = tip;

  resEl.classList.add('visible', cssClass);
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') calcular();
});
