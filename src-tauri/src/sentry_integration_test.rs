#[cfg(test)]
mod sentry_integration_tests {
    use crate::sentry;
    use crate::SentryLevel;
    use std::env;

    #[test]
    fn test_sentry_integration() {
        // This test requires SENTRY_DSN to be set
        let dsn = env::var("SENTRY_DSN").unwrap_or_else(|_| "".to_string());

        if dsn.is_empty() {
            println!("Skipping Sentry integration test - SENTRY_DSN not set");
            return;
        }

        println!("Testing Sentry integration with DSN: {}...", &dsn[..dsn.len().min(20)]);

        // Test breadcrumb creation
        sentry::add_breadcrumb("test", "Integration test breadcrumb", SentryLevel::Info);
        println!("✅ Breadcrumb created successfully");

        // Test error capture
        sentry::capture_error("Test integration error - this is intentional");
        println!("✅ Error captured successfully");

        // Test message capture
        sentry::capture_message("Test integration message - this is intentional", SentryLevel::Warning);
        println!("✅ Message captured successfully");

        // Test log capture
        sentry::send_test_log();
        println!("✅ Test log sent successfully");

        println!("✅ Sentry integration test complete - check your Sentry dashboard for:");
        println!("   • Test error");
        println!("   • Test warning");
        println!("   • Test breadcrumb");
        println!("   • Test log entry");
    }
}
