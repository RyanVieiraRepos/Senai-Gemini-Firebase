const { admin } = require('../config/firebase');
const FirestoreService = require('./firestore.service');

class IMCService {
  async calculateAndStore(userId, ipAddress, peso, altura) {
    const imc = peso / (altura * altura);
    const categoria = this.getCategory(imc);
    const today = new Date().toISOString().split('T')[0];
    const expiresAt = new Date(new Date().setDate(new Date().getDate() + 1));

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
    const savedResult = await FirestoreService.addImcResult(result);

    // Update user rate limit
    await FirestoreService.incrementRateLimit(`rate_limits`, `${userId}_${today}`, {
      userId,
      date: today,
      count: admin.firestore.FieldValue.increment(1),
      expiresAt
    });

    // Update IP rate limit
    await FirestoreService.incrementRateLimit(`ip_rate_limits`, `${ipAddress}_${today}`, {
      ipAddress,
      date: today,
      count: admin.firestore.FieldValue.increment(1),
      expiresAt
    });

    return savedResult;
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
    return FirestoreService.getImcResults(limit);
  }
}

module.exports = new IMCService();
