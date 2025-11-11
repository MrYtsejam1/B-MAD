# Generative UI Adaptive Form - BMAD-METHOD™ Project

## Project Overview

This project implements a Generative UI adaptive form system using LangChain in JavaScript, following the **BMAD-METHOD™** (Breakthrough Method of Agile AI-Driven Development) framework.

**Tech Stack:**
- **Frontend**: Angular Web Components
- **Backend**: Node.js + Express
- **AI**: LangChain.js
- **Methodology**: BMAD-METHOD™ with 8 specialized AI agents

## Team Structure

This project uses 8 specialized AI agents following BMAD-METHOD™:

1. **BMad Master** - Orchestrator and project coordinator
2. **Product Manager** - Requirements and PRD creation
3. **Architect** - System design and technical architecture
4. **Scrum Master** - Story creation and sprint management
5. **Developer Agent 1** - Frontend (Angular web components)
6. **Developer Agent 2** - Backend (Node.js + LangChain)
7. **UX Designer** - UI/UX design and patterns
8. **Test Architect (TEA)** - Test strategy and quality assurance

## Project Structure

```
B-MAD/
├── bmad/                          # BMAD-METHOD framework
│   ├── core/                      # Core framework files
│   ├── agents/                    # AI agent configurations
│   └── workflows/                 # Workflow definitions
├── docs/                          # Planning documents
│   ├── phase1-analysis/           # Analysis phase outputs
│   ├── phase2-planning/           # PRD, Architecture, UX
│   ├── phase3-solutioning/        # Test strategy
│   └── phase4-implementation/     # Stories and sprint docs
│       └── stories/               # Context-engineered stories
├── src/                           # Source code
│   ├── frontend/                  # Angular web components
│   ├── backend/                   # Node.js API + LangChain
│   └── shared/                    # Shared types and utilities
├── tests/                         # Test suites
└── config/                        # Configuration files
```

## BMAD-METHOD™ Phases

### Phase 1: Analysis (Week 1)
- Brainstorm project ideas
- Market research
- Product brief creation
- Technical feasibility assessment

### Phase 2: Planning (Weeks 2-3)
- Product Requirement Document (PRD)
- UX Design (user flows, wireframes)
- Architecture Document
- API specifications

### Phase 3: Solutioning (Week 3)
- Test Strategy Document
- Quality metrics definition
- Test scenario design

### Phase 4: Implementation (Weeks 4+)
- Sprint-based development (2-week sprints)
- Context-engineered story files
- Iterative feature delivery

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/MrYtsejam1/B-MAD.git
cd B-MAD

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (OpenAI, Anthropic)
```

### Current Phase

**Phase 1: Analysis** - In Progress

See `docs/phase1-analysis/` for current analysis documents.

## AI Agent Configuration

Agent configurations are stored in `bmad/agents/`. Each agent has:
- System prompt with role and expertise
- Temperature settings
- Model recommendations (Claude 3.5 Sonnet / GPT-4)

## Development Workflow

1. **Load appropriate AI agent** for the task
2. **Run workflow** from `bmad/workflows/`
3. **Follow BMAD phases** sequentially
4. **Create context-rich stories** in Phase 4
5. **Implement features** from story files

## Documentation

- **Team Setup Guide**: See `BMAD_METHOD_Team_Setup.md` in project root
- **Phase Documents**: See `docs/` directory
- **Agent Configs**: See `bmad/agents/`
- **Workflows**: See `bmad/workflows/`

## Sprint Schedule

- **Sprint Duration**: 2 weeks
- **Sprint Planning**: Every 2 weeks
- **Daily Standup**: Async (automated)
- **Sprint Review**: End of sprint
- **Retrospective**: End of sprint

## Metrics & KPIs

- **Velocity**: Story points per sprint
- **Cycle Time**: Story start to deployment
- **Test Coverage**: Target >80%
- **Form Generation Time**: Target <2s
- **Accessibility**: WCAG 2.1 AA compliance

## Contributing

This project follows BMAD-METHOD™ principles:
1. Complete planning before implementation
2. Context-engineered story files
3. AI agent specialization
4. Iterative delivery with quality gates

## License

MIT License

## Contact

For questions about BMAD-METHOD™, see:
- GitHub: https://github.com/bmad-code-org/BMAD-METHOD
- Discord: https://discord.gg/gk8jAdXWmj
