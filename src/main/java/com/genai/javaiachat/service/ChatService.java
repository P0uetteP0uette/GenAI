package com.genai.javaiachat.service;

import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.data.message.TextContent;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import java.util.Base64;

import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final ChatModel chatModel;

    public ChatService(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    public String generateResponse(String question) {
        return chatModel.chat(question);
    }

    public String generateResponseWithImage(String question, byte[] imageBytes) {
        
        //Converti l'image en base64
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);
        
        //Crée un message utilisateur avec le texte et l'image
        UserMessage userMessage = UserMessage.from(
            TextContent.from(question),
            ImageContent.from(base64Image, "image/png")
        );

        //Envoie le message à Gemini
        var response = chatModel.chat(userMessage);

        //Retourne la réponse textuelle
        return response.aiMessage().text();
    }
}