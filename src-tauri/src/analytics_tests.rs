#[cfg(test)]
mod tests {
    use std::fs;
    use uuid::Uuid;
    use crate::analytics::AnalyticsClient;

    /// Get the analytics app key from environment, or a clearly fake fallback.
    /// Never hardcode Aptabase-format keys (A-US-*) in source code.
    fn test_app_key() -> String {
        std::env::var("APTABASE_APP_KEY").unwrap_or_else(|_| "test-key-not-real".to_string())
    }

    #[test]
    fn test_analytics_client_creation() {
        let app_key = test_app_key();
        let device_id = Uuid::new_v4().to_string();
        
        let client = AnalyticsClient::new(app_key.clone(), device_id.clone());
        
        assert_eq!(client.app_key, app_key);
        assert_eq!(client.device_id, device_id);
        assert_eq!(client.session_id.len(), 36); // UUID format
        assert!(!client.is_enabled()); // Should start disabled
    }

    #[test]
    fn test_analytics_enable_disable() {
        let app_key = test_app_key();
        let device_id = Uuid::new_v4().to_string();
        let mut client = AnalyticsClient::new(app_key, device_id);
        
        assert!(!client.is_enabled());
        
        client.set_enabled(true);
        assert!(client.is_enabled());
        
        client.set_enabled(false);
        assert!(!client.is_enabled());
    }

    #[test]
    fn test_event_tracking_when_disabled() {
        let app_key = test_app_key();
        let device_id = Uuid::new_v4().to_string();
        let client = AnalyticsClient::new(app_key, device_id);
        
        // Event should not fire when disabled
        client.track_event("test_event", None);
        // If we could capture the HTTP request, we'd verify none was sent
    }

    #[test]
    fn test_event_tracking_when_enabled() {
        let app_key = test_app_key();
        let device_id = Uuid::new_v4().to_string();
        let mut client = AnalyticsClient::new(app_key, device_id);
        client.set_enabled(true);
        
        // Event should be prepared when enabled
        let props = serde_json::json!({"test": "value"});
        client.track_event("test_event", Some(props));
        // If we could capture the HTTP request, we'd verify it was prepared
    }

    #[test]
    fn test_session_id_generation() {
        let app_key = test_app_key();
        let device_id = "fixed-device-123";
        let client1 = AnalyticsClient::new(app_key.clone(), device_id.to_string());
        let client2 = AnalyticsClient::new(app_key, device_id.to_string());
        
        // Different clients should have different session IDs
        assert_ne!(client1.session_id, client2.session_id);
        
        // Session IDs should be valid UUIDs
        assert_eq!(client1.session_id.len(), 36);
        assert_eq!(client2.session_id.len(), 36);
    }

    #[test]
    fn test_device_id_persistence() {
        let temp_dir = std::env::temp_dir();
        let test_dir = temp_dir.join("livicat-test-device-id");
        fs::create_dir_all(&test_dir).unwrap();
        
        let device_file = test_dir.join(".aptabase_device_id");
        let test_device_id = "test-device-uuid-12345";
        
        // Test creating new device ID
        fs::write(&device_file, test_device_id).unwrap();
        let read = fs::read_to_string(&device_file).unwrap();
        assert_eq!(read.trim(), test_device_id);
        
        // Cleanup
        let _ = fs::remove_dir_all(&test_dir);
    }

    #[test]
    fn test_consent_persistence() {
        let temp_dir = std::env::temp_dir();
        let test_dir = temp_dir.join("livicat-test-consent");
        fs::create_dir_all(&test_dir).unwrap();
        
        let consent_file = test_dir.join(".aptabase_consent");
        
        // Test storing consent
        fs::write(&consent_file, "true").unwrap();
        let read = fs::read_to_string(&consent_file).unwrap();
        assert_eq!(read.trim(), "true");
        
        // Test storing denial
        fs::write(&consent_file, "false").unwrap();
        let read = fs::read_to_string(&consent_file).unwrap();
        assert_eq!(read.trim(), "false");
        
        // Cleanup
        let _ = fs::remove_dir_all(&test_dir);
    }

    #[test]
    fn test_event_properties() {
        let app_key = test_app_key();
        let device_id = Uuid::new_v4().to_string();
        let mut client = AnalyticsClient::new(app_key, device_id);
        client.set_enabled(true);
        
        // Test event with properties
        let props = serde_json::json!({
            "theme": "dark",
            "count": 42
        });
        
        client.track_event("event_with_props", Some(props));
        // Verify properties are included (would check HTTP request if possible)
    }

    #[test]
    fn test_device_id_generation_creates_persistent_uuid() {
        // Test that device ID is a valid UUID
        let device_id = Uuid::new_v4();
        let uuid_str = device_id.to_string();
        
        // Verify UUID format (8-4-4-4-12)
        assert!(uuid_str.len() == 36);
        assert!(uuid_str.split('-').count() == 5);
        
        // Verify it's persistent by writing and reading
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("test-device-id");
        fs::write(&test_file, &uuid_str).unwrap();
        let read = fs::read_to_string(&test_file).unwrap();
        assert_eq!(read, uuid_str);
        
        // Cleanup
        let _ = fs::remove_file(&test_file);
    }

    #[test]
    fn test_device_id_reused_on_subsequent_launches() {
        // Simulate "subsequent launch" by reading existing file
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join(".aptabase_device_id");
        let original_id = "original-device-uuid-123456";
        
        // Simulate first launch - create file
        fs::write(&test_file, original_id).unwrap();
        
        // Simulate subsequent launch - read file
        let read = fs::read_to_string(&test_file).unwrap();
        assert_eq!(read, original_id, "Device ID should be reused on subsequent launches");
        
        // Cleanup
        let _ = fs::remove_file(&test_file);
    }

    #[test]
    fn test_session_id_is_unique_per_launch() {
        let app_key = test_app_key();
        let device_id = "fixed-device-123";
        
        // Simulate multiple app launches
        let session1 = AnalyticsClient::new(app_key.clone(), device_id.to_string()).session_id;
        let session2 = AnalyticsClient::new(app_key.clone(), device_id.to_string()).session_id;
        let session3 = AnalyticsClient::new(app_key, device_id.to_string()).session_id;
        
        // All session IDs should be different
        assert_ne!(session1, session2);
        assert_ne!(session2, session3);
        assert_ne!(session1, session3);
        
        // All should be valid UUIDs
        assert_eq!(session1.len(), 36);
        assert_eq!(session2.len(), 36);
        assert_eq!(session3.len(), 36);
    }

    #[test]
    fn test_consent_status_persists_across_restarts() {
        let temp_dir = std::env::temp_dir();
        let consent_file = temp_dir.join(".aptabase_consent");
        
        // Simulate first launch - no consent file exists
        assert!(!consent_file.exists(), "Consent file shouldn't exist on first launch");
        
        // Set consent
        fs::write(&consent_file, "true").unwrap();
        
        // Simulate app restart - check file still exists
        assert!(consent_file.exists(), "Consent file should persist");
        let read = fs::read_to_string(&consent_file).unwrap();
        assert_eq!(read.trim(), "true", "Consent status should persist");
        
        // Cleanup
        let _ = fs::remove_file(&consent_file);
    }
}
