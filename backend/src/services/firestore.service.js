const { db } = require('../config/firebase');

class FirestoreService {
  async addImcResult(result) {
    const docRef = await db.collection('imc_results').add(result);
    return { id: docRef.id, ...result };
  }

  async incrementRateLimit(collectionName, docId, payload) {
    const docRef = db.collection(collectionName).doc(docId);
    await docRef.set(payload, { merge: true });
  }

  async getImcResults(limit = 50) {
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

module.exports = new FirestoreService();
