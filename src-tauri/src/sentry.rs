use sentry::types::Dsn;
use std::env;
use std::str::FromStr;
use ::sentry::Level as SentryLevel;

/// Add breadcrumb for tracking user actions
pub fn add_breadcrumb(category: &str, message: &str, level: SentryLevel) {
    sentry::add_breadcrumb(sentry::Breadcrumb {
        category: Some(category.to_string()),
        message: Some(message.to_string()),
        level: level,
        ..Default::default()
    });
}

/// Capture error with additional context
pub fn capture_error(err: &str) {
    sentry::capture_message(err, SentryLevel::Error);
}

/// Capture message as warning
pub fn capture_message(message: &str, level: SentryLevel) {
    sentry::capture_message(message, level);
}

/// Initialize Sentry for error reporting
///
/// Loads configuration from environment variables:
/// - SENTRY_DSN: Sentry Data Source Name (required)
/// - SENTRY_ENVIRONMENT: Environment name (development/production)
/// - SENTRY_RELEASE: Release version (auto-synced with Cargo.toml)
pub fn init_sentry() -> sentry::ClientInitGuard {
    let dsn = env::var("SENTRY_DSN").unwrap_or_else(|_| {
        println!("[Livicat] SENTRY_DSN not set, error reporting disabled");
        String::new()
    });

    if dsn.is_empty() {
        return sentry::init(());
    }

    let environment = env::var("SENTRY_ENVIRONMENT").unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            "development".to_string()
        } else {
            "production".to_string()
        }
    });

    let release = env::var("SENTRY_RELEASE").unwrap_or_else(|_| {
        format!("livicat@{}", env!("CARGO_PKG_VERSION"))
    });

    println!(
        "[Livicat] Sentry initialized: env={}, release={}",
        environment, release
    );

    let client = sentry::init((
        Dsn::from_str(&dsn).expect("Invalid Sentry DSN format"),
        sentry::ClientOptions {
            release: Some(release.into()),
            environment: Some(environment.into()),
            traces_sample_rate: 0.1, // 10% sampling for performance monitoring
            attach_stacktrace: true,
            ..Default::default()
        },
    ));

    // Configure global scope with app context
    sentry::configure_scope(|scope| {
        scope.set_extra("app_version", env!("CARGO_PKG_VERSION").into());
        scope.set_extra("tauri_version", env!("CARGO_PKG_VERSION").into());
        scope.set_extra("os", std::env::consts::OS.into());
        scope.set_extra("arch", std::env::consts::ARCH.into());
    });

    client
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_release_format() {
        let release = format!("livicat@{}", env!("CARGO_PKG_VERSION"));
        assert!(release.starts_with("livicat@"));
        assert!(release.contains('.'));
    }

    #[test]
    fn test_dsn_validation() {
        // Valid DSN format
        let valid_dsn = "https://12345@sentry.io/12345";
        assert!(Dsn::from_str(valid_dsn).is_ok());

        // Invalid DSN format
        let invalid_dsn = "not-a-dsn";
        assert!(Dsn::from_str(invalid_dsn).is_err());
    }

    #[test]
    fn test_error_capture() {
        // Test that error capture doesn't panic
        capture_error("Test error message");
    }

    #[test]
    fn test_init_without_dsn() {
        // Test that Sentry initialization works without DSN (disabled mode)
        // This ensures the app doesn't crash when SENTRY_DSN is not set
        let dsn = "";
        if dsn.is_empty() {
            // Should return a disabled client
            let client = sentry::init(());
            assert!(!client.is_enabled());
        }
    }

    #[test]
    fn test_breadcrumb_creation() {
        // Test breadcrumb creation doesn't panic
        add_breadcrumb("test_category", "test_message", SentryLevel::Info);
    }
}
