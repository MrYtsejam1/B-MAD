# BMAD-METHOD™ Alignment Document
## LangChain + MCP Architecture Integration

**Version**: 2.0  
**Date**: December 5, 2025  
**Phase**: 2 - Planning  
**Status**: Active

---

## Purpose

This document maps the new LangChain + Anthropic MCP architecture to the BMAD-METHOD™ framework, ensuring proper phase alignment and workflow integration.

---

## BMAD Phase Mapping

### Phase 1: Analysis ✅ COMPLETE
- **Product Brief**: `/docs/phase1-analysis/product-brief.md`
- **Status**: Completed November 11, 2025
- **Deliverables**: Vision, problem statement, initial requirements

### Phase 2: Planning ✅ IN PROGRESS
- **PRD**: `/docs/phase2-planning/prd.md` (needs update for LangChain + MCP)
- **Architecture**: `/docs/phase2-planning/architecture.md` (being updated now)
- **UX Design**: `/docs/phase2-planning/ux-design.md`
- **Status**: Updating with LangChain Agents + MCP Protocol + HF Models

### Phase 3: Solutioning 🔄 NEXT
- **Test Strategy**: `/docs/phase3-solutioning/test-strategy.md` (to be created)
- **Quality Metrics**: `/docs/phase3-solutioning/quality-metrics.md` (to be created)
- **Status**: Pending Phase 2 completion

### Phase 4: Implementation 📋 PLANNED
- **Sprint Plan**: `/docs/phase4-implementation/sprint-plan.md` (to be created)
- **Stories**: `/docs/phase4-implementation/stories/` (to be created)
- **Status**: Awaiting Phase 3 approval

---

## Architecture Evolution

### Original Architecture (Phase 2 v1.0)
- Simple LangChain integration
- Direct LLM calls (OpenAI/Anthropic)
- JSON schema generation only
- Generic form rendering

### New Architecture (Phase 2 v2.0)
- **LangChain Agents**: ReAct-style agents with tools
- **Anthropic MCP Protocol**: Business workflow integration
- **Hugging Face Models**: 3 models via Featherless AI
  - `agentica-org/DeepCoder-14B-Preview:featherless-ai`
  - `zai-org/GLM-4-32B-0414:featherless-ai`
  - `Qwen/Qwen2.5-Coder-7B-Instruct:featherless-ai`
- **Dual Output Modes**: JSON schemas OR web components
- **OCR Integration**: Optional receipt upload
- **NLP Extraction**: Manual invoice entry
- **MCP Servers**: Invoice and Travel workflows

---

## Implementation Roadmap → Sprint Mapping

The original "Implementation Phases 1-6" are now mapped to BMAD Phase 4 Sprints:

| Original Phase | BMAD Sprint | Duration | Focus |
|----------------|-------------|----------|-------|
| Phase 1: MCP Foundation + OCR | Sprint 1 | 2 weeks | MCP Gateway, OCR, Mock APIs |
| Phase 2: LangChain Integration | Sprint 2 | 1 week | Agent tools, complexity detection |
| Phase 3: Web Components | Sprint 3 | 1 week | Component compiler, dynamic loader |
| Phase 4: Travel MCP Server | Sprint 4 | 2 weeks | Travel workflows, document APIs |
| Phase 5: UI & Polish | Sprint 5 | 1 week | SSE, error handling, UX |
| Phase 6: Future Enhancements | Sprint 6+ | Ongoing | Analytics, ML, integrations |

---

## Phase Gate Criteria

### Phase 2 → Phase 3 Gate
- [x] PRD updated with LangChain + MCP requirements
- [x] Architecture document complete with MCP integration
- [x] UX designs finalized
- [ ] No major open questions
- [ ] Technical feasibility validated
- [ ] BMad Master approval

### Phase 3 → Phase 4 Gate
- [ ] Test strategy approved
- [ ] Quality metrics defined
- [ ] Performance benchmarks set
- [ ] First sprint stories ready
- [ ] Development environment ready
- [ ] BMad Master approval

---

## Key Documents Reference

### Phase 2 Documents
- **PRD**: Complete product requirements including MCP scenarios
- **Architecture**: Technical design with LangChain + MCP + HF models
- **UX Design**: User flows for invoice and travel scenarios
- **API Specs**: Mock APIs for invoice and travel servers

### Phase 3 Documents (To Be Created)
- **Test Strategy**: Unit, integration, E2E, performance tests
- **Quality Metrics**: Acceptance criteria, performance targets
- **Security Review**: OCR security, component compilation safety

### Phase 4 Documents (To Be Created)
- **Sprint Plan**: 5-sprint roadmap with story breakdown
- **Context-Engineered Stories**: Complete implementation specs
- **Story Template**: PRD excerpts + Architecture context + Code examples

---

## Success Criteria

### Phase 2 Success
- ✅ Architecture supports all 3 operating modes (Demo, Real AI, MCP)
- ✅ MCP protocol properly specified
- ✅ Dual output modes (JSON + web components) designed
- ✅ OCR and NLP extraction planned
- ✅ Invoice and Travel scenarios fully specified
- ✅ Mock APIs designed
- ✅ Security considerations documented

### Phase 3 Success (Upcoming)
- Test coverage > 80%
- Performance targets defined
- Security review complete
- Quality gates established

### Phase 4 Success (Upcoming)
- All 5 sprints planned
- Stories context-engineered
- No ambiguity in implementation specs
- Developer agents can implement without questions

---

## BMAD Methodology Compliance

✅ **Separation of Concerns**: Architecture properly layered  
✅ **Phase Gates**: Clear criteria for progression  
✅ **Documentation**: Comprehensive specs in each phase  
✅ **Context Engineering**: Stories will embed PRD + Architecture  
✅ **Agent Coordination**: BMad Master oversees all phases  
✅ **Quality Focus**: Test strategy before implementation  
✅ **Iterative Development**: Sprint-based Phase 4 execution

---

**Next Steps**: 
1. Complete Phase 2 architecture update
2. Create Phase 3 test strategy
3. Create Phase 4 sprint plan
4. Obtain BMad Master approval for Phase 2 → Phase 3 transition
