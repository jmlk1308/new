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

        // 1. Find user directly from Database (Faster)
        User user = userRepository.findByUsername(username);

        // 2. Check if user exists AND password matches
        if (user != null && user.getPassword().equals(password)) {

            // 3. Log the login
            logRepository.save(new ActivityLog(user.getUsername(), "User Logged In", user.getRole()));

            // 4. Return the user info
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(401).body("Invalid username or password");
        }
    }


    //
// ... inside AuthController class ...

    // ==========================================
    // ✅ ADD THIS MISSING METHOD TO FIX SAVING
    // ==========================================
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        // Update Username if provided
        if (updates.containsKey("username")) {
            user.setUsername((String) updates.get("username"));
        }

        // Update Password if provided (and not empty)
        if (updates.containsKey("password")) {
            String newPass = (String) updates.get("password");
            if (newPass != null && !newPass.trim().isEmpty()) {
                user.setPassword(newPass);
            }
        }

        userRepository.save(user);

        // Log the action
        logRepository.save(new ActivityLog(user.getUsername(), "Updated Profile", user.getRole()));

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





