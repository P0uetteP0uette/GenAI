document.addEventListener("DOMContentLoaded", function() {
    
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const imageInput = document.getElementById('imageInput');

    // Configuration de marked.js (pour éviter des bugs HTML)
    // On dit juste de convertir les retours à la ligne en <br>
    marked.setOptions({ breaks: true });

    // Gestion Trombone
    attachBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
        if (imageInput.files.length > 0) attachBtn.classList.add('has-file');
        else attachBtn.classList.remove('has-file');
    });

    // Envoi
    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    async function sendMessage() {
        const text = userInput.value.trim();
        const file = imageInput.files[0];

        if (!text && !file) return;

        // --- 1. Affichage User (Image + Texte) ---
        const userDiv = document.createElement('div');
        userDiv.className = 'message user-message';

        // A. Si image, on l'affiche en vrai
        if (file) {
            const imgPreview = document.createElement('img');
            imgPreview.src = URL.createObjectURL(file); // Magie du navigateur
            imgPreview.className = 'chat-image';
            imgPreview.onload = () => URL.revokeObjectURL(imgPreview.src); // Nettoyage mémoire
            userDiv.appendChild(imgPreview);
        }

        // B. Ajout du texte
        if (text) {
            const textSpan = document.createElement('span');
            textSpan.innerText = text;
            userDiv.appendChild(textSpan);
        }

        chatBox.appendChild(userDiv);
        scrollToBottom();

        // Reset champs
        userInput.value = '';
        imageInput.value = ''; // Important: on vide l'input file pour ne pas renvoyer la même image après
        attachBtn.classList.remove('has-file');

        // --- 2. Animations d'Attente ---
        
        // A. Bouton qui saute
        sendBtn.disabled = true;
        // On injecte les 3 spans pour l'animation CSS
        sendBtn.innerHTML = '<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';

        // B. Message "L'IA réfléchit..." au milieu
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-message';
        thinkingDiv.innerText = "✨ L'IA réfléchit...";
        chatBox.appendChild(thinkingDiv);
        scrollToBottom();

        try {
            // --- 3. Envoi au Backend ---
            const formData = new FormData();
            formData.append('question', text);
            if (file) formData.append('file', file);

            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Erreur serveur");
            
            const rawMarkdown = await response.text();

            // --- 4. Traitement de la Réponse ---
            
            // A. On retire le message "Réfléchit"
            thinkingDiv.remove();

            // B. On convertit le Markdown en HTML (Gras, Code...)
            const htmlContent = marked.parse(rawMarkdown);

            // C. On affiche le résultat propre
            const aiDiv = document.createElement('div');
            aiDiv.className = 'message ai-message';
            aiDiv.innerHTML = htmlContent; // On injecte le HTML généré
            chatBox.appendChild(aiDiv);

        } catch (error) {
            thinkingDiv.remove(); // On retire le loading même en cas d'erreur
            addMessage("❌ Oups : " + error.message, 'ai-message');
        } finally {
            // Reset Bouton
            sendBtn.disabled = false;
            sendBtn.innerText = 'Envoyer';
            userInput.focus();
            scrollToBottom();
        }
    }

    // Petite fonction pour éviter de répéter le code
    function addMessage(htmlContent, className) {
        const div = document.createElement('div');
        div.className = `message ${className}`;
        div.innerHTML = htmlContent;
        chatBox.appendChild(div);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});