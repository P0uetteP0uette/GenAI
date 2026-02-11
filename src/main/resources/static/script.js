document.addEventListener("DOMContentLoaded", function() {
    
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const imageInput = document.getElementById('imageInput');
    const inputArea = document.querySelector('.input-area');

    // --- LE COFFRE-FORT (Pour stocker les images en sécurité) ---
    // C'est lui qui garde les images, même si l'input est réinitialisé par la fenêtre
    const fileStorage = new DataTransfer(); 

    marked.setOptions({ breaks: true });

    // --- 1. GESTION DU DRAG & DROP (SUR TOUTE LA PAGE) ---
    let dragCounter = 0;
    const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
    
    dragEvents.forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    document.addEventListener('dragenter', (e) => {
        dragCounter++;
        inputArea.classList.add('drag-active');
    });

    document.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter === 0) {
            inputArea.classList.remove('drag-active');
        }
    });

    // LE DROP (La partie importante)
    document.addEventListener('drop', (e) => {
        dragCounter = 0;
        inputArea.classList.remove('drag-active');

        const dt = e.dataTransfer;
        const droppedFiles = dt.files;

        if (droppedFiles.length > 0) {
            // On ajoute les fichiers droppés dans notre coffre-fort
            for (let i = 0; i < droppedFiles.length; i++) {
                fileStorage.items.add(droppedFiles[i]);
            }
            // On met à jour l'affichage
            updateFileCount();
        }
    });

    // --- 2. GESTION TROMBONE (CLIC) ---
    attachBtn.addEventListener('click', () => {
        // Astuce : on remet l'input à zéro avant d'ouvrir pour permettre de resélectionner le même fichier
        imageInput.value = ''; 
        imageInput.click();
    });

    imageInput.addEventListener('change', () => {
        // Quand l'utilisateur a choisi via l'explorateur
        const selectedFiles = imageInput.files;
        if (selectedFiles.length > 0) {
            // On ajoute dans le coffre-fort
            for (let i = 0; i < selectedFiles.length; i++) {
                fileStorage.items.add(selectedFiles[i]);
            }
            updateFileCount();
        }
    });

    // --- 3. FONCTION D'AFFICHAGE (Basée sur le coffre-fort) ---
    function updateFileCount() {
        // On compte ce qu'il y a dans le coffre, pas dans l'input
        const count = fileStorage.files.length;

        if (count > 0) {
            attachBtn.classList.add('has-file');
            attachBtn.title = count + " image(s) prête(s) à l'envoi";
            sendBtn.innerText = `Envoyer (${count} img)`;
        } else {
            attachBtn.classList.remove('has-file');
            attachBtn.title = "Ajouter une image";
            sendBtn.innerText = 'Envoyer';
        }
    }

    // --- 4. ENVOI DU MESSAGE ---
    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    async function sendMessage() {
        const text = userInput.value.trim();
        // On récupère les fichiers depuis le coffre-fort !
        const files = fileStorage.files; 

        if (!text && files.length === 0) return;

        // UI : Message User
        const userDiv = document.createElement('div');
        userDiv.className = 'message user-message';

        // UI : Galerie Images
        if (files.length > 0) {
            const galleryDiv = document.createElement('div');
            galleryDiv.className = 'image-gallery';

            Array.from(files).forEach(file => {
                const imgPreview = document.createElement('img');
                imgPreview.src = URL.createObjectURL(file);
                imgPreview.className = 'chat-image';
                imgPreview.onload = () => URL.revokeObjectURL(imgPreview.src);
                galleryDiv.appendChild(imgPreview);
            });
            userDiv.appendChild(galleryDiv);
        }

        // UI : Texte
        if (text) {
            const textSpan = document.createElement('span');
            textSpan.innerText = text;
            userDiv.appendChild(textSpan);
        }

        chatBox.appendChild(userDiv);
        scrollToBottom();

        // Reset immédiat
        userInput.value = '';
        
        // UI : Loading
        const originalBtnText = sendBtn.innerText;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'thinking-message';
        thinkingDiv.innerText = "✨ L'IA réfléchit...";
        chatBox.appendChild(thinkingDiv);
        scrollToBottom();

        try {
            const formData = new FormData();
            
            if (text) formData.append('question', text);
            else formData.append('question', ""); 
            
            // On ajoute les fichiers du coffre-fort au formulaire
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            const response = await fetch('/api/chat', { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Erreur serveur");
            
            const rawMarkdown = await response.text();

            thinkingDiv.remove();
            const htmlContent = marked.parse(rawMarkdown);
            const aiDiv = document.createElement('div');
            aiDiv.className = 'message ai-message';
            aiDiv.innerHTML = htmlContent;
            addCopyButtons(aiDiv);
            chatBox.appendChild(aiDiv);

            // NETTOYAGE COMPLET APRÈS ENVOI
            fileStorage.items.clear(); // On vide le coffre
            updateFileCount(); // On remet le bouton à zéro

        } catch (error) {
            thinkingDiv.remove();
            addMessage("❌ Oups : " + error.message, 'ai-message');
            sendBtn.innerText = originalBtnText;
        } finally {
            sendBtn.disabled = false;
            if(sendBtn.innerText === '...') sendBtn.innerText = 'Envoyer';
            userInput.focus();
            scrollToBottom();
        }
    }

    // ... (Garde tes fonctions addCopyButtons, addMessage, scrollToBottom comme avant) ...
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