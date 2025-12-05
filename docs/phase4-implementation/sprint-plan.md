# Sprint Plan
## B-MAD Generative UI - LangChain + MCP Implementation

**Version**: 2.0  
**Date**: December 5, 2025  
**Phase**: 4 - Implementation  
**Status**: Planning  
**Owner**: Scrum Master  
**Reviewers**: BMad Master, Architect, Developer Agents

---

## Sprint Overview

Total Duration: **7 weeks** (5 sprints)  
Sprint Length: **1-2 weeks** per sprint  
Team: **8 AI agents** (coordinated by BMad Master)

---

## Sprint Roadmap

| Sprint | Duration | Focus | Story Points | Priority |
|--------|----------|-------|--------------|----------|
| Sprint 1 | 2 weeks | MCP Foundation + OCR | 21 | P0 |
| Sprint 2 | 1 week | LangChain Integration | 13 | P0 |
| Sprint 3 | 1 week | Web Component Generation | 13 | P0 |
| Sprint 4 | 2 weeks | Travel MCP Server | 21 | P1 |
| Sprint 5 | 1 week | UI & Polish | 13 | P1 |

**Total Story Points**: 81

---

## Sprint 1: MCP Foundation + OCR (2 weeks)

### Goals
- Implement MCP Gateway for server discovery and routing
- Create mock APIs for invoice and travel servers
- Integrate OCR service (Tesseract.js)
- Implement NLP extraction for manual invoice entry
- Set up Redis session management

### Stories

**STORY-MCP-001: MCP Gateway Core** (8 points)
- Implement MCP server configuration loader
- Create server discovery mechanism
- Implement request routing (mock/live mode)
- Add JSON schema validation
- **Files**: `src/backend/services/mcp-gateway.service.ts`, `config/servers.mcp.json`
- **Tests**: Unit tests for routing, validation
- **Acceptance**: Gateway loads 2 servers, routes correctly

**STORY-MCP-002: Invoice Mock API** (5 points)
- Implement invoice submission endpoint
- Implement invoice status endpoint
- Add workflow state management
- Create mock approval chain
- **Files**: `src/backend/mcp/invoice/mock-api.ts`
- **Tests**: Integration tests for all endpoints
- **Acceptance**: Returns valid invoice responses

**STORY-OCR-001: OCR Service** (8 points)
- Integrate Tesseract.js
- Implement receipt text extraction
- Add structured data extraction (vendor, amount, date)
- Implement confidence scoring
- Add file upload validation
- **Files**: `src/backend/services/ocr.service.ts`
- **Tests**: Unit tests with sample receipts
- **Acceptance**: > 85% accuracy on test set

**STORY-NLP-001: NLP Extraction** (5 points)
- Implement invoice data extraction from text
- Add entity recognition (amount, date, vendor, category)
- Handle relative dates ("yesterday", "last week")
- Infer missing fields (currency, category)
- **Files**: `src/backend/services/nlp-extraction.service.ts`
- **Tests**: Unit tests with sample descriptions
- **Acceptance**: Extracts all key fields correctly

### Sprint 1 Deliverables
- [ ] MCP Gateway functional
- [ ] Invoice mock API working
- [ ] OCR service processing receipts
- [ ] NLP extraction working
- [ ] All tests passing
- [ ] Code coverage > 85%

---

## Sprint 2: LangChain Integration (1 week)

### Goals
- Implement LangChain agent with ReAct pattern
- Create agent tools (mcp.*, ocr.*, nlp.*)
- Implement complexity detection algorithm
- Add question generation (max 3)
- Implement SSE streaming for agent events

### Stories

**STORY-AGENT-001: LangChain Agent Core** (8 points)
- Implement ReAct-style agent
- Add intent classification
- Implement complexity detection algorithm
- Add question generation logic
- Integrate with HF models (3 models)
- **Files**: `src/backend/services/langchain-agent.service.ts`
- **Tests**: Unit tests for all agent functions
- **Acceptance**: Agent classifies intent > 95% accuracy

**STORY-AGENT-002: Agent Tools** (5 points)
- Implement mcp.describe() tool
- Implement mcp.validate() tool
- Implement mcp.call() tool
- Implement ocr.process() tool
- Implement nlp.extract() tool
- **Files**: `src/backend/services/agent-tools.service.ts`
- **Tests**: Unit tests for each tool
- **Acceptance**: All tools functional

**STORY-SSE-001: Server-Sent Events** (3 points)
- Implement SSE endpoint
- Add event streaming (analyzing, question, generating, complete)
- Implement heartbeat mechanism
- Add reconnection logic
- **Files**: `src/backend/controllers/sse.controller.ts`
- **Tests**: Integration tests for SSE
- **Acceptance**: Events stream in real-time

### Sprint 2 Deliverables
- [ ] LangChain agent functional
- [ ] All agent tools working
- [ ] SSE streaming working
- [ ] Complexity detection accurate
- [ ] Question generation working (max 3)
- [ ] Integration tests passing

---

## Sprint 3: Web Component Generation (1 week)

### Goals
- Implement component compiler service
- Add TypeScript compilation
- Create dynamic component loader (frontend)
- Implement component sandboxing
- Add dual output mode switching

### Stories

**STORY-COMP-001: Component Compiler** (8 points)
- Implement component parser
- Add TypeScript compilation
- Process templates and styles
- Add security validation
- Implement sandboxing
- **Files**: `src/backend/services/component-compiler.service.ts`
- **Tests**: Unit tests with sample components
- **Acceptance**: Compiles components securely

**STORY-COMP-002: Dynamic Component Loader** (5 points)
- Implement dynamic component loader (Angular)
- Add component factory
- Handle component lifecycle
- Add error handling
- **Files**: `src/frontend/services/dynamic-loader.service.ts`
- **Tests**: E2E tests for component rendering
- **Acceptance**: Loads and renders components

**STORY-COMP-003: Dual Output Mode** (3 points)
- Implement model-based output switching
- GLM-4 → JSON schema
- Qwen/DeepCoder → Web component
- Add mode selection UI
- **Files**: `src/backend/services/output-mode.service.ts`
- **Tests**: Integration tests for both modes
- **Acceptance**: Both modes work correctly

### Sprint 3 Deliverables
- [ ] Component compiler secure
- [ ] Dynamic loader functional
- [ ] Dual output mode working
- [ ] No XSS vulnerabilities
- [ ] E2E tests passing

---

## Sprint 4: Travel MCP Server (2 weeks)

### Goals
- Implement travel workflow
- Add multi-step booking flow
- Create document APIs (passport, payment)
- Handle sub-workflows (flights, hotels, travelers)
- Generate booking payload

### Stories

**STORY-TRAVEL-001: Travel Mock API** (8 points)
- Implement travel booking endpoint
- Add workflow state management
- Create multi-step flow handler
- Implement sub-workflow routing
- **Files**: `src/backend/mcp/travel/mock-api.ts`
- **Tests**: Integration tests for workflow
- **Acceptance**: Multi-step booking works

**STORY-TRAVEL-002: Document APIs** (5 points)
- Implement passport API
- Implement payment methods API
- Add document upload handling
- Create mock document storage
- **Files**: `src/backend/mcp/travel/document-api.ts`
- **Tests**: Unit tests for each API
- **Acceptance**: Returns valid documents

**STORY-TRAVEL-003: Booking Payload** (8 points)
- Implement payload generation
- Add validation logic
- Create human-readable confirmation
- Handle missing fields
- **Files**: `src/backend/mcp/travel/booking-payload.service.ts`
- **Tests**: Unit tests with sample bookings
- **Acceptance**: Generates valid payloads

### Sprint 4 Deliverables
- [ ] Travel workflow complete
- [ ] Document APIs functional
- [ ] Booking payload generation working
- [ ] Multi-step flow working
- [ ] Integration tests passing

---

## Sprint 5: UI & Polish (1 week)

### Goals
- Implement SSE reconnection
- Add comprehensive error handling
- Ensure WCAG 2.1 AA compliance
- Make mobile responsive
- Optimize performance

### Stories

**STORY-UI-001: Error Handling** (5 points)
- Add error boundaries
- Implement retry logic
- Create user-friendly error messages
- Add fallback UI
- **Files**: `src/frontend/services/error-handler.service.ts`
- **Tests**: E2E tests for error scenarios
- **Acceptance**: All errors handled gracefully

**STORY-UI-002: Accessibility** (5 points)
- Add ARIA labels
- Implement keyboard navigation
- Add focus management
- Test with screen readers
- Fix color contrast issues
- **Files**: All frontend components
- **Tests**: Accessibility audit with axe-core
- **Acceptance**: WCAG 2.1 AA compliant

**STORY-UI-003: Performance Optimization** (3 points)
- Optimize bundle size
- Add lazy loading
- Implement caching
- Optimize images
- **Files**: `webpack.config.js`, various components
- **Tests**: Lighthouse performance audit
- **Acceptance**: Lighthouse score > 90

### Sprint 5 Deliverables
- [ ] Error handling complete
- [ ] Accessibility AA compliant
- [ ] Mobile responsive
- [ ] Performance optimized
- [ ] All E2E tests passing

---

## Story File Structure

All stories follow this template:

```
# STORY-XXX-NNN: Story Title

**Sprint**: X  
**Points**: N  
**Priority**: P0/P1/P2  
**Owner**: Developer Agent  
**Status**: Not Started

## Context

### PRD Reference
[Relevant PRD sections embedded here]

### Architecture Reference
[Relevant architecture sections embedded here]

## Requirements

### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2

### Non-Functional Requirements
- [ ] Performance target
- [ ] Security requirement

## Implementation

### Files to Create/Modify
- `path/to/file1.ts`
- `path/to/file2.ts`

### Code Examples
[Actual code patterns from codebase]

### Dependencies
- Story XXX must be complete
- Service YYY must be available

## Testing

### Unit Tests
- Test case 1
- Test case 2

### Integration Tests
- Integration scenario 1

### E2E Tests
- User workflow 1

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] All tests passing
- [ ] Code coverage > 85%

## Definition of Done
- [ ] Code complete
- [ ] Tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to staging
```

---

## Sprint Ceremonies

### Sprint Planning (Start of each sprint)
- Review sprint goals
- Assign stories to developer agents
- Clarify requirements
- Identify dependencies

### Daily Standup (Daily)
- What was completed yesterday
- What will be done today
- Any blockers

### Sprint Review (End of each sprint)
- Demo completed stories
- Gather feedback
- Update backlog

### Sprint Retrospective (End of each sprint)
- What went well
- What could be improved
- Action items for next sprint

---

## Risk Management

### High-Risk Items
1. **HF API Rate Limits** - Mitigation: Implement caching, fallback to demo mode
2. **Component Compilation Security** - Mitigation: Sandboxing, code analysis
3. **OCR Accuracy** - Mitigation: Confidence thresholds, manual review option
4. **SSE Connection Stability** - Mitigation: Reconnection logic, heartbeat

### Dependencies
- HF API availability (external)
- Redis availability (infrastructure)
- GitHub Actions (CI/CD)

---

**Phase 4 Approval Required**: BMad Master must approve this sprint plan before Sprint 1 begins.

**Related Documents**:
- Phase 3 Test Strategy: `/docs/phase3-solutioning/test-strategy-langchain-mcp.md`
- Phase 3 Quality Metrics: `/docs/phase3-solutioning/quality-metrics.md`
- Phase 2 Architecture: `/docs/phase2-planning/architecture.md`
- Phase 2 PRD: `/docs/phase2-planning/prd.md`
- Story Files: `/docs/phase4-implementation/stories/`
