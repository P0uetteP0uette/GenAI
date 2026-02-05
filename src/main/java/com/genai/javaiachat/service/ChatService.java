package com.genai.javaiachat.service;

import dev.langchain4j.model.chat.ChatModel;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    // On utilise le nouveau nom de la classe
    private final ChatModel chatModel;

    // Le constructeur change aussi
    public ChatService(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    public String generateResponse(String question) {
        // La méthode .generate() reste la même
        return chatModel.chat(question);
    }
}