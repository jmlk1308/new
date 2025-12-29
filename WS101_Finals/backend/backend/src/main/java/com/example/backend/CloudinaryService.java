package com.example.backend;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService() {
        // Replace with your actual values from Cloudinary Dashboard
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", "dqsdcyko6",
                "api_key", "266247926448465",
                "api_secret", "2UKz6aeBw0wb1xl_IMgZHJgKA6g"
        ));
    }

    public String uploadFile(MultipartFile file) {
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            return (String) uploadResult.get("url"); // Returns the HTTP URL
        } catch (IOException e) {
            throw new RuntimeException("Image upload failed: " + e.getMessage());
        }
    }
}