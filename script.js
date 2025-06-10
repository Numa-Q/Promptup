// script.js

// --- 1. Variables Globales et Constantes pour IndexedDB ---
const DB_NAME = 'ImagePromptsDB';
const DB_VERSION = 1; // Incrémenter cette version si la structure de la DB change
const OBJECT_STORE_NAME = 'pendingEntries';

let db; // Variable pour stocker l'instance de la base de données IndexedDB

// --- 2. Fonction d'Initialisation d'IndexedDB ---
function openDatabase() {
    return new Promise((resolve, reject) => {
        // Ouvre la base de données. Si elle n'existe pas, elle est créée.
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Gère les erreurs lors de l'ouverture
        request.onerror = (event) => {
            console.error("Erreur lors de l'ouverture de la base de données IndexedDB :", event.target.errorCode);
            reject('Erreur IndexedDB');
        };

        // Gère la réussite de l'ouverture
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Base de données IndexedDB ouverte avec succès.");
            resolve(db);
            updatePendingCount(); // Met à jour le compteur dès l'ouverture
        };

        // Gère les mises à jour de la structure de la base de données (création/modification d'object stores)
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Crée un 'object store' pour nos entrées en attente
            // 'id' sera la clé primaire unique pour chaque enregistrement
            if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
                console.log(`Object Store '${OBJECT_STORE_NAME}' créé.`);
            }
        };
    });
}

// --- 3. Fonctions CRUD de Base pour IndexedDB ---

/**
 * Ajoute une nouvelle entrée à l'object store des entrées en attente.
 * @param {Object} entry - L'objet { id, imageFileName, prompt, creationDate } à ajouter.
 */
function addPendingEntry(entry) {
    return new Promise((resolve, reject) => {
        // Crée une transaction en écriture sur l'object store
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(OBJECT_STORE_NAME);

        // Ajoute l'entrée
        const request = objectStore.add(entry);

        request.onsuccess = () => {
            console.log("Entrée ajoutée à IndexedDB :", entry);
            updatePendingCount(); // Met à jour le compteur après l'ajout
            resolve();
        };

        request.onerror = (event) => {
            console.error("Erreur lors de l'ajout à IndexedDB :", event.target.errorCode);
            reject('Erreur lors de l\'ajout de l\'entrée.');
        };
    });
}

/**
 * Récupère toutes les entrées de l'object store des entrées en attente.
 * @returns {Promise<Array>} - Une promesse qui résout en un tableau d'entrées.
 */
function getAllPendingEntries() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
        const request = objectStore.getAll(); // Récupère toutes les entrées

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error("Erreur lors de la récupération des entrées depuis IndexedDB :", event.target.errorCode);
            reject('Erreur lors de la récupération des entrées.');
        };
    });
}

/**
 * Vide l'object store des entrées en attente.
 */
function clearAllPendingEntries() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([OBJECT_STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(OBJECT_STORE_NAME);
        const request = objectStore.clear(); // Vide l'object store

        request.onsuccess = () => {
            console.log("IndexedDB videé.");
            updatePendingCount(); // Met à jour le compteur après le nettoyage
            resolve();
        };

        request.onerror = (event) => {
            console.error("Erreur lors du vidage d'IndexedDB :", event.target.errorCode);
            reject('Erreur lors du vidage des entrées.');
        };
    });
}

// --- 4. Mise à Jour du Compteur d'Enregistrements en Attente ---
async function updatePendingCount() {
    const pendingCountElement = document.getElementById('pending-count');
    try {
        const entries = await getAllPendingEntries();
        pendingCountElement.textContent = entries.length;
    } catch (error) {
        console.error("Impossible de mettre à jour le compteur :", error);
        pendingCountElement.textContent = 'Erreur';
    }
}

// script.js (suite)

// --- 6. Références aux éléments du DOM ---
const imageUploadInput = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const promptInput = document.getElementById('prompt-input');
const addToQueueBtn = document.getElementById('add-to-queue-btn');
const saveMessageElement = document.getElementById('save-message'); // Pour les messages de la section sauvegarde

let selectedImageFile = null; // Variable pour stocker le fichier image sélectionné

// --- 7. Gestion de la sélection et prévisualisation de l'image ---
imageUploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        selectedImageFile = file; // Stocke le fichier pour un usage ultérieur
        const reader = new FileReader();

        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Prévisualisation de l'image">`;
        };
        reader.readAsDataURL(file); // Lit le fichier comme une URL de données
    } else {
        selectedImageFile = null;
        imagePreview.innerHTML = '<p>Prévisualisation de l\'image ici</p>';
        showMessage(saveMessageElement, 'Veuillez sélectionner un fichier image valide.', 'error');
    }
});

// --- 8. Gestion de l'ajout à la file d'attente ---
addToQueueBtn.addEventListener('click', async () => {
    const prompt = promptInput.value.trim();

    if (!selectedImageFile) {
        showMessage(saveMessageElement, 'Veuillez d\'abord sélectionner une image.', 'error');
        return;
    }

    if (!prompt) {
        showMessage(saveMessageElement, 'Le prompt ne peut pas être vide.', 'error');
        return;
    }

    // Désactive le bouton pour éviter les clics multiples
    addToQueueBtn.disabled = true;

    try {
        const newEntry = {
            id: Date.now().toString(), // Utilisation du timestamp comme ID unique simple
            imageFileName: selectedImageFile.name,
            prompt: prompt,
            creationDate: new Date().toISOString()
        };

        await addPendingEntry(newEntry); // Ajoute à IndexedDB
        showMessage(saveMessageElement, 'Enregistrement ajouté à la file d\'attente !', 'success');

        // Réinitialisation de l'interface après ajout
        imageUploadInput.value = ''; // Réinitialise l'input file
        selectedImageFile = null;
        imagePreview.innerHTML = '<p>Prévisualisation de l\'image ici</p>';
        promptInput.value = ''; // Vide le champ du prompt

    } catch (error) {
        console.error("Erreur lors de l'ajout à la file d'attente :", error);
        showMessage(saveMessageElement, `Erreur : ${error.message || error}`, 'error');
    } finally {
        // Réactive le bouton
        addToQueueBtn.disabled = false;
    }
});


// --- 9. Fonction utilitaire pour afficher les messages ---
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`; // Ajoute la classe 'success' ou 'error'
    element.style.display = 'block'; // Affiche le message

    // Masque le message après quelques secondes
    setTimeout(() => {
        element.style.display = 'none';
        element.textContent = '';
        element.className = 'message';
    }, 5000); // Le message disparaît après 5 secondes
}

// script.js (suite)

// --- 10. Références aux éléments du DOM pour la sauvegarde finale ---
const saveAllBtn = document.getElementById('save-all-btn');
const loadJsonFileInput = document.getElementById('load-json-file'); // Cet input est utilisé pour charger le JSON existant
const displayDataBtn = document.getElementById('display-data-btn'); // Bouton pour déclencher l'affichage après chargement
const loadMessageElement = document.getElementById('load-message'); // Pour les messages de la section de consultation
const imageGallery = document.getElementById('image-gallery'); // La div où les images seront affichées

// --- 11. Fonction pour télécharger le fichier JSON ---
function downloadJsonFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2); // Formater le JSON joliment
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // Nom du fichier proposé au téléchargement
    document.body.appendChild(a);
    a.click(); // Déclenche le téléchargement
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Libère l'URL de l'objet Blob
}

// --- 12. Gestion du bouton "Sauvegarder toutes les modifications" ---
saveAllBtn.addEventListener('click', async () => {
    saveAllBtn.disabled = true; // Désactive le bouton pour éviter les clics multiples
    showMessage(saveMessageElement, 'Préparation de la sauvegarde...', 'info'); // 'info' pour un message neutre

    try {
        const pendingEntries = await getAllPendingEntries(); // Récupère toutes les entrées d'IndexedDB

        if (pendingEntries.length === 0) {
            showMessage(saveMessageElement, 'Aucun enregistrement en attente de sauvegarde.', 'warning');
            return;
        }

        let existingData = [];

        // Demande à l'utilisateur de sélectionner un fichier JSON existant
        // Nous allons simuler cela en utilisant l'input 'load-json-file'
        // Pour un MVP, on simplifie : on force l'utilisateur à cliquer pour choisir le fichier,
        // ou on part d'une base vide s'il n'en choisit pas.

        // Une approche plus robuste serait d'ouvrir un dialogue de sélection de fichier directement ici.
        // Cependant, l'API File System Access n'est pas encore universellement supportée pour la sauvegarde directe.
        // Nous allons donc continuer avec le téléchargement, et laisser l'utilisateur gérer l'écrasement/le renommage.

        // La logique pour la fusion avec un fichier JSON EXISTANT est plus complexe avec l'API File input/output standard.
        // Pour ce MVP, nous allons simplifier : le bouton "Sauvegarder tout" va TOUJOURS créer un NOUVEAU fichier JSON horodaté
        // contenant TOUTES les données en attente. L'utilisateur sera responsable de gérer ses fichiers existants.
        // L'option de "charger un JSON existant" sera utilisée UNIQUEMENT pour la CONSULTATION.

        // Proposition simplifiée pour le MVP :
        // Le fichier de sauvegarde contiendra UNIQUEMENT les nouvelles entrées si l'utilisateur ne fusionne pas.
        // Ou, il peut choisir de charger un JSON existant et la fonction `displayDataBtn` gérera la fusion
        // des entrées existantes avec celles en attente avant la sauvegarde.

        // Pour coller au Devlog et simplifier, nous allons partir du principe que le bouton de sauvegarde
        // est là pour sauvegarder les ÉLÉMENTS EN ATTENTE dans un NOUVEAU fichier.
        // La fusion des NOUVELLES entrées AVEC un ANCIEN fichier JSON sera gérée par l'utilisateur
        // qui devra CHARGER l'ancien fichier AVANT de sauvegarder.

        // Donc, la logique sera : si des données sont déjà affichées (chargées d'un ancien JSON),
        // alors la sauvegarde fusionne avec ces données. Sinon, elle sauvegarde juste les pendingEntries.

        // Simplifions encore pour le MVP :
        // Le bouton "Sauvegarder toutes les modifications" va prendre les `pendingEntries`
        // et les sauvegarder dans un nouveau fichier JSON horodaté.
        // Il n'y aura pas de fusion automatique avec un JSON précédemment chargé par le bouton "Charger mes données".
        // La fusion serait une étape ultérieure nécessitant une gestion plus complexe de l'état de l'application.

        // Donc, le `data.json` sera généré à partir des `pendingEntries` UNIQUEMENT.
        // Les `pendingEntries` représentent la "base de données actuelle non persistante".

        // Collecter toutes les entrées qui seront sauvegardées (les pendingEntries)
        const dataToSave = pendingEntries;

        if (dataToSave.length === 0) {
            showMessage(saveMessageElement, 'Aucune donnée à sauvegarder.', 'warning');
            return;
        }

        // Génération du nom de fichier horodaté
        const now = new Date();
        // Format ISO string (YYYY-MM-DDTHH:MM:SS.sssZ) puis nettoyé pour le nom de fichier
        const dateString = now.toISOString().slice(0, 19).replace(/-/g, '_').replace(/:/g, '-').replace('T', '_');
        const filename = `images_prompts_${dateString}.json`;

        downloadJsonFile(dataToSave, filename); // Déclenche le téléchargement

        // Après le téléchargement (qui est asynchrone mais ne fournit pas de feedback direct au JS),
        // on considère que la sauvegarde a été initiée et on vide IndexedDB.
        await clearAllPendingEntries();
        showMessage(saveMessageElement, `Sauvegarde effectuée avec succès ! Fichier : ${filename}`, 'success');

    } catch (error) {
        console.error("Erreur lors de la sauvegarde finale :", error);
        showMessage(saveMessageElement, `Erreur lors de la sauvegarde : ${error.message || error}`, 'error');
    } finally {
        saveAllBtn.disabled = false; // Réactive le bouton
    }
});

// --- 13. Gestion de l'affichage des données chargées (Pour le bouton "Afficher les données") ---
// Cet input et ce bouton sont pour la consultation des données existantes, pas pour la fusion avant sauvegarde.
loadJsonFileInput.addEventListener('change', (event) => {
    // La sélection du fichier seule ne déclenche pas l'affichage.
    // L'affichage se fera via le bouton 'Afficher les données'
    loadMessageElement.textContent = `Fichier sélectionné : ${event.target.files[0]?.name || 'Aucun'}`;
    loadMessageElement.className = 'message success';
    loadMessageElement.style.display = 'block';
});

displayDataBtn.addEventListener('click', async () => {
    const file = loadJsonFileInput.files[0];
    if (!file) {
        showMessage(loadMessageElement, 'Veuillez sélectionner un fichier JSON à charger.', 'error');
        return;
    }

    displayDataBtn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (!Array.isArray(loadedData)) {
                throw new Error("Le fichier JSON ne contient pas un tableau valide.");
            }
            // Afficher les données chargées
            renderImageGallery(loadedData);
            showMessage(loadMessageElement, `"${file.name}" chargé avec succès !`, 'success');

        } catch (error) {
            console.error("Erreur lors du traitement du fichier JSON :", error);
            showMessage(loadMessageElement, `Erreur lors du chargement ou de l'analyse du JSON : ${error.message || error}`, 'error');
            imageGallery.innerHTML = '<p class="placeholder">Erreur lors du chargement des données.</p>';
        } finally {
            displayDataBtn.disabled = false;
        }
    };
    reader.onerror = () => {
        showMessage(loadMessageElement, 'Erreur lors de la lecture du fichier.', 'error');
        displayDataBtn.disabled = false;
    };
    reader.readAsText(file); // Lit le fichier comme du texte
});

// --- 14. Fonction pour rendre la galerie d'images ---
function renderImageGallery(data) {
    imageGallery.innerHTML = ''; // Vide la galerie existante

    if (data.length === 0) {
        imageGallery.innerHTML = '<p class="placeholder">Aucune donnée à afficher.</p>';
        return;
    }

    data.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'image-card';

        // Important: l'image sera chargée via son nom de fichier.
        // L'utilisateur doit s'assurer que les images sont dans un emplacement accessible
        // (par exemple, le même dossier que le fichier JSON ou un sous-dossier connu).
        // Pour un MVP, on suppose qu'elles sont dans le même dossier ou un sous-dossier `images/`.
        const imageUrl = entry.imageFileName; // Pas de chemin absolu, dépendra où l'utilisateur place le JSON/images
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="Image IA: ${entry.prompt}" loading="lazy">
            <div class="image-card-content">
                <p><strong>Prompt:</strong> ${entry.prompt}</p>
                <p><small>ID: ${entry.id}</small></p>
                <p><small>Date: ${new Date(entry.creationDate).toLocaleString()}</small></p>
            </div>
        `;
        imageGallery.appendChild(card);
    });
}

// Assurez-vous que l'écouteur DOMContentLoaded est toujours à la fin
// (Pas besoin de le coller à nouveau si vous l'avez déjà)
/*
document.addEventListener('DOMContentLoaded', () => {
    openDatabase().then(() => {
        console.log("Application prête.");
        // Ici, on pourrait ajouter d'autres initialisations si nécessaire
    }).catch(error => {
        console.error("Échec de l'initialisation de l'application :", error);
    });
});
*/


// --- 5. Lancement de l'Initialisation de la Base de Données ---
// On s'assure que le DOM est complètement chargé avant d'ouvrir la DB
document.addEventListener('DOMContentLoaded', () => {
    openDatabase().then(() => {
        console.log("Application prête.");
        // Ici, on pourrait ajouter d'autres initialisations si nécessaire
    }).catch(error => {
        console.error("Échec de l'initialisation de l'application :", error);
    });
});

