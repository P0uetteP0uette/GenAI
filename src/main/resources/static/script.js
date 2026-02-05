document.addEventListener("DOMContentLoaded", function() {
    
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Nouveaux éléments pour l'image
    const attachBtn = document.getElementById('attachBtn');
    const imageInput = document.getElementById('imageInput');

    // 1. Gestion du clic sur le trombone
    attachBtn.addEventListener('click', () => imageInput.click());

    // 2. Quand une image est choisie, on change la couleur du trombone
    imageInput.addEventListener('change', () => {
        if (imageInput.files.length > 0) {
            attachBtn.classList.add('has-file'); // Devient vert
        } else {
            attachBtn.classList.remove('has-file');
        }
    });

    // Gestion Envoi
    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    async function sendMessage() {
        const text = userInput.value.trim();
        const file = imageInput.files[0];

        // On empêche l'envoi si tout est vide
        if (!text && !file) return;

        // Affichage du message utilisateur
        let displayMsg = text;
        if (file) displayMsg += ` 📷 [Image: ${file.name}]`; // Petit indicateur visuel
        addMessage(displayMsg, 'user-message');

        // Reset visuel immédiat
        userInput.value = '';
        sendBtn.disabled = true;
        sendBtn.innerText = '...';

        try {
            // --- C'est ICI que ça change (Mode POST + FormData) ---
            const formData = new FormData();
            formData.append('question', text);
            if (file) {
                formData.append('file', file);
            }

            // Appel API en POST (plus sécurisé et gère les fichiers)
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error("Erreur serveur : " + response.status);
            
            const aiResponse = await response.text();
            addMessage(aiResponse, 'ai-message');

            // On nettoie l'image après l'envoi réussi
            imageInput.value = ''; 
            attachBtn.classList.remove('has-file');

        } catch (error) {
            console.error(error);
            addMessage("❌ Erreur : " + error.message, 'ai-message');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerText = 'Envoyer';
            userInput.focus();
        }
    }

    function addMessage(text, className) {
        const div = document.createElement('div');
        div.className = `message ${className}`;
        div.innerText = text;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});