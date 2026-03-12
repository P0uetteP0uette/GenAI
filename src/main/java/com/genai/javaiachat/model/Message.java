package com.genai.javaiachat.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;

@Entity
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Lob // Permet de stocker de longs textes
    @Column(columnDefinition = "CLOB")
    private String content;

    private String sender; // "user" ou "ia"

    @Column(length = 1000)
    private String attachedFiles;

    @Lob
    @Column(columnDefinition = "CLOB")
    private String imageBase64;

    @SuppressWarnings("unused")
    private LocalDateTime timestamp = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    public Message() {}
    public Message(String content, String sender, Conversation conversation){
        this.content = content;
        this.sender = sender;
        this.conversation = conversation;
    }
    
    public String getContent() { return content; }
    public String getSender() { return sender; }
    public String getImageBase64() { return imageBase64; }
    public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }
    public String getAttachedFiles() { return attachedFiles; }
    public void setAttachedFiles(String attachedFiles) { this.attachedFiles = attachedFiles; }
}
