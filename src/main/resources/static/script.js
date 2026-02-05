const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// Permet d'envoyer avec la touche "Entrée"
userInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") sendMessage();
});

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Afficher le message de l'utilisateur
    addMessage(text, 'user-message');
    userInput.value = '';
    
    // 2. Désactiver le bouton pendant le chargement
    sendBtn.disabled = true;
    sendBtn.innerText = '...';

    try {
        // 3. Appel vers TON BACKEND JAVA
        const response = await fetch('/api/chat?question=' + encodeURIComponent(text));
        
        if (!response.ok) throw new Error("Erreur API");
        
        // 4. Récupérer la réponse texte de Java
        const aiResponse = await response.text();
        
        // 5. Afficher la réponse de l'IA
        addMessage(aiResponse, 'ai-message');

    } catch (error) {
        addMessage("Oups, une erreur est survenue : " + error.message, 'ai-message');
    } finally {
        // 6. Réactiver le bouton
        sendBtn.disabled = false;
        sendBtn.innerText = 'Envoyer';
        userInput.focus(); // Remettre le curseur dans la zone de texte
    }
}

function addMessage(text, className) {
    const div = document.createElement('div');
    div.className = `message ${className}`;
    div.innerText = text;
    chatBox.appendChild(div);
    // Scroll automatique vers le bas
    chatBox.scrollTop = chatBox.scrollHeight;
}