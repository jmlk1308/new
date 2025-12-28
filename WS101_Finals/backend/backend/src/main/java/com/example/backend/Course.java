package com.example.backend;

import jakarta.persistence.*;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @Column(nullable = false, unique = true, length = 50)
    private String id;

    private String title;

    @Column(length = 1000)
    private String description;

    private String themeColor;

    private String status;

    // --- 🔴 THE FIX IS HERE 🔴 ---
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String image;
    // -----------------------------

    public Course() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getThemeColor() { return themeColor; }
    public void setThemeColor(String themeColor) { this.themeColor = themeColor; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
}