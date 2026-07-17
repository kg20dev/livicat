use std::fmt;

/// Errors produced while parsing or validating a Monkeywork scene graph.
#[derive(Debug)]
pub enum MonkeyworkError {
    /// The scene graph was syntactically valid JSON but semantically malformed.
    InvalidSceneGraph(String),
    /// The input could not be deserialized into the expected types.
    ParseError(serde_json::Error),
    /// A structural or semantic validation rule was violated.
    ValidationError(String),
}

impl fmt::Display for MonkeyworkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidSceneGraph(msg) => write!(f, "Invalid scene graph: {}", msg),
            Self::ParseError(e) => write!(f, "Parse error: {}", e),
            Self::ValidationError(msg) => write!(f, "Validation error: {}", msg),
        }
    }
}

impl std::error::Error for MonkeyworkError {}

impl From<serde_json::Error> for MonkeyworkError {
    fn from(e: serde_json::Error) -> Self {
        Self::ParseError(e)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_display() {
        let err = MonkeyworkError::InvalidSceneGraph("missing version".into());
        assert!(err.to_string().contains("missing version"));
    }

    #[test]
    fn error_from_serde() {
        let err = MonkeyworkError::from(
            serde_json::from_str::<super::super::scene_graph::SceneGraph>("bad").unwrap_err(),
        );
        assert!(matches!(err, MonkeyworkError::ParseError(_)));
    }
}
