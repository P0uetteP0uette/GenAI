document.addEventListener("DOMContentLoaded", function() {
    
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const imageInput = document.getElementById('imageInput');
    const inputArea = document.querySelector('.input-area'); // Zone visuelle

    marked.setOptions({ breaks: true });

    // --- 1. GESTION DU DRAG & DROP (SUR TOUTE LA PAGE) ---
    
    let dragCounter = 0; // Astuce pour éviter le clignotement

    // On écoute sur 'document' (toute la page) et plus seulement 'inputArea'
    const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
    
    dragEvents.forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Quand on ENTRE dans la fenêtre avec un fichier
    document.addEventListener('dragenter', (e) => {
        dragCounter++;
        inputArea.classList.add('drag-active'); // On allume la zone du bas
    });

    // Quand on QUITTE un élément (ou la fenêtre)
    document.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter === 0) {
            inputArea.classList.remove('drag-active'); // On éteint si on sort vraiment
        }
    });

    // Quand on LÂCHE le fichier n'importe où
    document.addEventListener('drop', (e) => {
        dragCounter = 0;
        inputArea.classList.remove('drag-active');

        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            imageInput.files = files; // On donne les fichiers à l'input caché
            handleFiles(); // On lance la prévisualisation
        }
    });


    // --- 2. GESTION TROMBONE CLASSIQUE ---
    attachBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleFiles);

    // --- 3. FONCTION DE PRÉVISUALISATION ---
    function handleFiles() {
        const files = imageInput.files;
        const count = files.length;

        if (count > 0) {
            attachBtn.classList.add('has-file');
            attachBtn.title = count + " image(s) sélectionnée(s)";
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
        const files = imageInput.files;

        if (!text && files.length === 0) return;

        // Création bulle User
        const userDiv = document.createElement('div');
        userDiv.className = 'message user-message';

        // Affichage Galerie
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

        // Affichage Texte
        if (text) {
            const textSpan = document.createElement('span');
            textSpan.innerText = text;
            userDiv.appendChild(textSpan);
        }

        chatBox.appendChild(userDiv);
        scrollToBottom();

        // Reset inputs
        userInput.value = '';
        
        // Loading UI
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
            
            // On envoie le texte (même vide, pour éviter l'erreur Java)
            if (text) {
                formData.append('question', text);
            } else {
                // Astuce : Si pas de texte, on envoie un espace vide ou rien
                // Ton code Java a le "if" de sécurité maintenant, donc ça ira
                formData.append('question', ""); 
            }
            
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

            // Nettoyage après succès
            imageInput.value = ''; 
            attachBtn.classList.remove('has-file');
            sendBtn.innerText = 'Envoyer';

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