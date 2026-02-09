package com.genai.javaiachat.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.genai.javaiachat.service.ChatService;
import java.io.IOException;
import java.util.List; // Import List

@RestController
@RequestMapping("/api")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService){
        this.chatService = chatService;
    }

    @PostMapping("/chat")
    public String chat(
            @RequestParam("question") String question,
            // On change "file" (singulier) en "files" (pluriel) et List<MultipartFile>
            @RequestParam(value = "files", required = false) List<MultipartFile> files
    ) throws IOException {

        // Si la liste existe et n'est pas vide
        if (files != null && !files.isEmpty()) {
            return chatService.generateResponseWithFiles(question, files);
        }

        return chatService.generateResponse(question);
    }
}