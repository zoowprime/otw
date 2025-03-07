// src/testData.js
const fs = require('fs');

const dataPath = 'C:\\data'; // Notez les doubles antislashs pour Windows

try {
  const files = fs.readdirSync(dataPath);
  console.log('Contenu de C:\\data :', files);
} catch (err) {
  console.error('Erreur en listant C:\\data :', err);
}
