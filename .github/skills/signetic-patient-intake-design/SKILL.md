---
name: signetic-patient-intake-design
description: 'Design, extend, or review the Signetic AI Patient Intake prototype. Use when modifying the upload, extraction, issue resolution, patient matching, document sidebar/viewer, intake review, completion, next-action, AI summary, recommended services, or DME experience in design2-ai-workspace.'
argument-hint: 'Describe the patient intake UI or workflow change'
user-invocable: true
disable-model-invocation: false
---

# Signetic Patient Intake Design

Use this skill to preserve the product and interaction decisions established for the AI-powered patient intake experience in `design2-ai-workspace/`.

## Product Intent

Build a calm, document-centric intake workspace that uses AI to do routine work and asks users only about genuine exceptions. Minimize cognitive load, avoid unnecessary choices, and make AI decisions understandable without making the experience feel like a chatbot.

The user should move through three explicit phases:

1. Upload documents.
2. Watch extraction and resolve required matches.
3. Review and correct the completed intake.

After review is completed, transition to a focused handoff that explains the intake and recommends the next operational action.

## Audience and Tone

- Design for healthcare operations staff doing repeated, accuracy-sensitive work.
- Favor concise, factual language over marketing language.
- Describe AI output as a useful starting point, not a final clinical or operational decision.
- Clearly distinguish automated decisions, required user decisions, and optional actions.
- Avoid alarmist language when a calm review cue is sufficient.
- Use sentence case throughout.

## Visual Direction

- Preserve the light Signetic palette and restrained operational style.
- Use Segoe UI-like typography.
- Use white surfaces, pale blue supporting areas, dark teal headings, blue actions, green success, amber review, and red only for missing required data.
- Keep cards at 6px radius or less.
- Do not nest cards inside cards.
- Avoid decorative gradients, orbs, oversized marketing typography, and generic dashboard composition.
- Prefer thin dividers, spacing, and subtle tinted surfaces over repeated bordered boxes.
- Use Lucide icons for controls and statuses.
- Keep letter spacing at zero except established uppercase eyebrow labels.

Core color intent:

- Ink: `#07426f`
- Primary blue: `#0078d4`
- Pale blue: `#eaf4fb`
- Green: `#107c10`
- Amber: `#a15c00`
- Red: `#b42318`

Follow existing CSS variables and local component patterns rather than introducing a second visual system.

## Application Structure

The prototype is a standalone HTML/CSS/JavaScript application:

- `design2-ai-workspace/index.html`
- `design2-ai-workspace/styles.css`
- `design2-ai-workspace/app.js`
- `design2-ai-workspace/assets/`

Do not add a framework or build system unless explicitly requested. Preserve the phase state machine:

- `upload`
- `extraction`
- `review`

Keep behavior driven by application state and DOM APIs. Do not create visual-only states that disagree with `state`.

## Header

- Show only the product name, **Patient Intake**.
- Do not show the Signetic wordmark or logo in this prototype header.
- Keep the document-sidebar toggle at the far top left, before the title.
- The toggle is a compact square icon button, not a text-heavy Documents button.
- Use panel-open/panel-close icons to communicate its collapsible behavior.
- Show a small document-count badge on the toggle.
- Update `aria-expanded`, label, title, and icon when the drawer opens or closes.
- Hide the toggle before the review phase, when the document drawer is not useful.
- Keep review status and the primary completion action on the right.
- Ensure header controls do not overlap at mobile widths.

## Upload Phase

- Start with **Upload patient documents** centered in the entire available viewport.
- Do not reserve hidden review-viewer space during upload.
- Accept prescriptions, insurance cards, referrals, and clinical records.
- Uploading or adding samples only queues documents.
- Do not begin extraction until the user explicitly selects **Extract**.
- Keep the empty state focused; do not show review controls or sidebars.
- Use a clear drop zone, a compact queue, **Add sample documents**, and **Extract**.

## Extraction Phase

- Use a two-column layout on desktop:
  - Extraction progress centered in the remaining left workspace.
  - Required issue resolution in a right panel.
- Stack progress and issues on mobile.
- Show staged progress through reading, extracting, patient matching, duplicate checking, and conflict resolution.
- Let users resolve issues while extraction continues when possible.
- Resolve issues sequentially:
  1. Select an existing patient or create a new patient.
  2. Decide how same or similar documents should be handled.
- Show enough patient detail to make a safe match: name, DOB, patient ID, address, phone, match reason, and confidence.
- Keep document choices specific and understandable, such as use existing, keep upload, replace existing, or add as new.
- Transition to review only after extraction completes and all required issues are resolved.

## Existing Patient Behavior

- Selecting an existing patient sets the linked-patient state.
- In review, reveal the patient's stored documents in the left sidebar.
- Show uploaded files and existing files as separate labeled lists.
- Existing files may be added to the current intake.
- Clearly show whether an existing file was extracted previously or still needs extraction.
- Include existing files in Preview/Gallery when a patient is linked.
- Include uploaded plus existing files in the header count for a linked patient.
- Choosing a new patient hides the existing-document section and removes existing files from the count and viewer availability.
- Keep all patient-selection paths synchronized. Extraction-phase selection and review-phase linking must produce the same sidebar state.

## Left Document Sidebar

- Use a slide-in drawer rather than a permanently reserved left column.
- Open it from the compact top-left header toggle.
- Close it using the header toggle, the drawer collapse control, or the scrim.
- Do not use a floating edge tab; it overlaps page content.
- Keep uploaded documents, existing documents, extraction status, and related source actions in this drawer.
- Keep the drawer usable without obscuring inaccessible controls on mobile.

## Review Phase

- Preserve a document-centric split view:
  - Intake review in the main workspace.
  - Source document viewer on the right.
- Keep the right viewer resizable and collapsible on desktop.
- Support Preview and Gallery modes with one shared selected-document state.
- Use real-looking local document images rather than text-only placeholder previews.
- Keep extracted values editable in place.
- Use status labels for reviewed, needs review, and missing data.
- Use the review popover to navigate directly to unresolved fields.
- Enable **Looks good** only after all required items are resolved.
- Avoid unnecessary page navigation; corrections should happen in context.

## Review Guidance

Use one compact guidance treatment, not two stacked or nested sections.

Approved structure:

- Headline: **Your intake is mostly done**
- Supporting text: **AI extracted the details and resolved conflicts. Review each section and correct anything that needs attention.**

Design it as one subtle pale-blue surface with a single blue edge and one AI icon. Do not add a second shaded note, inset box, or repeated warning row.

## Completion Behavior

Current completion changes the header action to **Intake completed**. When extending this flow, do not append another dashboard below the completed form.

Instead, after the user confirms completion:

1. Replace the center review content with a focused post-intake handoff view.
2. Keep the source drawer and right document viewer available as supporting evidence.
3. Offer a clear way to return to the reviewed intake.
4. Preserve patient and document context when moving into the selected next workflow.

## Post-Completion Handoff

The handoff should present information in this order:

1. Completion status and patient identity.
2. AI intake summary.
3. One recommended next action with rationale.
4. Secondary available actions.
5. Recommended services and DME item categories.

Do not turn this into a generic dashboard or a grid of equal cards. Use an unframed page layout with one dominant action area and restrained supporting sections.

### AI Intake Summary

- Summarize the intake, not every extracted field.
- Explain the patient context, coverage status, prescription/order readiness, important exceptions, and whether a related order exists.
- Keep it concise and scannable.
- State that the summary is based on reviewed intake data.
- Avoid presenting AI judgment as clinical certainty.

Example content pattern:

> Ashlynn has active coverage and a prescription supporting PAP therapy for obstructive sleep apnea. An existing order for the same therapy may be eligible for refill.

### Next Actions

The available actions are:

- **Start pre-check**
- **Create order without pre-check**
- **Refill existing order**

Rules:

- Recommend one action based on intake context.
- Give the recommendation the strongest visual emphasis.
- Explain why it is recommended in one sentence.
- Keep the other valid actions visible but secondary.
- Do not force all three actions to have equal visual weight.
- Use the exact operational distinction **Create order without pre-check**, not ambiguous shorthand such as skip.
- If an active matching order exists, prefer **Refill existing order** and identify the order.
- If payer or qualification validation is needed, prefer **Start pre-check**.
- If pre-check is unnecessary or explicitly bypassed, offer **Create order without pre-check** with appropriate confirmation.

### Scenario Classification

Do not hard-code the handoff around one patient story. Model post-intake recommendations as scenario data so more cases can be added without redesigning the UI. Each scenario should define:

- Patient and intake context.
- Documents and evidence received.
- Prior therapy, equipment, and order relationship.
- Recommended next action and one-sentence rationale.
- Other valid actions.
- Recommended services and DME item categories.
- Important uncertainty or validation needs.

Classify the intake using these broad patterns:

- **Refill or replacement:** Existing patient, related fulfilled order or active therapy, and a request to replace or replenish an item. Recommend **Refill existing order** when the prior order supports the requested item.
- **Pre-check needed:** Coverage, qualification, documentation, replacement timing, or payer rules need validation before an order should proceed. Recommend **Start pre-check**.
- **New order:** No suitable existing order, or the therapy/equipment request is materially new. Recommend **Create order without pre-check** only when bypassing pre-check is operationally appropriate.

The recommendation engine must consider evidence across documents and intake context rather than matching one code or keyword. A supplied HCPCS code may support the explanation but must not determine the overall recommendation by itself.

### Reference Refill Scenario

Use this scenario when designing and testing the refill handoff:

- Patient: Maria, an existing patient.
- Prior therapy: CPAP machine and full-face mask supplied three months ago.
- Current need: Mask cushion is worn and leaking.
- Documents: Insurance card, prior order paperwork, and CPAP usage report.
- Recommended action: **Refill existing order**.
- Rationale: A recent related PAP order exists and the request is for a replacement component, not a new therapy setup.
- Recommended service: Review fit and leakage; provide mask-fit support if needed.
- Recommended DME items: Full-face mask cushion as the primary item; show other supplies only when supported by the intake.
- Validation note: Coverage timing and refill eligibility may still require a pre-check. Present **Start pre-check** as an available alternative when eligibility is uncertain.

This is a reasoning example only, not a patient or special-case screen. Never replace the active intake patient with Maria when demonstrating this rule. Apply the refill logic to the active patient only when their reviewed intake contains equivalent evidence.

### Patient and Scenario Continuity

- Keep the same patient identity and reviewed intake from upload through completion and handoff.
- Infer one recommendation from the active patient's reviewed intake data.
- Do not expose refill, pre-check, and new-order as scenario tabs.
- Do not change patient names or intake evidence when a user considers another action.
- Show the recommended action prominently and only the other actions that are valid for this intake.
- Users choose a next action; they do not choose a patient scenario.
- Keep scenario fixtures in code or tests when multiple outcomes need demonstration, not in the production-facing handoff UI.

### Recommended Services and DME

- Recommend at the overall intake level, not as a per-HCPCS table.
- Introduce the area with an explicit **Recommended for this intake** label and short evidence-based explanation.
- Separate recommendations into human-readable **Services** and **DME items** within one coherent recommendation section.
- Make every listed item visibly recommended through hierarchy, iconography, or a restrained recommendation marker; do not present them as generic plain lists.
- Examples of services: PAP setup and education, compliance monitoring, respiratory therapist follow-up.
- Examples of DME items: CPAP device, heated humidifier, mask, tubing, and replacement supplies.
- HCPCS may remain supporting metadata in order details, but it must not drive the recommendation UI.
- Explain the intake evidence behind recommendations when useful.
- Avoid implying a final prescription or coverage determination unless confirmed.

## Responsive Behavior

- At desktop widths, maintain clear main-content and right-context regions.
- At mobile widths, stack extraction issues and use overlay drawers/viewers.
- Keep the header title, sidebar toggle, review control, and completion action from overlapping.
- Ensure all text wraps within its container.
- Avoid horizontal overflow at 390px width.
- Fixed-format controls must have stable dimensions so counts, icons, and labels do not shift layout.

## Interaction and Accessibility

- Use buttons for commands and labels for file drop/input areas.
- Give icon-only controls accessible labels and tooltips.
- Keep `aria-expanded`, `aria-pressed`, and `hidden` synchronized with visible state.
- Preserve keyboard access for viewer resizing and all primary actions.
- Use live status messaging for extraction, saved decisions, and completion.
- Do not rely on color alone for status.

## Implementation Procedure

When modifying this experience:

1. Identify the owning phase or state transition in `app.js`.
2. Reuse existing markup, state, helpers, and CSS variables.
3. Make the smallest behaviorally complete edit.
4. Keep review, drawer, and viewer state synchronized.
5. Prefer additive, narrowly scoped CSS because the stylesheet contains compressed legacy sections.
6. Validate JavaScript with `node --check app.js`.
7. Check editor diagnostics for every touched file.
8. Test the relevant phase at desktop and 390px mobile widths.
9. Verify no horizontal overflow, text overlap, hidden interactive remnants, or inaccessible controls.
10. For canvas or image-heavy changes, verify the actual rendered asset rather than only DOM presence.

## Acceptance Checklist

Before finishing a related change, confirm:

- The upload state remains centered across the full viewport.
- Extraction content recenters beside the right issue panel.
- Existing-patient files appear only when a patient is linked.
- The top-left drawer control opens and closes the sidebar and reports its state accessibly.
- The floating drawer tab has not been reintroduced.
- Review guidance remains one concise section.
- Preview and Gallery share selection state.
- The right viewer remains collapsible and resizable where appropriate.
- Completion exposes a clear next step without burying the user in equal-priority choices.
- Recommendations are intake-level Services and DME items, not per-HCPCS cards.
- Desktop and mobile layouts have no horizontal overflow or incoherent overlap.
