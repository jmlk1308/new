package com.example.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;

@RestController
// ✅ THIS LINE IS CRITICAL. It creates the "/api/auth" part of the URL.
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityLogRepository logRepository;

    // ✅ THIS LINE IS CRITICAL. It creates the "/login" part.
    // Combined URL: /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String username = loginData.get("username");
        String password = loginData.get("password");

        User user = userRepository.findAll().stream()
                .filter(u -> u.getUsername().equals(username) && u.getPassword().equals(password))
                .findFirst()
                .orElse(null);

        if (user != null) {
            // Log the activity
            logRepository.save(new ActivityLog(user.getUsername(), "User Logged In", user.getRole()));
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(401).body("Invalid credentials");
        }
    }


    //
// ... inside AuthController class ...

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> updates) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // 1. Handle Username Change
        if (updates.containsKey("username")) {
            String newUsername = updates.get("username");
            if (newUsername != null && !newUsername.trim().isEmpty() && !newUsername.equals(user.getUsername())) {
                // Check if username is already taken by ANOTHER user
                User existing = userRepository.findByUsername(newUsername);
                if (existing != null && !existing.getId().equals(id)) {
                    return ResponseEntity.badRequest().body("Username already exists.");
                }
                user.setUsername(newUsername);
            }
        }

        // 2. Handle Password Change
        if (updates.containsKey("password")) {
            String newPassword = updates.get("password");
            if (newPassword != null && !newPassword.trim().isEmpty()) {
                user.setPassword(newPassword);
            }
        }

        userRepository.save(user);

        // Return the updated user object so frontend can update localStorage
        return ResponseEntity.ok(user);
    }

    @PostMapping("/users/{id}/photo")
    public ResponseEntity<?> uploadProfilePhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            // 1. Find User
            User user = userRepository.findById(id).orElse(null);
            if (user == null) return ResponseEntity.notFound().build();

            // 2. Save File (Reuse logic from Admin/Professor controllers)
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path uploadPath = Paths.get("uploads/");
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
            Files.copy(file.getInputStream(), uploadPath.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

            // 3. Update User Record
            user.setProfileImage(fileName);
            userRepository.save(user);

            // 4. Log it
            logRepository.save(new ActivityLog(user.getUsername(), "Updated Profile Picture", user.getRole()));

            // 5. Return the new filename so frontend can display it immediately
            return ResponseEntity.ok(Map.of("message", "Upload successful", "image", fileName));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error uploading file: " + e.getMessage());
        }
    }
}





