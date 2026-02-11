document.addEventListener("DOMContentLoaded", function() {
    
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const imageInput = document.getElementById('imageInput');

    marked.setOptions({ breaks: true });

    // Gestion Trombone
    attachBtn.addEventListener('click', () => imageInput.click());
    
    // Quand on sélectionne des fichiers
    imageInput.addEventListener('change', () => {
        const count = imageInput.files.length;
        if (count > 0) {
            attachBtn.classList.add('has-file');
            // Petit bonus : on affiche le nombre de fichiers au survol
            attachBtn.title = count + " image(s) sélectionnée(s)";
        } else {
            attachBtn.classList.remove('has-file');
            attachBtn.title = "Ajouter une image";
        }
    });

    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    async function sendMessage() {
        const text = userInput.value.trim();
        const files = imageInput.files; // On récupère la LISTE des fichiers

        if (!text && files.length === 0) return;

        // --- Affichage User ---
        const userDiv = document.createElement('div');
        userDiv.className = 'message user-message';

        // A. Afficher TOUTES les images (Galerie)
        if (files.length > 0) {
            const galleryDiv = document.createElement('div');
            galleryDiv.className = 'image-gallery';

            // Boucle sur les fichiers pour les afficher
            Array.from(files).forEach(file => {
                const imgPreview = document.createElement('img');
                imgPreview.src = URL.createObjectURL(file);
                imgPreview.className = 'chat-image';
                imgPreview.onload = () => URL.revokeObjectURL(imgPreview.src);
                galleryDiv.appendChild(imgPreview);
            });
            userDiv.appendChild(galleryDiv);
        }

        // B. Texte
        if (text) {
            const textSpan = document.createElement('span');
            textSpan.innerText = text;
            userDiv.appendChild(textSpan);
        }

        chatBox.appendChild(userDiv);
        scrollToBottom();

        // Reset
        userInput.value = '';
        // Note : On ne vide pas imageInput tout de suite, on en a besoin pour le FormData
        
        // --- Loading ---
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';

        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-message';
        thinkingDiv.innerText = "✨ L'IA réfléchit...";
        chatBox.appendChild(thinkingDiv);
        scrollToBottom();

        try {
            const formData = new FormData();
            formData.append('question', text);
            
            // C. Boucle pour ajouter TOUS les fichiers au FormData
            // Attention : le nom doit être 'files' (comme dans le Controller Java)
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            const response = await fetch('/api/chat', { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Erreur serveur");
            
            const rawMarkdown = await response.text();

            // --- Fin ---
            thinkingDiv.remove();
            const htmlContent = marked.parse(rawMarkdown);
            const aiDiv = document.createElement('div');
            aiDiv.className = 'message ai-message';
            aiDiv.innerHTML = htmlContent;
            addCopyButtons(aiDiv);
            chatBox.appendChild(aiDiv);

            // Nettoyage final
            imageInput.value = ''; 
            attachBtn.classList.remove('has-file');
            attachBtn.title = "Ajouter une image";

        } catch (error) {
            thinkingDiv.remove();
            addMessage("❌ Oups : " + error.message, 'ai-message');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerText = 'Envoyer';
            userInput.focus();
            scrollToBottom();
        }
    }

    // ... (Garde tes fonctions addCopyButtons, addMessage, scrollToBottom comme avant) ...
    // Je les remets ici pour être sûr que tu ne les perdes pas
    
    function addCopyButtons(container) {
        const preBlocks = container.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            const button = document.createElement('button');
            button.className = 'copy-btn';
            button.innerText = 'Copier';
            button.addEventListener('click', () => {
                const code = pre.querySelector('code').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    button.innerText = 'Copié !';
                    button.classList.add('success');
                    setTimeout(() => {
                        button.innerText = 'Copier';
                        button.classList.remove('success');
                    }, 2000);
                });
            });
            pre.appendChild(button);
        });
    }

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