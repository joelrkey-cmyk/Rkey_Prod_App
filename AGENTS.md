# Instructions personnalisées du projet

## Règle d'upload de fichiers
*   **Stockage Cloud Systématique :** Dès qu'une fonctionnalité nécessite l'upload de médias (fichiers photos PNG/JPG, vidéos, PDF, ou de tout autre gros fichier), ces fichiers **DOIVENT** être enregistrés sur Google Cloud Storage (via `@google-cloud/storage`).
*   **Ne JAMAIS** stocker de fichiers uploadés directement en local sur le disque du serveur.
*   **URL publiques/protégées :** Renvoyer toujours les URLs accessibles via un endpoint `/api/gcs/...` ou l'URL publique de GCS, selon le niveau de confidentialité.
*   Cette règle s'applique de manière automatique à chaque nouvelle fonctionnalité impliquant un téléchargement vers le serveur.
