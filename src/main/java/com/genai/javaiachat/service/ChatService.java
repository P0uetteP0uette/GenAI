package com.genai.javaiachat.service;

import com.genai.javaiachat.model.Conversation;
import com.genai.javaiachat.model.Message;
import com.genai.javaiachat.repository.ConversationRepository;
import com.genai.javaiachat.repository.MessageRepository;
import dev.langchain4j.data.message.*;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class ChatService {

    private final ChatModel chatModel;
    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;

    public ChatService(ChatModel chatModel, ConversationRepository conversationRepo, MessageRepository messageRepo) {
        this.chatModel = chatModel;
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
    }

    // Créer une nouvelle conversation
    public Conversation createConversation() {
        Conversation conv = new Conversation();
        conv.setTitle("Nouvelle conversation " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
        return conversationRepo.save(conv);
    }

    // Récupérer toutes les convs
    public List<Conversation> getAllConversations() {
        return conversationRepo.findAllByOrderByIdDesc();
    }

    // Récupérer les messages d'une conv
    public List<Message> getMessages(Long conversationId) {
        return messageRepo.findByConversationId(conversationId);
    }

    public String chat(Long conversationId, String userText, List<MultipartFile> files) throws IOException {
        
        Conversation conv = conversationRepo.findById(conversationId).orElseThrow();

        List<Content> contents = new ArrayList<>();
        Message userDbMsg = new Message(userText, "USER", conv);
        
        if (userText != null && !userText.isBlank()) {
            contents.add(TextContent.from(userText));
        }

        // --- 1. GESTION DES FICHIERS (SANS FAIRE CRASHER GEMINI) ---
        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                String mimeType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

                if (mimeType.startsWith("image/")) {
                    // Les images passent très bien
                    String base64 = Base64.getEncoder().encodeToString(file.getBytes());
                    contents.add(ImageContent.from(base64, mimeType));
                    if (userDbMsg.getImageBase64() == null) userDbMsg.setImageBase64(base64);
                } 
                else if (mimeType.startsWith("text/") || mimeType.endsWith("json") || mimeType.endsWith("csv") || mimeType.endsWith("javascript")) {
                    // Les fichiers textes, CSV, codes : on lit le texte et on l'injecte direct !
                    String fileContent = new String(file.getBytes(), StandardCharsets.UTF_8);
                    contents.add(TextContent.from("\n[Contenu du fichier " + file.getOriginalFilename() + "] :\n" + fileContent));
                }
                else {
                    // Les PDF / Word : On prévient l'IA qu'un fichier est là, sans faire crasher l'API
                    contents.add(TextContent.from("\n[L'utilisateur a joint un fichier non lisible nativement : " + file.getOriginalFilename() + "]"));
                }
            }
        }
        
        messageRepo.save(userDbMsg);

        // --- 2. RECONSTITUTION DE L'HISTORIQUE ---
        List<Message> dbHistory = messageRepo.findByConversationId(conversationId);
        List<ChatMessage> geminiHistory = new ArrayList<>();
        
        for (Message m : dbHistory) {
            if ("USER".equals(m.getSender())) {
                String text = m.getContent();
                if (text == null || text.trim().isEmpty()) text = "[Fichier envoyé]"; 
                else if (m.getImageBase64() != null) text += " [Image envoyée]";
                
                geminiHistory.add(UserMessage.from(text));
            } else {
                String aiText = m.getContent();
                if (aiText == null || aiText.trim().isEmpty()) aiText = "..."; 
                geminiHistory.add(AiMessage.from(aiText));
            }
        }
        
        // Sécurité pour le message actuel
        if (contents.isEmpty()) {
            contents.add(TextContent.from("[Pièce jointe envoyée]"));
        }
        geminiHistory.add(UserMessage.from(contents));

        // Appel Gemini
        ChatResponse response = chatModel.chat(geminiHistory);
        String aiResponseText = response.aiMessage().text();

        // Sauvegarde IA
        Message aiDbMsg = new Message(aiResponseText, "AI", conv);
        messageRepo.save(aiDbMsg);

        // --- 3. MISE À JOUR DU TITRE (CORRIGÉE) ---
        // On met à jour le titre seulement s'il y a 1 seul message dans l'historique (le tout premier)
        if (dbHistory.size() <= 1) {
            // Si l'utilisateur n'a rien tapé, on appelle la discussion "Fichier envoyé"
            String baseTitle = (userText != null && !userText.trim().isEmpty()) ? userText : "Fichier envoyé";
            String shortTitle = baseTitle.length() > 25 ? baseTitle.substring(0, 25) + "..." : baseTitle;
            conv.setTitle(shortTitle);
            conversationRepo.save(conv);
        }

        return aiResponseText;
    }
}