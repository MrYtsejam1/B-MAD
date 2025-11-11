# Frontend - Angular Web Components

This directory will contain the Angular web components for the adaptive form system.

## Setup

```bash
# Install Angular CLI globally
npm install -g @angular/cli

# Create Angular project
ng new adaptive-forms --routing --style=scss

# Add Angular Elements for web components
ng add @angular/elements
```

## Structure

```
src/frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── adaptive-form/
│   │   │   ├── dynamic-field/
│   │   │   └── field-types/
│   │   ├── services/
│   │   │   ├── form-generation.service.ts
│   │   │   └── validation.service.ts
│   │   └── models/
│   │       ├── form-schema.model.ts
│   │       └── field.model.ts
│   └── assets/
└── angular.json
```

## Components to Build

1. **AdaptiveFormComponent** - Main form container
2. **DynamicFieldComponent** - Dynamic field renderer
3. **Field Type Components** - Text, Select, Checkbox, etc.
4. **ValidationMessageComponent** - Error display
5. **MultiStepFormComponent** - Multi-step navigation

## Next Steps

1. Initialize Angular project
2. Set up component structure
3. Implement form generation service
4. Build dynamic field rendering
5. Add validation logic
