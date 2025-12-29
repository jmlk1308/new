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
        // I filled these in based on your screenshot and text
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", "dqsdcyko6",             // From your screenshot
                "api_key", "266247926448465",          // From your text
                "api_secret", "2UKz6aeBw0wb1xl_IMgZHJgKA6g" // From your text
        ));
    }

    public String uploadFile(MultipartFile file) {
        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            // This returns the online URL (https://...)
            return uploadResult.get("url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Image upload failed: " + e.getMessage());
        }
    }
}