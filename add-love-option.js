const { MongoClient } = require('mongodb');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/rkeyprod');
  await client.connect();
  const db = client.db();
  
  const option = {
    id: uuidv4(),
    name: 'Lettres géantes LOVE en bois',
    description: "Créez une atmosphère mémorable et romantique avec nos sublimes lettres géantes LOVE en bois, l'élément parfait pour rehausser votre événement. Hautes d'un mètre, ces lettres majestueuses apportent une touche chaleureuse et authentique, idéale pour les thèmes champêtre, nature ou bohème. Leur finition peut être entièrement personnalisée aux couleurs de votre choix, garantissant une intégration harmonieuse à votre décor et d'innombrables opportunités de photos inoubliables. Offrez à vos invités un arrière-plan spectaculaire et empreint d'amour.",
    price: 0,
    price_suffix: '',
    type: 'option',
    sort_order: 100,
    created_at: new Date().toISOString()
  };
  
  await db.collection('material_options').insertOne(option);
  console.log("Option added:", option.name);
  await client.close();
}
run().catch(console.error);
