package com.genai.javaiachat.service;

import org.springframework.stereotype.Service;

@Service // Marks this class as a service component in Spring
public class ChatService {
    
    public String generateResponse(String question){
        return "LOGIQUE METIER (Service) : J'ai analysé ta question '" + question + "' et tout va bien.";
    }
}
