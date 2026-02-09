package com.genai.javaiachat.service;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.Content;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class ChatService {

    private final ChatModel chatModel;
    
    // NOTRE MÉMOIRE MAISON 🏠
    // Une simple liste Java qui contient toute la conversation
    private final List<ChatMessage> conversationHistory = new ArrayList<>();

    public ChatService(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    // --- Méthode Texte seul ---
    public String generateResponse(String question) {
        // 1. Créer le message utilisateur
        UserMessage userMsg = UserMessage.from(question);
        
        // 2. Ajouter à l'historique et nettoyer si trop vieux
        addToHistory(userMsg);

        // 3. Envoyer TOUTE la liste à l'IA
        ChatResponse response = chatModel.chat(conversationHistory);

        // 4. Ajouter la réponse de l'IA à l'historique
        addToHistory(response.aiMessage());

        return response.aiMessage().text();
    }

    // --- Méthode Texte + Image ---
    public String generateResponseWithFiles(String question, List<MultipartFiles> files) throws IOException {

        // Liste de contenus (texte + images)
        List<Content> contents = new ArrayList<>();

        // Ajout du texte en 1er
        contents.add(TextContent.from(question));
        
        // On boucle sur chaque fichier
        for(MultipartFile file : files){
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            // Ajout de l'image à la liste de contenus
            contents.add(ImageContent.from(base64Image, file.getOriginalFilename()));
        }
    }

    // --- Petite méthode utilitaire pour gérer la mémoire (max 20 messages) ---
    private void addToHistory(ChatMessage message) {
        conversationHistory.add(message);

        // Si on dépasse 20 messages, on supprime le plus vieux (le premier de la liste)
        // On fait attention à garder au moins les derniers échanges
        while (conversationHistory.size() > 20) {
            conversationHistory.remove(0); 
        }
    }
}