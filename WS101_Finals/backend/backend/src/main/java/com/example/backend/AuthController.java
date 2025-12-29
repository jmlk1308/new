package com.example.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import org.springframework.web.multipart.MultipartFile;
// ❌ REMOVED: import java.nio.file.*; (You don't need this anymore)

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityLogRepository logRepository;

    // ✅ CHANGED: Inject the Cloudinary Service here
    @Autowired
    private CloudinaryService cloudinaryService;

    // ==========================================
    // LOGIN
    // ==========================================
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        String username = loginData.get("username");
        String password = loginData.get("password");

        User user = userRepository.findByUsername(username);

        if (user != null && user.getPassword().equals(password)) {
            logRepository.save(new ActivityLog(user.getUsername(), "User Logged In", user.getRole()));
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(401).body("Invalid username or password");
        }
    }

    // ==========================================
    // UPDATE USER PROFILE (Text Data)
    // ==========================================
    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.notFound().build();
        }

        if (updates.containsKey("username")) {
            user.setUsername((String) updates.get("username"));
        }

        if (updates.containsKey("password")) {
            String newPass = (String) updates.get("password");
            if (newPass != null && !newPass.trim().isEmpty()) {
                user.setPassword(newPass);
            }
        }

        userRepository.save(user);
        logRepository.save(new ActivityLog(user.getUsername(), "Updated Profile", user.getRole()));

        return ResponseEntity.ok(user);
    }

    // ==========================================
    // ✅ CHANGED: UPLOAD PROFILE PHOTO (To Cloudinary)
    // ==========================================
    @PostMapping("/users/{id}/photo")
    public ResponseEntity<?> uploadProfilePhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            // 1. Find User
            User user = userRepository.findById(id).orElse(null);
            if (user == null) return ResponseEntity.notFound().build();

            // 2. ✅ CHANGED: Upload to Cloudinary instead of local folder
            // This returns a full URL like "https://res.cloudinary.com/..."
            String imageUrl = cloudinaryService.uploadFile(file);

            // 3. Update User Record with the URL
            user.setProfileImage(imageUrl);
            userRepository.save(user);

            // 4. Log it
            logRepository.save(new ActivityLog(user.getUsername(), "Updated Profile Picture", user.getRole()));

            // 5. Return the new URL so frontend can display it immediately
            return ResponseEntity.ok(Map.of("message", "Upload successful", "image", imageUrl));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error uploading file: " + e.getMessage());
        }
    }
}