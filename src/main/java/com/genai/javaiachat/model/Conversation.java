package com.genai.javaiachat.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List; // N'oublie pas l'import !
import java.util.ArrayList;

@Entity
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    
    @SuppressWarnings("unused")
    private LocalDateTime createdAt = LocalDateTime.now();

    // AJOUTE CECI : Le lien vers les messages
    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Message> messages = new ArrayList<>();

    // Constructeur vide (Indispensable pour JPA)
    public Conversation() {}

    // Getters et Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
}