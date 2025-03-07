// testData.js
const fs = require('fs');

try {
  const files = fs.readdirSync('/data');
  console.log('Contenu de /data :', files);
} catch (err) {
  console.error('Erreur en listant /data :', err);
}
