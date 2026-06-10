#[cfg(test)]
mod sentry_live_tests {
    use crate::sentry;
    use crate::SentryLevel;
    use std::env;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn test_sentry_live_delivery() {
        // This test requires SENTRY_DSN to be set
        let dsn = env::var("SENTRY_DSN").unwrap_or_else(|_| "".to_string());

        if dsn.is_empty() {
            println!("⚠️  Skipping Sentry live test - SENTRY_DSN not set");
            println!("Set SENTRY_DSN environment variable to test live delivery");
            return;
        }

        println!("🧪 Testing Sentry Live Event Delivery");
        println!("=====================================");
        println!("DSN: {}...", &dsn[..dsn.len().min(40)]);
        println!();

        // Initialize Sentry with explicit guard
        let _guard = sentry::init_sentry();
        println!("✅ Sentry initialized");

        // Test 1: Send a breadcrumb
        sentry::add_breadcrumb("live_test", "Live test breadcrumb", SentryLevel::Info);
        println!("✅ Breadcrumb sent");

        // Test 2: Capture an error
        sentry::capture_error("Live test error - should appear in Sentry");
        println!("✅ Error captured");

        // Test 3: Capture a message
        sentry::capture_message("Live test message - should appear in Sentry", SentryLevel::Warning);
        println!("✅ Message captured");

        // Test 4: Send fake crash event
        sentry::send_fake_crash_event();
        println!("✅ Fake crash event sent");
        
        // Test 5: Send fake error with breadcrumbs
        sentry::send_fake_error_with_stacktrace();
        println!("✅ Fake error with stack trace sent");
        
        // Test 6: Send complete test scenario
        sentry::send_test_scenario();
        println!("✅ Complete test scenario sent");
        {
            use log::{info, error, warn};
            
            info!("Live test log from Livicat - INFO level");
            warn!("Live test log from Livicat - WARN level");
            error!("Live test log from Livicat - ERROR level");
        }
        println!("✅ Test logs sent");

        // Give Sentry time to send events
        println!("");
        println!("⏳ Waiting 5 seconds for events to be sent to Sentry...");
        thread::sleep(Duration::from_secs(5));

        println!("");
        println!("✅ Test complete!");
        println!("🔍 Check your Sentry dashboard:");
        println!("   URL: https://sentry.io/organizations/livicat/");
        println!("   Look for:");
        println!("   • Live test error");
        println!("   • Live test message");
        println!("   • Live test breadcrumb");
        println!("   • Fake crash event");
        println!("   • Fake error with breadcrumbs");
        println!("   • Complete test scenario with user journey");
        println!("   • Log entries from Livicat");
        println!("   • Environment: development");
        println!("   • Release: livicat@0.7.6");
        println!("");
        println!("💡 Events may take 1-2 minutes to appear in dashboard");
    }
}
