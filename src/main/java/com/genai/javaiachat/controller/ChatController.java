package com.genai.javaiachat.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.genai.javaiachat.service.ChatService;

@RestController // Marks this class as a REST controller
@RequestMapping("/api") // Base URL for all endpoints in this controller
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService){
        this.chatService = chatService;
    }

    @GetMapping("/bonjour") // Maps GET requests to /api/bonjour
    public String sayHello(){
        return "Bonjour, bienvenue dans JavaIA Chat!";
    }

    // On utilise @RequestParam pour récupérer un paramètre dans l'URL
    // URL à tester : http://localhost:8080/api/chat?question=Bonjour
    @GetMapping("/chat") // Maps GET requests to /api/chat
    public String chat(@RequestParam String question){
        return chatService.generateResponse(question);
    }
}
