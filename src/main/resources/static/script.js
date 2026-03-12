document.addEventListener("DOMContentLoaded", function() {
    
    const chatBox = document.getElementById('chatBox');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const inputArea = document.querySelector('.input-area');
    const convList = document.getElementById('convList');
    const newChatBtn = document.getElementById('newChatBtn');

    let currentConversationId = null;
    const fileStorage = new DataTransfer(); // Stocke les fichiers accumulés

    marked.setOptions({ breaks: true });

    // --- 1. INITIALISATION ---
    init();

    async function init() {
        const res = await fetch('/api/conversations');
        const convs = await res.json();
        
        if (convs.length === 0) {
            await createNewChat();
        } else {
            // Au chargement, on prend la plus récente (la dernière de la liste)
            selectConversation(convs[convs.length - 1].id);
        }
    }

    // --- 2. GESTION DES CONVERSATIONS (SIDEBAR) ---

    // --- CLIC SUR NOUVELLE DISCUSSION ---
    function createNewChat() {
        currentConversationId = null; // On "oublie" l'ID actuel
        chatBox.innerHTML = '';      // On vide le chat
        showWelcome();               // On affiche le titre stylé
        
        // On déselectionne les éléments de la sidebar
        document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    }

    async function selectConversation(id) {
        currentConversationId = id;
        refreshSidebar();
        
        const res = await fetch(`/api/conversations/${id}/messages`);
        const messages = await res.json();
        
        chatBox.innerHTML = '';
        
        if (messages.length === 0) {
            showWelcome(); // Si vide, on met le titre
        } else {
            messages.forEach(msg => {
                addMessageToUI(msg.content, msg.sender === 'USER' ? 'user-message' : 'ai-message', msg.imageBase64, [], msg.attachedFiles);
            });
        }
        scrollToBottom();
    }

    newChatBtn.onclick = createNewChat;

    // --- 3. GESTION DU DRAG & DROP & TROMBONE ---
    // (On garde ta logique robuste du message précédent)
    
    let dragCounter = 0;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
        document.addEventListener(e, (evt) => { evt.preventDefault(); evt.stopPropagation(); });
    });

    document.addEventListener('dragenter', () => { dragCounter++; inputArea.classList.add('drag-active'); });
    document.addEventListener('dragleave', () => { dragCounter--; if (dragCounter === 0) inputArea.classList.remove('drag-active'); });

    document.addEventListener('drop', (e) => {
        dragCounter = 0;
        inputArea.classList.remove('drag-active');
        const dt = e.dataTransfer;
        if (dt.files.length > 0) {
            for (let f of dt.files) fileStorage.items.add(f);
            updateFileCount();
            renderFilePreviews();
        }
    });

    attachBtn.onclick = () => { fileInput.value = ''; fileInput.click(); };
    fileInput.onchange = () => {
        if (fileInput.files.length > 0) {
            for (let f of fileInput.files) fileStorage.items.add(f);
            updateFileCount();
            renderFilePreviews();
        }
    };

    function updateFileCount() {
        const count = fileStorage.files.length;
        attachBtn.classList.toggle('has-file', count > 0);
        sendBtn.innerText = count > 0 ? `Envoyer (${count} doc)` : 'Envoyer';
    }

    // --- 4. ENVOI DU MESSAGE ---

    sendBtn.onclick = sendMessage;
    userInput.onkeydown = (e) => { if (e.key === "Enter") sendMessage(); };

    // --- FONCTION POUR RAFRAÎCHIR LA BARRE LATÉRALE ---
    async function refreshSidebar() {
        try {
            const res = await fetch('/api/conversations');
            const convs = await res.json();
            
            const convList = document.getElementById('convList');
            convList.innerHTML = ''; // On vide la liste actuelle
            
            convs.forEach(conv => {
                const item = document.createElement('div');
                item.className = `conv-item ${conv.id === currentConversationId ? 'active' : ''}`;
                
                // 1. On crée un span pour le titre
                const titleSpan = document.createElement('span');
                titleSpan.className = 'conv-title';
                titleSpan.innerText = conv.title || "Nouvelle discussion";
                titleSpan.onclick = () => selectConversation(conv.id);
                
                // 2. On crée le bouton poubelle
                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.innerHTML = '🗑️'; 
                delBtn.onclick = (e) => {
                    e.stopPropagation(); // Empêche de sélectionner la conv
                    confirmDelete(conv.id);
                };

                // 3. On ajoute le titre et la poubelle dans l'item
                item.appendChild(titleSpan);
                item.appendChild(delBtn);
                
                // 4. On ajoute l'item à la liste
                convList.appendChild(item);
            });
        } catch (error) {
            console.error("Erreur lors du rafraîchissement de la sidebar:", error);
        }
    }

    // --- ENVOI DE MESSAGE ---
    async function sendMessage() {
        const text = userInput.value.trim();
        const filesArray = Array.from(fileStorage.files); // On copie les fichiers dans un tableau

        if (!text && filesArray.length === 0) return;

        if (currentConversationId === null) {
            const res = await fetch('/api/conversations', { method: 'POST' });
            const newConv = await res.json();
            currentConversationId = newConv.id;
            chatBox.innerHTML = '';
        }

        // ✨ MODIFICATION ICI : On passe les fichiers à la fonction d'affichage
        addMessageToUI(text, 'user-message', null, filesArray);

        const formData = new FormData();
        formData.append('question', text || "");
        for (let i = 0; i < filesArray.length; i++) {
            formData.append('files', filesArray[i]);
        }

        // Reset immédiat de l'interface
        userInput.value = '';
        fileStorage.items.clear();              
        attachBtn.classList.remove('has-file'); 
        sendBtn.innerText = '...';              
        sendBtn.disabled = true;                
        userInput.disabled = true;              
        renderFilePreviews(); // Cache la prévisualisation au-dessus de la barre

        try {
            const response = await fetch(`/api/chat/${currentConversationId}`, { 
                method: 'POST', 
                body: formData 
            });
            const aiResponse = await response.text();
            
            addMessageToUI(aiResponse, 'ai-message');
            refreshSidebar();
            
        } catch (e) {
            console.error(e);
            addMessageToUI("Désolé, une erreur de connexion est survenue.", 'ai-message');
        } finally {
            sendBtn.innerText = 'Envoyer';
            sendBtn.disabled = false;
            userInput.disabled = false;
            userInput.focus();
            updateFileCount();
        }
    }

    // --- AFFICHAGE DES MESSAGES DANS LE CHAT ---
    // ✨ MODIFICATION ICI : Ajout du paramètre "files"
    function addMessageToUI(content, className, imageBase64 = null, files = [], savedFileNames = null) {
        const div = document.createElement('div');
        div.className = `message ${className}`;
        
        // 1. Si on charge l'historique et qu'il y a une image en Base64 dans la BDD
        if (imageBase64) {
            const imgGallery = document.createElement('div');
            imgGallery.className = 'image-gallery';
            const img = document.createElement('img');
            img.src = imageBase64.startsWith('blob:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
            img.className = 'chat-image';
            imgGallery.appendChild(img);
            div.appendChild(imgGallery);
        }

        // 2. Si on vient d'envoyer des fichiers en direct
        if (files && files.length > 0) {
            // On crée DEUX conteneurs séparés
            const imgGallery = document.createElement('div');
            imgGallery.className = 'image-gallery'; 
            
            const fileGallery = document.createElement('div');
            fileGallery.className = 'attachment-gallery';

            files.forEach(file => {
                if (file.type.startsWith('image/')) {
                    // Les images vont dans la galerie d'images
                    const img = document.createElement('img');
                    img.className = 'chat-image';
                    img.src = URL.createObjectURL(file);
                    imgGallery.appendChild(img);
                } else {
                    // Les documents vont dans la galerie de fichiers
                    const fileDiv = document.createElement('div');
                    fileDiv.className = 'chat-file-attachment';
                    fileDiv.innerHTML = `<span class="chat-file-icon">📄</span> ${file.name}`;
                    fileGallery.appendChild(fileDiv);
                }
            });

            // On ajoute les galeries à la bulle de chat seulement si elles ne sont pas vides
            if (imgGallery.children.length > 0) div.appendChild(imgGallery);
            if (fileGallery.children.length > 0) div.appendChild(fileGallery);
        }

        // ✨ NOUVEAU : 2.5 L'affichage quand on recharge l'historique depuis la BDD !
        if (savedFileNames) {
            const fileGallery = document.createElement('div');
            fileGallery.className = 'attachment-gallery';
            
            // On découpe les noms (séparés par des virgules) et on crée les boîtes
            const namesArray = savedFileNames.split(',');
            namesArray.forEach(name => {
                if (name.trim()) {
                    const fileDiv = document.createElement('div');
                    fileDiv.className = 'chat-file-attachment';
                    fileDiv.innerHTML = `<span class="chat-file-icon">📄</span> ${name.trim()}`;
                    fileGallery.appendChild(fileDiv);
                }
            });
            div.appendChild(fileGallery);
        }

        // 3. On ajoute le texte en dessous (s'il y en a un)
        if (content) {
            const span = document.createElement('span');
            span.innerHTML = className === 'ai-message' ? marked.parse(content) : content;
            div.appendChild(span);
        }

        chatBox.appendChild(div);
        scrollToBottom();
    }

    function scrollToBottom() { chatBox.scrollTop = chatBox.scrollHeight; }

    // --- FONCTION POUR L'ACCUEIL ---
    function showWelcome() {
        chatBox.innerHTML = `
            <div class="welcome-header" id="welcomeMsg">
                <div class="bot-icon">✨</div>
                <h2>Comment puis-je t'aider aujourd'hui ?</h2>
                <p>Pose-moi une question ou importe une image pour commencer.</p>
            </div>
        `;
    }

    // --- LOGIQUE DE SUPPRESSION AVEC POP-UP ---
    async function confirmDelete(id) {
        const confirmation = confirm("Es-tu sûr de vouloir supprimer cette discussion ?");
        
        if (confirmation) {
            try {
                const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
                
                if (res.ok) {
                    // Si on a supprimé la conv sur laquelle on était
                    if (currentConversationId === id) {
                        createNewChat(); // On reset l'écran
                    }
                    refreshSidebar(); // On met à jour la liste
                }
            } catch (e) {
                console.error("Erreur suppression:", e);
            }
        }
    }

    // --- FONCTION D'AFFICHAGE DES PIÈCES JOINTES ---
    function renderFilePreviews() {
        const previewContainer = document.getElementById('filePreviewContainer');
        previewContainer.innerHTML = ''; // On vide pour tout redessiner
        
        const files = fileStorage.files;
        
        // Si aucun fichier, on cache la zone
        if (files.length === 0) {
            previewContainer.style.display = 'none';
            return;
        }
        
        // Sinon on l'affiche
        previewContainer.style.display = 'flex';
        
        // On crée une miniature pour chaque fichier
        Array.from(files).forEach((file, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'preview-item';
            
            if (file.type.startsWith('image/')) {
                // Si c'est une image, on affiche la photo
                const img = document.createElement('img');
                img.className = 'preview-img';
                img.src = URL.createObjectURL(file);
                itemDiv.appendChild(img);
            } else {
                // Si c'est un doc/pdf, on affiche une icône et le nom
                const fileDiv = document.createElement('div');
                fileDiv.className = 'preview-file';
                fileDiv.innerHTML = `
                    <div class="preview-file-icon">📄</div>
                    <div class="preview-file-name" title="${file.name}">${file.name}</div>
                `;
                itemDiv.appendChild(fileDiv);
            }
            
            // La croix rouge pour supprimer CE fichier précis
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => {
                fileStorage.items.remove(index); // On le retire du stockage
                updateFileCount();               // On met à jour le bouton "Envoyer"
                renderFilePreviews();            // On redessine les miniatures
            };
            
            itemDiv.appendChild(removeBtn);
            previewContainer.appendChild(itemDiv);
        });
    }
});