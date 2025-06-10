Ce document récapitule les décisions clés et la proposition de MVP pour une application locale HTML/CSS/JS de gestion d'images générées par IA et leurs prompts associés. Il est conçu pour servir de référence rapide et reprendre le développement même en cas de coupure internet.
1. Objectif Principal
Développer une application web fonctionnant entièrement en local (sans serveur) pour permettre aux utilisateurs de sauvegarder et consulter leurs images IA et prompts, en évitant la perte de données d'un service en ligne sans mécanisme de sauvegarde. L'accent est mis sur la simplicité et la robustesse pour un MVP.
2. Technologies Utilisées
 * HTML : Structure de la page web.
 * CSS : Stylisation de l'interface utilisateur.
 * JavaScript : Toute la logique métier, gestion des interactions DOM, du stockage temporaire (IndexedDB) et de la manipulation des fichiers JSON.
3. Mécanisme de Stockage
A. Stockage des Images
 * Les images elles-mêmes ne seront pas stockées dans les fichiers JSON ni dans IndexedDB.
 * Lors de l'ajout d'une image, l'utilisateur sera invité à télécharger l'image manuellement (ou via un bouton de téléchargement proposé par l'application) vers un dossier de son choix sur son PC.
 * Seul le nom du fichier image (ex: mon_image_ia.png) sera enregistré dans les données (IndexedDB temporaire et fichier JSON final). L'application supposera que les images sont accessibles via un chemin relatif connu (par exemple, dans le même dossier que le fichier JSON ou un sous-dossier désigné) lors de la consultation.
B. Stockage des Prompts et Métadonnées
 * Stockage Temporaire (Avant Sauvegarde Finale) : Les prompts et métadonnées des nouvelles entrées seront stockés dans IndexedDB pour assurer la persistance même en cas de fermeture inopinée du navigateur.
 * Stockage Final (Après Sauvegarde) : Les données consolidées seront sauvegardées dans un ou plusieurs fichiers JSON sur le disque local de l'utilisateur.
4. Structure des Données
A. Structure de l'objet d'enregistrement (pour IndexedDB et JSON final)
Chaque enregistrement sera un objet JavaScript/JSON avec la structure suivante :
{
  "id": "uniqueIdExemple",
  "imageFileName": "nom_image_exemple.png",
  "prompt": "Un prompt détaillé pour une image IA.",
  "creationDate": "2024-06-10T14:30:00Z"
}

 * id (Chaîne de caractères) : Un identifiant unique généré par l'application pour chaque enregistrement (ex: un UUID ou un timestamp millisecondes).
 * imageFileName (Chaîne de caractères) : Le nom du fichier de l'image associée (ex: my_amazing_image.webp).
 * prompt (Chaîne de caractères) : Le texte du prompt utilisé pour générer l'image.
 * creationDate (Chaîne de caractères ISO 8601) : La date et l'heure de l'ajout de l'enregistrement.
Note : La fonctionnalité de tags est retirée pour cette version MVP afin de simplifier le développement initial. Elle pourra être réintroduite dans des versions ultérieures.
B. Structure du Fichier JSON de Sauvegarde Finale
Le fichier JSON final (ex: images_prompts_2024_06_10T14-30-00.json) sera un tableau d'objets de la structure définie ci-dessus :
[
  {
    "id": "uniqueId1",
    "imageFileName": "chat_astronaute.png",
    "prompt": "Un chat astronaute flottant dans l'espace, style réaliste, lumière douce.",
    "creationDate": "2024-06-10T14:30:00Z"
  },
  {
    "id": "uniqueId2",
    "imageFileName": "cyberpunk_city.jpg",
    "prompt": "Paysage cyberpunk pluvieux avec néons, style art numérique.",
    "creationDate": "2024-06-10T14:35:00Z"
  }
]

5. Fonctionnalités Détaillées du MVP
A. Interface Utilisateur (HTML/CSS)
 * Section "Ajouter un Enregistrement" :
   * Zone de glisser-déposer (<input type="file">) pour l'image avec un mécanisme de prévisualisation de l'image sélectionnée.
   * Un grand champ de texte (<textarea>) pour coller le prompt.
   * Un bouton "Ajouter à la file d'attente" (ou "Ajouter") qui déclenchera l'enregistrement temporaire dans IndexedDB.
 * Section "Sauvegarde et État" :
   * Un compteur visuel (ex: un <span> dans un "toast" ou une notification persistante) affichant le nombre d'enregistrements en attente de sauvegarde (issus d'IndexedDB).
   * Un bouton "Sauvegarder toutes les modifications" qui initiera le processus de fusion et de téléchargement du fichier JSON.
 * Section "Consulter mes Données" :
   * Un bouton "Charger mes données" (<input type="file">) permettant à l'utilisateur de sélectionner un fichier JSON existant depuis son disque.
   * Une zone d'affichage (<div>) où les images et leurs prompts associés seront affichés après chargement (par exemple, une grille de vignettes avec le prompt sous chaque image).
B. Logique JavaScript de Gestion des Données Temporaires (IndexedDB)
 * Initialisation : Au chargement de la page, l'application initialisera une base de données IndexedDB (nommée par exemple ImagePromptsDB) avec un "object store" (nommé pendingEntries).
 * Ajout d'une entrée : Lorsque l'utilisateur clique sur "Ajouter à la file d'attente" :
   * Récupération du prompt et du nom de fichier de l'image sélectionnée.
   * Génération d'un id unique et de la creationDate.
   * Création de l'objet d'enregistrement.
   * Ajout de cet objet à l'pendingEntries dans IndexedDB.
   * Mise à jour du compteur d'enregistrements en attente sur l'interface.
 * Récupération au démarrage : À chaque chargement de la page, l'application interrogera IndexedDB pour pendingEntries. S'il y a des données, elles seront chargées dans la logique de l'application et le compteur sera mis à jour, signalant à l'utilisateur qu'il a des modifications en attente.
 * Persistance en cas de "mauvaise manipulation" : Les données dans IndexedDB sont persistantes et survivent à la fermeture du navigateur, garantissant que les modifications non sauvegardées ne sont pas perdues.
C. Logique JavaScript de Sauvegarde Finale (Fichier JSON)
 * Déclenchement : L'utilisateur clique sur le bouton "Sauvegarder toutes les modifications".
 * Chargement du JSON Existant : L'application demandera à l'utilisateur de sélectionner un fichier JSON existant (via un input type="file"). Si aucun fichier n'est sélectionné (premier enregistrement ou l'utilisateur veut un nouveau fichier), un tableau vide sera utilisé comme base.
 * Fusion des Données :
   * Toutes les entrées de pendingEntries (IndexedDB) sont récupérées.
   * Ces nouvelles entrées sont combinées avec les données du fichier JSON précédemment chargé.
 * Nommage du Fichier : Le nouveau fichier JSON sera nommé avec un horodatage pour éviter d'écraser les sauvegardes précédentes et permettre un historique (ex: images_prompts_AAAA-MM-JJTHH-MM-SS.json).
   * Exemple de format : images_prompts_2024_06_10T15-30-00.json.
 * Téléchargement : L'application générera le contenu du fichier JSON mis à jour et proposera à l'utilisateur de le télécharger sur son PC via une URL Blob et un lien de téléchargement simulé.
 * Nettoyage : Une fois le téléchargement géré (ou après un court délai pour permettre à l'utilisateur de sauvegarder), l'object store pendingEntries dans IndexedDB sera vidé, et le compteur d'enregistrements en attente sera remis à zéro.
D. Logique JavaScript de Consultation des Données
 * Déclenchement : L'utilisateur clique sur le bouton "Charger mes données".
 * Sélection de Fichier : Un input type="file" sera affiché, permettant à l'utilisateur de choisir le fichier JSON qu'il souhaite charger et afficher. Il devra sélectionner le fichier désiré en raison des noms horodatés.
 * Lecture du Fichier : Le contenu du fichier JSON sélectionné sera lu par l'API FileReader.
 * Affichage : Les données JSON seront analysées, et pour chaque enregistrement :
   * L'image sera affichée en utilisant son imageFileName comme src (en supposant qu'elle est accessible dans un chemin relatif).
   * Le prompt sera affiché sous l'image.
Ce devlog est maintenant complet et à jour avec toutes nos discussions. Nous avons une feuille de route claire pour la construction de ce MVP.
Nous pouvons maintenant passer à la mise en œuvre. Souhaitez-vous que je fournisse la structure de base du fichier index.html ? Ou peut-être le code JavaScript initial pour la configuration d'IndexedDB ?
