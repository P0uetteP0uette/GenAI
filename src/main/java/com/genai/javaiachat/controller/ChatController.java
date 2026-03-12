package com.genai.javaiachat.controller;

import com.genai.javaiachat.model.Conversation;
import com.genai.javaiachat.model.Message;
import com.genai.javaiachat.repository.ConversationRepository;
import com.genai.javaiachat.service.ChatService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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

    // Envoyer un message dans une conversation spécifique (AVEC GESTION DES ERREURS)
    @PostMapping("/chat/{conversationId}")
    public ResponseEntity<String> chat(
            @PathVariable Long conversationId,
            @RequestParam(value = "question", required = false) String question,
            @RequestParam(value = "files", required = false) List<MultipartFile> files
    ) {
        try {
            // On essaie d'envoyer le message à l'IA
            String aiResponse = chatService.chat(conversationId, question, files);
            return ResponseEntity.ok(aiResponse);

        } catch (Exception e) {
            // Si ça plante, on regarde quel est le type d'erreur
            String errorMessage = e.getMessage();
            
            // On vérifie si c'est la fameuse erreur de quota (429 ou RateLimitException)
            if (errorMessage != null && (errorMessage.contains("429") || errorMessage.contains("exceeded") || errorMessage.contains("RateLimitException"))) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                        .body("Désolé, j'ai reçu trop de messages d'un coup (limite de l'API gratuite atteinte). Attends environ une minute et réessaie ! ⏳");
            }
            
            // Pour toutes les autres erreurs imprévues
            e.printStackTrace(); // On l'affiche quand même dans la console pour toi, le développeur
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Oups, une erreur interne est survenue lors de l'envoi de ton message. 😕");
        }
    }
}