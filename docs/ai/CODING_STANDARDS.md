# Coding standards
Naming: files | components | functions | constants | DB fields | routes
Organisation: folder rules, import rules, one responsibility per module
Errors: one pattern, user-friendly messages, no swallowed errors, no secrets in logs
Security: validate input on the server, check authorisation on the server, secrets only in env vars
Frontend: reuse existing components and design tokens; handle loading, empty and error states
Animation: animate transform/opacity; respect prefers-reduced-motion; no transform/filter on ancestors of fixed elements
Docs: update affected docs in the same change
