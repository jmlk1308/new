package com.example.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired private UserRepository userRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private ActivityLogRepository logRepository;

    // ✅ NEW: INJECT CLOUDINARY SERVICE
    @Autowired private CloudinaryService cloudinaryService;

    // ❌ REMOVED: private static final String UPLOAD_DIR = "uploads/";

    // ==========================================
    // 0. ACTIVITY LOGS
    // ==========================================
    @GetMapping("/logs")
    public List<ActivityLog> getLogs() {
        return logRepository.findAllByOrderByTimestampDesc();
    }

    private void logActivity(String target, String action, String role) {
        ActivityLog log = new ActivityLog(target, action, role);
        logRepository.save(log);
    }

    // ==========================================
    // 1. USER MANAGEMENT
    // ==========================================
    @GetMapping("/users")
    public List<User> getAllUsers() { return userRepository.findAll(); }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()) != null) {
            return ResponseEntity.badRequest().body("Username already exists");
        }

        if ("professor".equalsIgnoreCase(user.getRole())) {
            if (user.getCourseId() == null || user.getCourseId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Professors must be assigned to a Course/Department.");
            }
        } else {
            user.setCourseId(null);
        }
        if (user.getRole() == null) user.setRole("student");

        User savedUser = userRepository.save(user);
        logActivity(savedUser.getUsername(), "User created", savedUser.getRole());

        return ResponseEntity.ok(savedUser);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        userRepository.deleteById(id);
        logActivity(user.getUsername(), "User deleted", user.getRole());

        return ResponseEntity.ok("User deleted successfully");
    }

    // ==========================================
    // 2. COURSE MANAGEMENT (✅ UPDATED FOR CLOUDINARY)
    // ==========================================
    @GetMapping("/courses")
    public List<Course> getAllCourses() { return courseRepository.findAll(); }

    @PostMapping("/courses")
    public ResponseEntity<?> createCourse(
            @RequestParam("id") String id,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("themeColor") String themeColor,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        if (courseRepository.existsById(id)) {
            return ResponseEntity.badRequest().body("Course Code (ID) already exists.");
        }

        Course course = new Course();
        course.setId(id);
        course.setTitle(title);
        course.setDescription(description);
        course.setThemeColor(themeColor);
        course.setStatus("active");

        // ✅ CHANGED: Upload to Cloudinary instead of local folder
        if (file != null && !file.isEmpty()) {
            String imageUrl = cloudinaryService.uploadFile(file);
            course.setImage(imageUrl);
        }

        courseRepository.save(course);
        logActivity(course.getId(), "Course created", "System");

        return ResponseEntity.ok(course);
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<?> updateCourse(
            @PathVariable String id,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("themeColor") String themeColor,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        return courseRepository.findById(id).map(existing -> {
            existing.setTitle(title);
            existing.setDescription(description);
            existing.setThemeColor(themeColor);

            // ✅ CHANGED: Upload to Cloudinary if a new file is sent
            if (file != null && !file.isEmpty()) {
                String imageUrl = cloudinaryService.uploadFile(file);
                existing.setImage(imageUrl);
            }
            courseRepository.save(existing);
            logActivity(existing.getId(), "Course updated", "System");

            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable String id) {
        if (!courseRepository.existsById(id)) return ResponseEntity.notFound().build();
        courseRepository.deleteById(id);
        logActivity(id, "Course deleted", "System");
        return ResponseEntity.ok("Course deleted successfully");
    }

    // ==========================================
    // 3. SUBJECT MANAGEMENT
    // ==========================================
    @GetMapping("/subjects")
    public List<Subject> getSubjects(@RequestParam(required = false) String courseId) {
        if (courseId != null && !courseId.isEmpty()) {
            return subjectRepository.findByCourseId(courseId);
        }
        return subjectRepository.findAll();
    }

    @GetMapping("/subjects/{code}")
    public ResponseEntity<Subject> getSubject(@PathVariable String code) {
        return subjectRepository.findById(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/subjects")
    public ResponseEntity<?> createSubject(@RequestBody Subject subject) {
        if (subjectRepository.existsById(subject.getCode())) {
            return ResponseEntity.badRequest().body("Subject Code already exists.");
        }
        if (subject.getYearLevel() == 0) subject.setYearLevel(1);
        if (subject.getSemester() == 0) subject.setSemester(1);
        if (subject.getStatus() == null) subject.setStatus("active");

        subjectRepository.save(subject);
        logActivity(subject.getCode(), "Subject created", "System");

        return ResponseEntity.ok(subject);
    }

    @PutMapping("/subjects/{code}")
    public ResponseEntity<?> updateSubject(@PathVariable String code, @RequestBody Subject subject) {
        return subjectRepository.findById(code).map(existing -> {
            existing.setTitle(subject.getTitle());
            existing.setYearLevel(subject.getYearLevel());
            existing.setSemester(subject.getSemester());
            existing.setStatus(subject.getStatus());

            subjectRepository.save(existing);
            logActivity(code, "Subject updated", "System");

            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/subjects/{code}")
    public ResponseEntity<?> deleteSubject(@PathVariable String code) {
        if (!subjectRepository.existsById(code)) return ResponseEntity.notFound().build();
        subjectRepository.deleteById(code);
        logActivity(code, "Subject deleted", "System");

        return ResponseEntity.ok("Subject deleted successfully");
    }

    // ❌ REMOVED: Helper method `saveFile` is no longer needed!
}