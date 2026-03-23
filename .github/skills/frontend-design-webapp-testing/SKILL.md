---
name: frontend-design-webapp-testing
description: "Design and validate frontend webapp experiences end-to-end. Use when building or refactoring UI pages/components, improving UX, and verifying behavior with responsive, accessibility, and interaction tests. Trigger words: frontend design, UI redesign, webapp testing, visual QA, responsive checks, smoke test."
argument-hint: "Describe screen/feature, target users, constraints, and acceptance criteria."
user-invocable: true
disable-model-invocation: false
---

# Frontend Design and Webapp Testing

## Outcome
Produce intentional, non-generic UI updates that are functional, responsive, and validated through practical testing.

## When to Use
- Creating new pages, flows, or reusable UI components.
- Redesigning existing views that feel generic, cluttered, or inconsistent.
- Fixing frontend regressions with visual and interaction impact.
- Preparing a UI change for merge with objective quality checks.

## Inputs to Collect First
1. Feature goal and user action to optimize.
2. Constraints: existing design system, brand requirements, deadlines.
3. Technical scope: page-level, component-level, or cross-flow.
4. Data states required: loading, empty, error, success.

## Workflow
1. Define intent and guardrails.
   - Capture primary user task and one success metric.
   - List non-negotiables (tokens, spacing rules, existing components).
2. Map states before coding.
   - Sketch content hierarchy and interaction states.
   - Include desktop and mobile behaviors from the start.
3. Implement visual direction.
   - Choose a deliberate typography and color direction.
   - Use tokens/variables for color, spacing, and motion.
   - Prefer clear visual contrast over decorative noise.
4. Implement interaction behavior.
   - Cover keyboard flow, focus states, and actionable feedback.
   - Add inline validation and meaningful empty/error messaging.
5. Run functional checks.
   - Validate forms, navigation, filters, and API error handling.
   - Verify no console errors and no obvious runtime warnings.
6. Run visual and responsive checks.
   - Validate at common breakpoints (mobile, tablet, desktop).
   - Confirm spacing, overflow, truncation, and tap targets.
7. Run automated UI tests with Playwright.
   - Run existing end-to-end suite for impacted flows first.
   - Add or update tests for any changed user-critical interaction.
   - Capture traces/screenshots for failed assertions.
8. Run accessibility and quality checks.
   - Validate heading structure, labels, and color contrast.
   - Confirm keyboard-only operation for critical flows.
9. Finalize with evidence.
   - Capture before/after notes and key test results.
   - Document known limitations and follow-up tasks.

## Decision Points
- If the project has an established design system:
  - Preserve component patterns and naming.
  - Limit changes to scoped improvements and consistency fixes.
- If no design system exists:
  - Define local tokens first, then implement components.
  - Avoid ad hoc styles spread across files.
- If Playwright is configured in the project:
   - Run targeted tests for impacted routes first, then broad regression.
- If Playwright is not configured yet:
   - Bootstrap Playwright and add at least one happy-path smoke test per changed flow.

## Completion Checklist
- UI supports loading, empty, error, and success states.
- Layout is stable on mobile and desktop.
- Core user path is keyboard-accessible.
- No new lint/type errors in changed files.
- Playwright tests pass for changed flow.
- Change summary includes what changed and how it was validated.

## Output Format (for agent responses)
1. What was changed and why.
2. Files touched and key behavior updates.
3. Test evidence (manual and/or automated).
4. Remaining risks and next actions.

## Suggested Prompt Examples
- /frontend-design-webapp-testing Redesign the event creation form for faster completion on mobile.
- /frontend-design-webapp-testing Improve dashboard readability and validate empty/loading/error states.
- /frontend-design-webapp-testing Refactor header and navigation, then run responsive and keyboard checks.