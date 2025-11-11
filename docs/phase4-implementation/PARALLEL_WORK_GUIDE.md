# Parallel Work Setup Guide
## BMAD-METHOD™ Multi-Agent Development

**Date**: November 11, 2025  
**Version**: 1.0  
**Purpose**: Enable multiple AI agents to work in parallel on Sprint 1 stories

---

## Overview

This guide explains how to set up multiple AI agents to work in parallel on different stories following the BMAD-METHOD™ framework. This approach maximizes development velocity by having specialized agents work simultaneously on independent stories.

---

## Current Status

**Completed**:
- ✅ Phase 1: Product Brief
- ✅ Phase 2: PRD, Architecture, UX Design
- ✅ Phase 3: Test Strategy
- ✅ Phase 4: Sprint 1 Stories Created
- ✅ STORY-001: LangChain Service (IN PROGRESS - Developer Agent 2)

**Ready for Parallel Work**:
- STORY-002: Form Generation API Endpoint
- STORY-003: Form Schema Validation Service
- STORY-004: Form Caching Service
- STORY-005: Form Rendering Component (Frontend)
- STORY-006: Dynamic Field Component (Frontend)
- STORY-007: Validation Service (Frontend)

---

## Agent Assignment Strategy

### Backend Team (Node.js + TypeScript)

**Developer Agent 2 (Backend Lead)** - Currently Active
- **Current**: STORY-001 - LangChain Form Generation Service
- **Next**: STORY-002 - Form Generation API Endpoint
- **Branch**: `feature/story-001-langchain-service`

**Developer Agent 3 (Backend Support)** - Available for Parallel Work
- **Assigned**: STORY-003 - Form Schema Validation Service
- **Branch**: `feature/story-003-validation-service`
- **Dependencies**: None (can start immediately)

**Developer Agent 4 (Backend Support)** - Available for Parallel Work
- **Assigned**: STORY-004 - Form Caching Service
- **Branch**: `feature/story-004-caching-service`
- **Dependencies**: None (can start immediately)

### Frontend Team (Angular Web Components)

**Developer Agent 1 (Frontend Lead)** - Available for Parallel Work
- **Assigned**: STORY-005 - Form Rendering Component
- **Branch**: `feature/story-005-form-rendering`
- **Dependencies**: None (can mock backend for now)

**Developer Agent 5 (Frontend Support)** - Available for Parallel Work
- **Assigned**: STORY-006 - Dynamic Field Component
- **Branch**: `feature/story-006-dynamic-field`
- **Dependencies**: None (can work independently)

**Developer Agent 6 (Frontend Support)** - Available for Parallel Work
- **Assigned**: STORY-007 - Validation Service (Frontend)
- **Branch**: `feature/story-007-validation`
- **Dependencies**: None (can start immediately)

---

## Setup Instructions for Each Agent

### Step 1: Clone Repository

```bash
git clone https://github.com/MrYtsejam1/B-MAD.git
cd B-MAD
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Feature Branch

Each agent should create their own feature branch:

```bash
# Example for Developer Agent 3 (Validation Service)
git checkout -b feature/story-003-validation-service

# Example for Developer Agent 1 (Form Rendering)
git checkout -b feature/story-005-form-rendering
```

### Step 4: Load Agent Configuration

Each agent should read their specific agent configuration file:

**Backend Agents**:
- Read: `/bmad/agents/06-developer-backend.md`
- Understand: Backend architecture, Node.js patterns, TypeScript conventions

**Frontend Agents**:
- Read: `/bmad/agents/05-developer-frontend.md`
- Understand: Angular patterns, Web Components, TypeScript conventions

### Step 5: Load Story Context

Each agent should read their assigned story file:

```bash
# Example for STORY-003
cat docs/phase4-implementation/stories/sprint-1/STORY-003-validation-service.md
```

The story file contains:
- Complete context from PRD, Architecture, and Test Strategy
- Detailed acceptance criteria
- Full implementation code examples
- Test requirements
- Definition of Done

### Step 6: Implement Story

Follow the story's implementation details:
1. Create all required files
2. Write implementation code
3. Write unit tests (>85% coverage)
4. Write integration tests
5. Run tests locally
6. Run linting and type checking

### Step 7: Commit and Push

```bash
git add .
git commit -m "STORY-XXX: [Story Title] - Implementation complete"
git push origin feature/story-XXX-description
```

### Step 8: Create Pull Request

Use the git_create_pr tool or GitHub CLI:

```bash
gh pr create \
  --title "STORY-XXX: [Story Title]" \
  --body "Implements STORY-XXX as specified in Sprint 1" \
  --base feature/bmad-method-setup \
  --head feature/story-XXX-description
```

---

## Coordination and Communication

### Scrum Master Coordination

The **Scrum Master Agent** coordinates all parallel work:
- Monitors progress on all stories
- Identifies and resolves blockers
- Manages dependencies between stories
- Facilitates daily standups
- Updates sprint board

### Daily Standup Format

Each agent reports:
1. **Yesterday**: What I completed
2. **Today**: What I'm working on
3. **Blockers**: Any issues or dependencies

### Dependency Management

**Independent Stories (Can Work in Parallel)**:
- STORY-001: LangChain Service (Backend)
- STORY-003: Validation Service (Backend)
- STORY-004: Caching Service (Backend)
- STORY-005: Form Rendering (Frontend)
- STORY-006: Dynamic Field (Frontend)
- STORY-007: Validation (Frontend)

**Dependent Stories (Must Wait)**:
- STORY-002: API Endpoint (depends on STORY-001)
- STORY-008: Integration Tests (depends on STORY-001, STORY-002)

### Merge Strategy

**Option 1: Sequential Merging (Recommended)**
1. Each agent creates PR to `feature/bmad-method-setup`
2. PRs reviewed and merged one at a time
3. Other agents rebase on latest `feature/bmad-method-setup`
4. Minimizes merge conflicts

**Option 2: Parallel Merging**
1. All agents create PRs simultaneously
2. Scrum Master resolves conflicts
3. Faster but more complex

---

## Example: Setting Up Developer Agent 3 (Validation Service)

### Agent Context

**Role**: Developer Agent 3 (Backend Support)  
**Story**: STORY-003 - Form Schema Validation Service  
**Branch**: `feature/story-003-validation-service`  
**Dependencies**: None

### Setup Commands

```bash
# 1. Clone and setup
git clone https://github.com/MrYtsejam1/B-MAD.git
cd B-MAD
npm install

# 2. Create feature branch
git checkout -b feature/story-003-validation-service

# 3. Read agent configuration
cat bmad/agents/06-developer-backend.md

# 4. Read story
cat docs/phase4-implementation/stories/sprint-1/STORY-003-validation-service.md

# 5. Read supporting documentation
cat docs/phase2-planning/prd.md | grep -A 50 "Validation"
cat docs/phase2-planning/architecture.md | grep -A 50 "Validation"
cat docs/phase3-solutioning/test-strategy.md | grep -A 50 "Validation"

# 6. Implement story (create files as specified in story)
mkdir -p src/backend/services
touch src/backend/services/validation.service.ts
touch src/backend/services/validation.service.spec.ts

# ... implement code ...

# 7. Run tests
npm test

# 8. Run linting
npm run lint

# 9. Commit and push
git add .
git commit -m "STORY-003: Form Schema Validation Service - Implementation complete"
git push origin feature/story-003-validation-service

# 10. Create PR
gh pr create \
  --title "STORY-003: Form Schema Validation Service" \
  --body "Implements form schema validation as specified in Sprint 1" \
  --base feature/bmad-method-setup \
  --head feature/story-003-validation-service
```

---

## Example: Setting Up Developer Agent 1 (Form Rendering)

### Agent Context

**Role**: Developer Agent 1 (Frontend Lead)  
**Story**: STORY-005 - Form Rendering Component  
**Branch**: `feature/story-005-form-rendering`  
**Dependencies**: None (can mock backend)

### Setup Commands

```bash
# 1. Clone and setup
git clone https://github.com/MrYtsejam1/B-MAD.git
cd B-MAD
npm install

# 2. Create feature branch
git checkout -b feature/story-005-form-rendering

# 3. Read agent configuration
cat bmad/agents/05-developer-frontend.md

# 4. Read story
cat docs/phase4-implementation/stories/sprint-1/STORY-005-form-rendering.md

# 5. Read supporting documentation
cat docs/phase2-planning/ux-design.md | grep -A 100 "Form Rendering"
cat docs/phase2-planning/architecture.md | grep -A 50 "Frontend"

# 6. Implement story (create Angular component)
cd src/frontend
ng generate component adaptive-form
ng generate component dynamic-field

# ... implement code ...

# 7. Run tests
npm test

# 8. Run linting
npm run lint

# 9. Commit and push
git add .
git commit -m "STORY-005: Form Rendering Component - Implementation complete"
git push origin feature/story-005-form-rendering

# 10. Create PR
gh pr create \
  --title "STORY-005: Form Rendering Component" \
  --body "Implements adaptive form rendering as specified in Sprint 1" \
  --base feature/bmad-method-setup \
  --head feature/story-005-form-rendering
```

---

## Conflict Resolution

### Common Conflicts

1. **Package.json conflicts**: Coordinate dependency additions
2. **Shared utilities**: Create in separate story first
3. **Configuration files**: Merge carefully, test thoroughly

### Resolution Process

1. **Identify conflict**: Git will show conflicting files
2. **Communicate**: Notify Scrum Master and affected agents
3. **Resolve**: Merge changes manually, keeping both if needed
4. **Test**: Run full test suite after resolution
5. **Verify**: Ensure no functionality broken

---

## Quality Gates

Each agent must pass these gates before merging:

### Pre-Commit
- [ ] All unit tests pass
- [ ] Linting passes
- [ ] No TypeScript errors

### Pull Request
- [ ] All tests pass (unit + integration)
- [ ] Code coverage ≥ 80%
- [ ] No new security vulnerabilities
- [ ] Code review approved

### Pre-Merge
- [ ] No merge conflicts
- [ ] CI/CD pipeline passes
- [ ] Story acceptance criteria met

---

## Monitoring Progress

### Sprint Board

Track all stories on the sprint board:

| Story | Agent | Status | Branch | PR |
|-------|-------|--------|--------|-----|
| STORY-001 | Dev Agent 2 | In Progress | feature/story-001 | - |
| STORY-002 | Dev Agent 2 | Pending | - | - |
| STORY-003 | Dev Agent 3 | Ready | - | - |
| STORY-004 | Dev Agent 4 | Ready | - | - |
| STORY-005 | Dev Agent 1 | Ready | - | - |
| STORY-006 | Dev Agent 5 | Ready | - | - |
| STORY-007 | Dev Agent 6 | Ready | - | - |

### Velocity Tracking

**Sprint 1 Capacity**: 40 story points  
**Stories Assigned**: 7 stories (56 story points)  
**Agents Working**: 6 agents  
**Expected Completion**: 3-5 days with parallel work

---

## Best Practices

### Do's ✅

- Read all context documents before starting
- Follow the story's implementation exactly
- Write tests as you code (TDD)
- Commit frequently with clear messages
- Communicate blockers immediately
- Rebase regularly to avoid conflicts
- Run full test suite before pushing

### Don'ts ❌

- Don't skip reading the story context
- Don't modify files outside your story scope
- Don't push directly to main/master
- Don't merge your own PRs
- Don't skip tests or linting
- Don't work on dependent stories before prerequisites complete
- Don't create new dependencies without coordination

---

## Troubleshooting

### Issue: Merge Conflicts

**Solution**:
```bash
git fetch origin
git rebase origin/feature/bmad-method-setup
# Resolve conflicts
git add .
git rebase --continue
git push --force-with-lease
```

### Issue: Tests Failing

**Solution**:
1. Run tests locally: `npm test`
2. Check test output for specific failures
3. Fix failing tests
4. Verify all tests pass before pushing

### Issue: Dependency Missing

**Solution**:
1. Check if dependency is in package.json
2. Run `npm install`
3. If still missing, add to package.json and coordinate with team

### Issue: TypeScript Errors

**Solution**:
1. Run `npm run build:backend` or type check
2. Fix type errors
3. Ensure all imports are correct
4. Verify tsconfig.json is properly configured

---

## Success Criteria

Parallel work is successful when:

- [ ] All agents have clear story assignments
- [ ] No agents are blocked waiting for dependencies
- [ ] Each agent works independently on their branch
- [ ] PRs are created and reviewed promptly
- [ ] Merge conflicts are minimal and resolved quickly
- [ ] All quality gates pass
- [ ] Sprint velocity increases 3-5x compared to sequential work

---

## Next Steps

1. **Scrum Master**: Assign stories to available agents
2. **Each Agent**: Follow setup instructions above
3. **Daily Standups**: Coordinate progress and blockers
4. **Code Reviews**: Review each other's PRs
5. **Integration**: Merge completed stories to main branch
6. **Sprint Review**: Demo completed features

---

**Document Status**: Active  
**Last Updated**: November 11, 2025 18:05:00 UTC  
**Maintained By**: Scrum Master Agent
