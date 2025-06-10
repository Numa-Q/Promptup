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

