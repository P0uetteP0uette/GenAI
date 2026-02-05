package com.genai.javaiachat.controller;

import org.springframework.web.bind.annotation.*; // Pour @PostMapping, @RestController, etc.
import org.springframework.web.multipart.MultipartFile;
import com.genai.javaiachat.service.ChatService;
import java.io.IOException;

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService){
        this.chatService = chatService;
    }

    // IMPERATIF : Cela doit être PostMapping, et pas GetMapping
    @PostMapping("/chat") 
    public String chat(
            @RequestParam("question") String question,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) throws IOException {

        if (file != null && !file.isEmpty()) {
            return chatService.generateResponseWithImage(question, file.getBytes());
        }

        return chatService.generateResponse(question);
    }
}