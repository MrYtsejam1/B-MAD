# UX Design Documentation
## Generative UI Adaptive Form System

**Date**: November 11, 2025  
**Version**: 1.0  
**Phase**: 2 - Planning  
**Status**: Draft  
**Owner**: UX Designer Agent  
**Reviewers**: BMad Master, Product Manager, Developer Agent 1 (Frontend)

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 11, 2025 | UX Designer Agent | Initial UX design documentation |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Principles](#design-principles)
3. [User Flows](#user-flows)
4. [Wireframes](#wireframes)
5. [Component Design](#component-design)
6. [Interaction Patterns](#interaction-patterns)
7. [Responsive Design](#responsive-design)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [Design System](#design-system)
10. [Animation and Transitions](#animation-and-transitions)
11. [Error States](#error-states)
12. [Loading States](#loading-states)
13. [Success States](#success-states)
14. [Design Specifications](#design-specifications)

---

## Executive Summary

This document defines the user experience design for the Generative UI Adaptive Form System. The design focuses on creating intuitive, accessible, and delightful form experiences that adapt to user context and input.

**Design Goals**:
- **Intuitive**: Users understand what to do without instructions
- **Efficient**: Minimize time and effort to complete forms
- **Accessible**: WCAG 2.1 AA compliant for all users
- **Adaptive**: Forms respond intelligently to user input
- **Delightful**: Smooth interactions and helpful feedback

**Key UX Innovations**:
- Progressive disclosure of fields based on user input
- Inline validation with helpful error messages
- Smart defaults to reduce user effort
- Clear visual hierarchy and focus management
- Responsive design for all devices

---

## Design Principles

### 1. Clarity Over Cleverness

**Principle**: Make the interface obvious and predictable.

**Application**:
- Clear, descriptive labels for all fields
- Standard form patterns users recognize
- Avoid hidden functionality
- Explicit actions (no mystery meat navigation)

**Example**:
```
✅ Good: "Email Address" label with "you@example.com" placeholder
❌ Bad: Icon-only field with no label
```

---

### 2. Progressive Disclosure

**Principle**: Show information when users need it, not all at once.

**Application**:
- Start with essential fields only
- Reveal additional fields based on user input
- Use conditional logic to hide irrelevant fields
- Provide "Show more" options for advanced settings

**Example**:
```
Initial: Name, Email, Message
After selecting "Business inquiry": Company Name, Industry (revealed)
```

---

### 3. Immediate Feedback

**Principle**: Respond to user actions instantly.

**Application**:
- Real-time validation as users type
- Visual feedback on field focus
- Loading states for async operations
- Success indicators when validation passes

**Example**:
```
User types email → Validates format → Shows checkmark or error
User clicks submit → Button shows loading → Shows success message
```

---

### 4. Forgiveness

**Principle**: Help users recover from errors easily.

**Application**:
- Clear, actionable error messages
- Preserve user input on errors
- Provide suggestions for fixing errors
- Allow easy correction without starting over

**Example**:
```
Error: "Email format is invalid"
Help: "Please enter a valid email like you@example.com"
Action: Focus on email field, preserve entered text
```

---

### 5. Accessibility First

**Principle**: Design for all users from the start.

**Application**:
- Keyboard navigation support
- Screen reader compatibility
- Sufficient color contrast (4.5:1 minimum)
- Focus indicators clearly visible
- ARIA labels and roles

**Example**:
```
<label for="email">Email Address</label>
<input 
  id="email" 
  type="email" 
  aria-required="true"
  aria-describedby="email-help email-error"
/>
```

---

### 6. Mobile First

**Principle**: Design for mobile, enhance for desktop.

**Application**:
- Touch-friendly targets (44x44px minimum)
- Single-column layouts on mobile
- Simplified navigation
- Appropriate input types (email, tel, date)

---

## User Flows

### Flow 1: Developer Generates Form

**Actors**: Application Developer

**Steps**:
1. Developer calls API with form description
2. System generates form schema using LangChain
3. System returns schema to developer
4. Developer integrates form component
5. Form renders for end users

**Success Criteria**:
- Schema generated in <2 seconds
- Schema is valid and complete
- Developer can integrate easily

---

### Flow 2: End User Completes Form

**Actors**: End User (Form Filler)

**Steps**:

```
1. User lands on page with form
   ↓
2. User reads form title and description
   ↓
3. User focuses on first field
   ↓
4. User enters data
   ↓
5. System validates in real-time
   ├─ Valid: Show success indicator
   └─ Invalid: Show error message
   ↓
6. User moves to next field (Tab or click)
   ↓
7. Conditional fields appear/disappear based on input
   ↓
8. User completes all required fields
   ↓
9. User clicks Submit button
   ↓
10. System validates entire form
    ├─ Valid: Submit data
    │   ↓
    │   Show loading state
    │   ↓
    │   Show success message
    │   ↓
    │   Clear form or redirect
    │
    └─ Invalid: Show error summary
        ↓
        Focus first error field
        ↓
        User corrects errors
        ↓
        Return to step 9
```

**Success Criteria**:
- User completes form in <3 minutes
- <5% error rate on submission
- User understands all error messages
- User feels confident about submission

---

### Flow 3: User Encounters Validation Error

**Actors**: End User

**Steps**:

```
1. User enters invalid data (e.g., "invalid-email")
   ↓
2. User moves focus away from field (blur event)
   ↓
3. System validates field
   ↓
4. System shows error message below field
   ↓
5. Field border turns red
   ↓
6. Error icon appears next to field
   ↓
7. User reads error message
   ↓
8. User corrects input
   ↓
9. System re-validates on blur
   ↓
10. Error disappears, success indicator shows
    ↓
11. Field border turns green
    ↓
12. Checkmark icon appears
```

**Success Criteria**:
- Error appears within 500ms of blur
- Error message is clear and actionable
- User can easily correct the error
- Success state is visually distinct

---

## Wireframes

### Wireframe 1: Basic Form Layout (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │              Contact Us                           │ │
│  │                                                   │ │
│  │  Please fill out the form below and we'll get    │ │
│  │  back to you as soon as possible.                │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Full Name *                                      │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ John Doe                                    │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │  ✓ Looks good!                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Email Address *                                  │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ john@example.com                            │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │  ✓ Valid email address                           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Phone Number                                     │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ +1 (555) 123-4567                           │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │  Optional - We'll call if we need more info     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Message *                                        │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ I would like to inquire about...            │ │ │
│  │  │                                             │ │ │
│  │  │                                             │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │  Minimum 10 characters (45/1000)                 │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Submit Message                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Clear form title and description
- Required fields marked with asterisk (*)
- Success indicators (✓) for valid fields
- Help text below fields
- Character counter for textarea
- Prominent submit button

---

### Wireframe 2: Form with Validation Errors

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  ⚠ Please fix the following errors:              │ │
│  │  • Email address is invalid                       │ │
│  │  • Message is too short (minimum 10 characters)   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Full Name *                                      │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ John Doe                                    │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  │  ✓ Looks good!                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Email Address *                                  │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ invalid-email                               │ │ │ ← Red border
│  │  └─────────────────────────────────────────────┘ │ │
│  │  ✗ Please enter a valid email (e.g., you@ex...  │ │ ← Red text
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Message *                                        │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ Hello                                       │ │ │ ← Red border
│  │  └─────────────────────────────────────────────┘ │ │
│  │  ✗ Message must be at least 10 characters (5/10)│ │ ← Red text
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Submit Message                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Error summary at top of form
- Red borders on invalid fields
- Error icons (✗) and messages in red
- Specific, actionable error messages
- Submit button remains enabled (allows retry)

---

### Wireframe 3: Adaptive Form (Conditional Fields)

**Initial State**:
```
┌─────────────────────────────────────────────────────────┐
│  Inquiry Type *                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ▼ Select inquiry type...                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Other fields hidden until selection made]             │
└─────────────────────────────────────────────────────────┘
```

**After Selecting "Business Inquiry"**:
```
┌─────────────────────────────────────────────────────────┐
│  Inquiry Type *                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ▼ Business Inquiry                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │ ← Animated in
│  │  Company Name *                                   │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │                                             │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │ ← Animated in
│  │  Industry *                                       │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │ ▼ Select industry...                        │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Message *                                        │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │                                             │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key Elements**:
- Fields appear smoothly with animation
- New fields inserted in logical order
- Required fields marked appropriately
- Form height adjusts automatically

---

### Wireframe 4: Mobile Layout

```
┌───────────────────────┐
│                       │
│   Contact Us          │
│                       │
│   Please fill out     │
│   the form below...   │
│                       │
│ ┌───────────────────┐ │
│ │ Full Name *       │ │
│ │ ┌───────────────┐ │ │
│ │ │               │ │ │
│ │ └───────────────┘ │ │
│ └───────────────────┘ │
│                       │
│ ┌───────────────────┐ │
│ │ Email Address *   │ │
│ │ ┌───────────────┐ │ │
│ │ │               │ │ │
│ │ └───────────────┘ │ │
│ └───────────────────┘ │
│                       │
│ ┌───────────────────┐ │
│ │ Phone Number      │ │
│ │ ┌───────────────┐ │ │
│ │ │               │ │ │
│ │ └───────────────┘ │ │
│ └───────────────────┘ │
│                       │
│ ┌───────────────────┐ │
│ │ Message *         │ │
│ │ ┌───────────────┐ │ │
│ │ │               │ │ │
│ │ │               │ │ │
│ │ └───────────────┘ │ │
│ └───────────────────┘ │
│                       │
│ ┌───────────────────┐ │
│ │  Submit Message   │ │
│ └───────────────────┘ │
│                       │
└───────────────────────┘
```

**Key Differences from Desktop**:
- Single column layout
- Full-width fields
- Larger touch targets
- Simplified spacing
- Sticky submit button (optional)

---

## Component Design

### Component 1: Text Input Field

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│  Label Text *                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Placeholder text...                               │ │
│  └───────────────────────────────────────────────────┘ │
│  Help text appears here                                 │
└─────────────────────────────────────────────────────────┘
```

**States**:

1. **Default**:
   - Border: 1px solid #D1D5DB (gray-300)
   - Background: #FFFFFF (white)
   - Text: #111827 (gray-900)
   - Label: #374151 (gray-700)

2. **Focus**:
   - Border: 2px solid #3B82F6 (blue-500)
   - Box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1)
   - Outline: none

3. **Valid** (after validation):
   - Border: 1px solid #10B981 (green-500)
   - Icon: ✓ (checkmark) in green
   - Help text: "Looks good!" in green

4. **Invalid** (after validation):
   - Border: 2px solid #EF4444 (red-500)
   - Icon: ✗ (x mark) in red
   - Error message: Red text below field

5. **Disabled**:
   - Border: 1px solid #E5E7EB (gray-200)
   - Background: #F9FAFB (gray-50)
   - Text: #9CA3AF (gray-400)
   - Cursor: not-allowed

**Specifications**:
- Height: 44px (touch-friendly)
- Padding: 12px 16px
- Border-radius: 6px
- Font-size: 16px (prevents zoom on iOS)
- Line-height: 1.5
- Transition: all 0.2s ease

---

### Component 2: Select Dropdown

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│  Label Text *                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Select option...                              ▼  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Dropdown Open**:
```
┌─────────────────────────────────────────────────────────┐
│  Label Text *                                           │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Select option...                              ▲  │ │
│  └───────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Option 1                                          │ │
│  │ Option 2                                     ✓    │ │ ← Selected
│  │ Option 3                                          │ │
│  │ Option 4                                          │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Searchable for >10 options
- Keyboard navigation (arrow keys)
- Clear selection button (×)
- Loading state for dynamic options
- Multi-select support (checkboxes)

---

### Component 3: Checkbox Group

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│  Select all that apply *                                │
│                                                         │
│  ☑ Option 1                                             │
│  ☐ Option 2                                             │
│  ☑ Option 3                                             │
│  ☐ Option 4                                             │
│                                                         │
│  At least one option must be selected                   │
└─────────────────────────────────────────────────────────┘
```

**Specifications**:
- Checkbox size: 20x20px
- Touch target: 44x44px (padding around checkbox)
- Spacing between options: 12px
- Label clickable (not just checkbox)
- Keyboard accessible (Space to toggle)

---

### Component 4: Radio Button Group

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│  Select one option *                                    │
│                                                         │
│  ◉ Option 1                                             │
│  ○ Option 2                                             │
│  ○ Option 3                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Specifications**:
- Radio size: 20x20px
- Touch target: 44x44px
- Only one selectable at a time
- First option selected by default (optional)
- Keyboard accessible (arrow keys to navigate)

---

### Component 5: Date Picker

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│  Date of Birth *                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ MM/DD/YYYY                                    📅  │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Calendar Popup**:
```
┌─────────────────────────────────────────────────────────┐
│  ◀  November 2025  ▶                                    │
│  ─────────────────────────────────────────────────────  │
│  Su  Mo  Tu  We  Th  Fr  Sa                             │
│                      1   2                              │
│   3   4   5   6   7   8   9                             │
│  10  11  12  13  14  15  16                             │
│  17  18  19  20  21  22  23                             │
│  24  25  26  27  28  29  30                             │
│                                                         │
│  [Today]  [Clear]                                       │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Calendar popup on click
- Keyboard input supported (MM/DD/YYYY)
- Min/max date constraints
- Today button for quick selection
- Clear button to reset
- Mobile-friendly date picker on mobile devices

---

### Component 6: File Upload

**Visual Design (Empty)**:
```
┌─────────────────────────────────────────────────────────┐
│  Upload Document *                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │                                                   │ │
│  │           📁 Drag and drop file here              │ │
│  │              or click to browse                   │ │
│  │                                                   │ │
│  │        Accepted: PDF, DOC, DOCX (Max 10MB)        │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**With File Selected**:
```
┌─────────────────────────────────────────────────────────┐
│  Upload Document *                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │  📄 document.pdf (2.5 MB)                    ✓  ✗│ │
│  └───────────────────────────────────────────────────┘ │
│  ✓ File uploaded successfully                           │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Drag and drop support
- Click to browse
- File type validation
- File size validation
- Upload progress bar
- Preview for images
- Remove file button (✗)

---

## Interaction Patterns

### Pattern 1: Inline Validation

**Trigger**: User leaves field (blur event)

**Behavior**:
1. Wait for blur event
2. Validate field value
3. Show result within 500ms
4. If invalid: Show error message and icon
5. If valid: Show success indicator
6. Update submit button state

**Visual Feedback**:
- Border color change (green/red)
- Icon appearance (✓/✗)
- Message below field
- Smooth transition (200ms)

---

### Pattern 2: Conditional Field Display

**Trigger**: User changes value in trigger field

**Behavior**:
1. Detect value change
2. Evaluate conditional logic
3. Show/hide dependent fields
4. Animate transition (300ms slide)
5. Update form validation
6. Adjust form height

**Animation**:
```css
.field-enter {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.field-enter-active {
  opacity: 1;
  transform: translateY(0);
  max-height: 200px;
  transition: all 300ms ease-out;
}

.field-exit {
  opacity: 1;
  max-height: 200px;
}

.field-exit-active {
  opacity: 0;
  max-height: 0;
  transition: all 300ms ease-in;
}
```

---

### Pattern 3: Form Submission

**Trigger**: User clicks Submit button

**Behavior**:
1. Validate entire form
2. If invalid:
   - Show error summary at top
   - Scroll to first error
   - Focus first error field
   - Shake animation on errors
3. If valid:
   - Disable submit button
   - Show loading spinner
   - Submit data to API
   - On success: Show success message
   - On error: Show error message, re-enable button

**Loading State**:
```
┌─────────────────────────────────────────────────┐
│  ⟳ Submitting...                                │
└─────────────────────────────────────────────────┘
```

**Success State**:
```
┌─────────────────────────────────────────────────┐
│  ✓ Form submitted successfully!                 │
└─────────────────────────────────────────────────┘
```

---

### Pattern 4: Smart Defaults

**Trigger**: Field receives focus or form loads

**Behavior**:
1. Check for context data
2. If available, pre-fill field
3. Show as editable (not disabled)
4. User can override
5. Validate pre-filled values

**Example**:
- Email field pre-filled if user is logged in
- Country pre-filled based on IP geolocation
- Date defaults to today for "Start Date"

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | <768px | Single column, full-width fields |
| Tablet | 768px-1024px | 1-2 columns, optimized spacing |
| Desktop | >1024px | Multi-column, max-width 800px |

---

### Mobile Optimizations

**Touch Targets**:
- Minimum 44x44px for all interactive elements
- Increased padding around clickable areas
- Larger font sizes (16px minimum)

**Input Types**:
```html
<input type="email">    <!-- Shows @ key on mobile keyboard -->
<input type="tel">      <!-- Shows numeric keypad -->
<input type="date">     <!-- Shows native date picker -->
<input type="number">   <!-- Shows numeric keyboard -->
```

**Viewport Meta Tag**:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

**Layout Adjustments**:
- Single column layout
- Full-width fields
- Sticky submit button at bottom
- Reduced spacing between fields
- Larger tap targets

---

### Tablet Optimizations

**Layout**:
- 2-column layout for short fields (name, email)
- Single column for long fields (textarea)
- Side-by-side buttons

**Example**:
```
┌─────────────────────────────────────────────────┐
│  First Name *        Last Name *                │
│  ┌──────────────┐    ┌──────────────┐          │
│  │              │    │              │          │
│  └──────────────┘    └──────────────┘          │
│                                                 │
│  Email Address *                                │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

**Perceivable**:
- ✅ Text alternatives for non-text content
- ✅ Color contrast ratio ≥ 4.5:1 for normal text
- ✅ Color contrast ratio ≥ 3:1 for large text
- ✅ Content not conveyed by color alone
- ✅ Text resizable up to 200%

**Operable**:
- ✅ All functionality available via keyboard
- ✅ No keyboard traps
- ✅ Sufficient time to complete forms
- ✅ Clear focus indicators
- ✅ Skip navigation links

**Understandable**:
- ✅ Clear, simple language
- ✅ Consistent navigation
- ✅ Predictable behavior
- ✅ Input assistance (labels, instructions, errors)
- ✅ Error prevention and correction

**Robust**:
- ✅ Valid HTML
- ✅ Proper ARIA attributes
- ✅ Compatible with assistive technologies

---

### Keyboard Navigation

**Tab Order**:
1. Form fields (top to bottom)
2. Submit button
3. Cancel/Reset button (if present)

**Keyboard Shortcuts**:
- `Tab`: Move to next field
- `Shift+Tab`: Move to previous field
- `Enter`: Submit form (when on submit button)
- `Space`: Toggle checkbox/radio
- `Arrow keys`: Navigate select options
- `Esc`: Close dropdown/modal

---

### Screen Reader Support

**ARIA Labels**:
```html
<label for="email">Email Address</label>
<input 
  id="email"
  type="email"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="email-help email-error"
/>
<span id="email-help">We'll never share your email</span>
<span id="email-error" role="alert" aria-live="polite"></span>
```

**ARIA Live Regions**:
```html
<!-- Error messages -->
<div role="alert" aria-live="assertive">
  Please fix the following errors...
</div>

<!-- Success messages -->
<div role="status" aria-live="polite">
  Form submitted successfully!
</div>

<!-- Loading states -->
<div role="status" aria-live="polite" aria-busy="true">
  Submitting form...
</div>
```

---

### Focus Management

**Focus Indicators**:
```css
input:focus,
button:focus,
select:focus {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

**Focus on Error**:
```typescript
// Focus first error field
const firstErrorField = document.querySelector('[aria-invalid="true"]');
if (firstErrorField) {
  firstErrorField.focus();
}
```

---

## Design System

### Color Palette

**Primary Colors**:
- Primary: #3B82F6 (blue-500)
- Primary Dark: #2563EB (blue-600)
- Primary Light: #60A5FA (blue-400)

**Semantic Colors**:
- Success: #10B981 (green-500)
- Error: #EF4444 (red-500)
- Warning: #F59E0B (amber-500)
- Info: #3B82F6 (blue-500)

**Neutral Colors**:
- Gray 50: #F9FAFB
- Gray 100: #F3F4F6
- Gray 200: #E5E7EB
- Gray 300: #D1D5DB
- Gray 400: #9CA3AF
- Gray 500: #6B7280
- Gray 600: #4B5563
- Gray 700: #374151
- Gray 800: #1F2937
- Gray 900: #111827

---

### Typography

**Font Family**:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;
```

**Font Sizes**:
- xs: 12px / 0.75rem
- sm: 14px / 0.875rem
- base: 16px / 1rem
- lg: 18px / 1.125rem
- xl: 20px / 1.25rem
- 2xl: 24px / 1.5rem
- 3xl: 30px / 1.875rem

**Font Weights**:
- Normal: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

### Spacing

**Scale** (based on 4px):
- 0: 0px
- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 5: 20px
- 6: 24px
- 8: 32px
- 10: 40px
- 12: 48px
- 16: 64px

---

### Shadows

```css
/* Small */
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* Medium */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
            0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Large */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
            0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* Focus */
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
```

---

## Animation and Transitions

### Timing Functions

```css
/* Standard easing */
transition-timing-function: cubic-bezier(0.4, 0.0, 0.2, 1);

/* Ease-in (entering) */
transition-timing-function: cubic-bezier(0.4, 0.0, 1, 1);

/* Ease-out (exiting) */
transition-timing-function: cubic-bezier(0.0, 0.0, 0.2, 1);
```

### Durations

- Fast: 150ms (hover states)
- Normal: 200ms (most transitions)
- Slow: 300ms (complex animations)

### Common Animations

**Fade In**:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Slide Down**:
```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Shake** (for errors):
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
```

---

## Error States

### Field-Level Errors

**Visual Design**:
```
┌─────────────────────────────────────────────────────────┐
│  Email Address *                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ invalid-email                                     │ │ ← Red border (2px)
│  └───────────────────────────────────────────────────┘ │
│  ✗ Please enter a valid email address                  │ ← Red text
│     Example: you@example.com                            │ ← Gray help text
└─────────────────────────────────────────────────────────┘
```

**Error Message Guidelines**:
- Be specific about the problem
- Provide actionable guidance
- Use friendly, non-technical language
- Show examples when helpful

**Examples**:
- ✅ "Email must include @ symbol (e.g., you@example.com)"
- ❌ "Invalid input"

---

### Form-Level Errors

**Error Summary**:
```
┌─────────────────────────────────────────────────────────┐
│  ⚠ Please fix the following errors before submitting:  │
│                                                         │
│  • Email address is invalid                             │
│  • Password must be at least 8 characters               │
│  • Terms and conditions must be accepted                │
│                                                         │
│  [Jump to first error]                                  │
└─────────────────────────────────────────────────────────┘
```

**Placement**: Top of form, above all fields

**Behavior**:
- Appears on form submission if validation fails
- Scrolls into view automatically
- Links to first error field
- Dismissible (optional)

---

### Network Errors

**Submission Failed**:
```
┌─────────────────────────────────────────────────────────┐
│  ✗ Unable to submit form                                │
│                                                         │
│  We're having trouble connecting to the server.         │
│  Please check your internet connection and try again.   │
│                                                         │
│  [Try Again]  [Save Draft]                              │
└─────────────────────────────────────────────────────────┘
```

---

## Loading States

### Field Loading (Async Validation)

```
┌─────────────────────────────────────────────────────────┐
│  Username *                                             │
│  ┌───────────────────────────────────────────────────┐ │
│  │ john_doe                                      ⟳  │ │ ← Spinner
│  └───────────────────────────────────────────────────┘ │
│  Checking availability...                               │
└─────────────────────────────────────────────────────────┘
```

---

### Form Submission Loading

```
┌─────────────────────────────────────────────────┐
│  ⟳ Submitting form...                           │ ← Disabled, spinner
└─────────────────────────────────────────────────┘
```

**Behavior**:
- Button disabled
- Spinner animation
- Text changes to "Submitting..."
- Cursor changes to wait/progress

---

### Skeleton Loading (Form Generation)

```
┌─────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Success States

### Field Success

```
┌─────────────────────────────────────────────────────────┐
│  Email Address *                                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │ john@example.com                              ✓  │ │ ← Green checkmark
│  └───────────────────────────────────────────────────┘ │
│  ✓ Valid email address                                  │ ← Green text
└─────────────────────────────────────────────────────────┘
```

---

### Form Submission Success

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Form submitted successfully!                         │
│                                                         │
│  Thank you for your submission. We'll get back to you   │
│  within 24 hours.                                       │
│                                                         │
│  [Submit Another Form]  [Go to Dashboard]               │
└─────────────────────────────────────────────────────────┘
```

**Behavior**:
- Replaces form content
- Shows success icon and message
- Provides next actions
- Auto-redirect after 5 seconds (optional)

---

## Design Specifications

### Component Measurements

**Text Input**:
- Height: 44px
- Padding: 12px 16px
- Border-radius: 6px
- Border-width: 1px (default), 2px (focus/error)
- Font-size: 16px
- Line-height: 20px

**Button**:
- Height: 44px
- Padding: 12px 24px
- Border-radius: 6px
- Font-size: 16px
- Font-weight: 600

**Label**:
- Font-size: 14px
- Font-weight: 500
- Margin-bottom: 6px
- Color: #374151 (gray-700)

**Help Text**:
- Font-size: 14px
- Font-weight: 400
- Margin-top: 6px
- Color: #6B7280 (gray-500)

**Error Message**:
- Font-size: 14px
- Font-weight: 400
- Margin-top: 6px
- Color: #EF4444 (red-500)

---

### Spacing Guidelines

**Between Fields**: 20px (5 units)
**Between Label and Input**: 6px (1.5 units)
**Between Input and Help Text**: 6px (1.5 units)
**Form Padding**: 24px (6 units)
**Section Spacing**: 32px (8 units)

---

## Appendix

### A. Design Checklist

**Before Development**:
- [ ] All wireframes reviewed and approved
- [ ] Color contrast checked (WCAG AA)
- [ ] Keyboard navigation planned
- [ ] Screen reader support documented
- [ ] Responsive breakpoints defined
- [ ] Animation timing specified
- [ ] Error messages written
- [ ] Loading states designed

**During Development**:
- [ ] Components match designs
- [ ] Spacing is consistent
- [ ] Colors match palette
- [ ] Typography is correct
- [ ] Animations are smooth
- [ ] Accessibility attributes added
- [ ] Keyboard navigation works
- [ ] Mobile layout tested

**Before Launch**:
- [ ] Accessibility audit passed
- [ ] Cross-browser testing complete
- [ ] Mobile device testing complete
- [ ] Screen reader testing complete
- [ ] Performance optimized
- [ ] User testing conducted
- [ ] Feedback incorporated

---

### B. Resources

**Design Tools**:
- Figma: https://www.figma.com/
- Adobe XD: https://www.adobe.com/products/xd.html
- Sketch: https://www.sketch.com/

**Accessibility Tools**:
- WAVE: https://wave.webaim.org/
- axe DevTools: https://www.deque.com/axe/devtools/
- Lighthouse: Built into Chrome DevTools

**Color Contrast Checkers**:
- WebAIM: https://webaim.org/resources/contrastchecker/
- Coolors: https://coolors.co/contrast-checker

**Icon Libraries**:
- Heroicons: https://heroicons.com/
- Font Awesome: https://fontawesome.com/
- Material Icons: https://fonts.google.com/icons

---

### C. Glossary

- **Progressive Disclosure**: Showing information gradually as needed
- **Inline Validation**: Validating fields as user types or leaves field
- **ARIA**: Accessible Rich Internet Applications
- **WCAG**: Web Content Accessibility Guidelines
- **Touch Target**: Minimum size for clickable elements on touch devices
- **Focus Indicator**: Visual indication of which element has keyboard focus

---

**Document Status**: Draft - Pending Review  
**Next Review**: Phase 2 Gate Review  
**Approval Required**: BMad Master, Product Manager, Frontend Developer

**Last Updated**: November 11, 2025 17:44:00 UTC
