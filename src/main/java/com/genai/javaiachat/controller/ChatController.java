package com.genai.javaiachat.controller;

import com.genai.javaiachat.model.Conversation;
import com.genai.javaiachat.model.Message;
import com.genai.javaiachat.repository.ConversationRepository;
import com.genai.javaiachat.service.ChatService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatService chatService;
    
    @Autowired
    private ConversationRepository conversationRepository;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    // Créer une nouvelle conversation
    @PostMapping("/conversations")
    public Conversation createConversation() {
        return chatService.createConversation();
    }

    // Supprimer une conversation
    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id) {
        conversationRepository.deleteById(id); // Supprime la conv + tous ses messages d'un coup !
        return ResponseEntity.ok().build();
    }


    // Lister toutes les conversations (pour la barre latérale)
    @GetMapping("/conversations")
    public List<Conversation> getAllConversations() {
        return chatService.getAllConversations();
    }

    // Charger l'historique d'une conversation spécifique
    @GetMapping("/conversations/{id}/messages")
    public List<Message> getMessages(@PathVariable Long id) {
        return chatService.getMessages(id);
    }

    // Envoyer un message dans une conversation spécifique
    @PostMapping("/chat/{conversationId}")
    public String chat(
            @PathVariable Long conversationId,
            @RequestParam(value = "question", required = false) String question,
            @RequestParam(value = "files", required = false) List<MultipartFile> files
    ) throws IOException {
        return chatService.chat(conversationId, question, files);
    }
}