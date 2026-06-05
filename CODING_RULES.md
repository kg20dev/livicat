# CODING_RULES.md

Project-specific coding standards and AI agent working rules for Livicat.

## AI Agent Push Restrictions

❌ **NO AUTOMATED PUSH BY AI AGENTS**

**AI agents MUST NEVER push to main/master without explicit human approval**
- All code changes require review and approval before merging
- AI agents may create commits locally but MUST STOP before git push
- Exception: ONLY after human explicitly approves via `/approve` command

### Why This Rule Exists
- Prevents accidental code breaks from automated agents
- Ensures human oversight of all changes
- Maintains code quality and security
- Allows proper code review process

## Commit Message Conventions

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples
```
feat(backend): add signal validation endpoint

- Add GET /api/agents/analyst/validate endpoint
- Implement staff API key authentication
- Add comprehensive test coverage

Closes #123
```

```
fix(worker): resolve race condition in signal processing

- Fix duplicate signal creation
- Add mutex for concurrent operations
- Update tests

Fixes #456
```

## Working Rules

### Core Principles
1. **Prefer small, targeted changes**
2. **Keep the app stable; avoid unrelated refactors**
3. **Do not edit secrets or local env files** (.env, .env.local, .env.*)
4. **Do not touch generated logs or dumps** unless explicitly asked

### Before Changing Code
- Check the relevant package scripts and existing patterns in the touched area
- Prefer existing utilities, services, and naming conventions
- If a change affects multiple services, update each service consistently

### Code Quality
- Follow TypeScript strict mode guidelines
- Use React hooks properly (no stale closures)
- Implement proper error handling
- Add appropriate tests for new features
- Ensure OBS compatibility for all UI changes

## Other Skills

### GitHub Operations
- **github-operations** — Load when creating issues, milestones, or managing repository tasks
- Use GitHub CLI (gh) for repository operations
- Follow GitFlow workflow: Issue → Branch → PR → Merge

### Feature Planning
- **avoid-feature-creep** — Load when planning new features or reviewing scope
- Focus on MVP requirements
- Avoid over-engineering
- Ship incrementally

## Memory and Handoff Practice

### Memory Bank (Manual)
When finishing a task, update the memory files in `docs/memory/`:

- **summary.md** — session summary (what changed, why, follow-up)
- **decisions.md** — architectural decisions
- **next-steps.md** — pending work and bugs

Keep entries brief and actionable (≤5 bullet points each).

### Codemem (Automatic)
This project has codemem installed:

- AI captures activity automatically
- Searches relevant context before tasks
- Uses memory timeline for session continuity
- Search memory with `codemem search <query>` or let AI handle it

### Best Practice
1. **Start**: Briefly recall relevant past work (check `docs/memory/`)
2. **During**: Codemem auto-injects relevant context
3. **End**: Update Memory Bank + codemem captures automatically

## Project-Specific Rules

### Component Architecture
- Organize components by feature (ChatDisplay, SettingsPanel, shared)
- Keep components small and focused
- Use TypeScript for all components
- Implement proper prop types and interfaces

### YouTube API Integration
- Handle API errors gracefully
- Implement rate limiting
- Respect YouTube API quotas
- Use polling with proper intervals
- Handle network failures with retry logic

### OBS Optimization
- Test with different OBS scene sizes
- Ensure high contrast for readability
- Optimize performance for long streams
- Implement virtual scrolling for chat lists
- Handle memory management properly

### State Management
- Use React hooks (useState, useEffect, useContext)
- Consider Zustand for complex state if needed
- Avoid prop drilling where possible
- Implement proper cleanup in useEffect

## Testing Requirements

- Write tests for new features
- Test OBS compatibility
- Verify YouTube API integration
- Test error scenarios
- Ensure performance under load

## Security Considerations

- Never commit API keys or secrets
- Validate all user inputs
- Sanitize YouTube chat data
- Handle XSS vulnerabilities
- Implement proper authentication when needed

## Deployment and Build

- Use Vite for development and production builds
- Test production builds before deployment
- Ensure proper asset optimization
- Verify OBS browser source compatibility

---

**Remember**: These rules complement the universal principles in AGENTS_KARPATHY.md. When in doubt, prioritize safety, quality, and human oversight over automation.
