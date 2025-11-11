# BMAD-METHOD™ Workflows

This directory contains workflow definitions for the BMAD-METHOD™ framework.

## Workflow Overview

BMAD-METHOD™ follows a 4-phase approach with specific workflows for each phase.

### Phase 1: Analysis (Optional but Recommended)

**Workflows**:
1. **brainstorm-project** - Generate and refine project ideas
2. **market-research** - Analyze competitive landscape
3. **product-brief** - Create high-level product vision

**Agents**: Product Manager, BMad Master, UX Designer

---

### Phase 2: Planning (Required)

**Workflows**:
1. **prd** - Create Product Requirement Document
2. **ux-design** - Design user flows and wireframes
3. **architecture** - Design system architecture
4. **api-specification** - Define API contracts

**Agents**: Product Manager, UX Designer, Architect, BMad Master

---

### Phase 3: Solutioning (Required)

**Workflows**:
1. **test-design** - Create test strategy
2. **quality-metrics** - Define quality gates
3. **performance-benchmarks** - Set performance targets

**Agents**: Test Architect (TEA), Architect, BMad Master

---

### Phase 4: Implementation (Iterative)

**Workflows**:
1. **sprint-planning** - Plan sprint and create stories
2. **story-context** - Create context-engineered story files
3. **dev-story** - Implement feature from story
4. **code-review** - Review code for quality
5. **sprint-review** - Demo and gather feedback
6. **retrospective** - Reflect and improve

**Agents**: Scrum Master, Developer Agents, Architect, TEA, BMad Master

---

## Workflow Execution

### Using BMAD-METHOD™ Framework

If you have the BMAD-METHOD™ framework installed:

```bash
# Load agent
# In your IDE (Claude Code, Cursor, etc.)
# Load: bmad/agents/[agent-name].md

# Run workflow
*workflow-name

# Or use slash command
/bmad:bmm:workflows:workflow-name
```

### Manual Execution

If not using the framework, follow these steps:

1. **Load the appropriate agent** configuration from `bmad/agents/`
2. **Read the agent's system prompt** to understand their role
3. **Follow the workflow steps** for the specific phase
4. **Create deliverables** in the appropriate `docs/` directory
5. **Proceed to next workflow** when complete

---

## Workflow Dependencies

```
Phase 1: Analysis
  └─> brainstorm-project
      └─> market-research
          └─> product-brief
              └─> Phase 2

Phase 2: Planning
  └─> prd (Product Manager)
  └─> ux-design (UX Designer) [parallel with prd]
  └─> architecture (Architect) [requires prd]
      └─> Phase 3

Phase 3: Solutioning
  └─> test-design (Test Architect)
      └─> Phase 4

Phase 4: Implementation (Iterative)
  └─> sprint-planning (Scrum Master)
      └─> story-context (Scrum Master)
          └─> dev-story (Developer Agents)
              └─> code-review (Architect, TEA)
                  └─> sprint-review (All)
                      └─> retrospective (All)
                          └─> Next Sprint
```

---

## Phase Gates

### Phase 1 → Phase 2
- [ ] Product brief complete
- [ ] Research findings documented
- [ ] Technical feasibility confirmed

### Phase 2 → Phase 3
- [ ] PRD complete and approved
- [ ] Architecture document complete
- [ ] UX designs finalized
- [ ] No major open questions

### Phase 3 → Phase 4
- [ ] Test strategy approved
- [ ] Architecture validated
- [ ] First sprint stories ready
- [ ] Development environment ready

---

## Context Engineering

The key to BMAD-METHOD™ success is **context-engineered story files** in Phase 4.

### Story File Requirements

Each story must include:
1. **Complete PRD context** - Embed relevant sections
2. **Complete Architecture context** - Embed relevant decisions
3. **Code examples** - Actual patterns from codebase
4. **Exact file paths** - No ambiguity
5. **Clear acceptance criteria** - Specific and testable
6. **Test requirements** - What to test and how

### Goal

Developer agents should be able to implement stories **without asking questions**.

---

## Getting Started

1. **Start with Phase 1** if this is a new project
2. **Load BMad Master agent** to coordinate
3. **Follow phases sequentially** - don't skip
4. **Use phase gates** to ensure quality
5. **Create context-rich stories** in Phase 4

---

## Resources

- **BMAD-METHOD™ GitHub**: https://github.com/bmad-code-org/BMAD-METHOD
- **Team Setup Guide**: See `BMAD_METHOD_Team_Setup.md` in project root
- **Agent Configurations**: See `bmad/agents/`
- **Phase Documents**: See `docs/`

---

**Note**: This is a simplified workflow overview. For full BMAD-METHOD™ capabilities, install the official framework using `npx bmad-method@alpha install`.
