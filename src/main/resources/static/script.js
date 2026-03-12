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
                addMessageToUI(msg.content, msg.sender === 'USER' ? 'user-message' : 'ai-message', msg.imageBase64);
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
        }
    });

    attachBtn.onclick = () => { fileInput.value = ''; fileInput.click(); };
    fileInput.onchange = () => {
        if (fileInput.files.length > 0) {
            for (let f of fileInput.files) fileStorage.items.add(f);
            updateFileCount();
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
        const files = fileStorage.files;

        if (!text && files.length === 0) return;

        // 1. SI C'EST UNE NOUVELLE CONV (ID est nul)
        if (currentConversationId === null) {
            const res = await fetch('/api/conversations', { method: 'POST' });
            const newConv = await res.json();
            currentConversationId = newConv.id;
            chatBox.innerHTML = '';
        }

        // 2. AFFICHAGE DU MESSAGE UTILISATEUR
        // Petite astuce : si on n'a mis que des fichiers sans texte, on affiche "[Pièce jointe]" dans la bulle
        const displayMessage = text || "📎 [Pièce jointe]";
        addMessageToUI(displayMessage, 'user-message');

        // 3. PRÉPARATION DES DONNÉES (On copie les fichiers avant de les supprimer de l'UI)
        const formData = new FormData();
        formData.append('question', text || "");
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        // 4. ✨ LA MAGIE UX : RESET IMMÉDIAT DE L'INTERFACE ✨
        userInput.value = '';
        fileStorage.items.clear();              // On vide la mémoire des fichiers
        attachBtn.classList.remove('has-file'); // Le trombone redevient normal (gris)
        sendBtn.innerText = '...';              // Le bouton affiche "..."
        sendBtn.disabled = true;                // On bloque le bouton pour éviter les clics multiples
        userInput.disabled = true;              // On grise la zone de texte

        try {
            // 5. ENVOI AU SERVEUR (On attend la réponse ici)
            const response = await fetch(`/api/chat/${currentConversationId}`, { 
                method: 'POST', 
                body: formData 
            });
            const aiResponse = await response.text();
            
            // 6. AFFICHAGE RÉPONSE IA
            addMessageToUI(aiResponse, 'ai-message');
            refreshSidebar();
            
        } catch (e) {
            console.error(e);
            addMessageToUI("Désolé, une erreur de connexion est survenue.", 'ai-message');
        } finally {
            // 7. RESTAURATION DE L'INTERFACE (Quoi qu'il arrive, succès ou erreur)
            sendBtn.innerText = 'Envoyer';
            sendBtn.disabled = false;
            userInput.disabled = false;
            userInput.focus(); // On remet le curseur prêt à taper
            updateFileCount(); // Sécurité pour s'assurer que tout est bien synchronisé
        }
    }

    function addMessageToUI(content, className, imageBase64 = null) {
        const div = document.createElement('div');
        div.className = `message ${className}`;
        
        if (imageBase64) {
            const img = document.createElement('img');
            // Gère si c'est une URL temporaire (blob) ou du Base64 BDD
            img.src = imageBase64.startsWith('blob:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
            img.className = 'chat-image';
            div.appendChild(img);
        }

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
});