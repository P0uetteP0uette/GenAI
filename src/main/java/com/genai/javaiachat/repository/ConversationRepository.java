package com.genai.javaiachat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.genai.javaiachat.model.Conversation;

public interface ConversationRepository extends JpaRepository<Conversation, Long>{
    List<Conversation> findAllByOrderByIdDesc();
}
