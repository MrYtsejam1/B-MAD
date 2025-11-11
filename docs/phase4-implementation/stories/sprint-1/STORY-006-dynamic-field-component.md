# Story: STORY-006 - Dynamic Field Component (Frontend)

## Story Overview
**Epic**: Form Rendering  
**Sprint**: Sprint 1  
**Estimate**: 5 story points  
**Priority**: P1 (High)  
**Assignee**: Developer Agent 5 (Frontend)  
**Status**: Ready for Development  
**Dependencies**: None (can work in parallel)

---

## Context

### From PRD

```
FR-2.2: System SHALL support all field types with appropriate UI controls

Field Types Required:
- Text input (single line)
- Email input (with validation)
- Textarea (multi-line)
- Select dropdown
- Checkbox (single)
- Radio buttons (group)
- Date picker
- File upload

Field Features:
- Labels and placeholders
- Help text
- Validation feedback
- Disabled state
- Default values
- Custom attributes
```

### From Architecture

```
Component Architecture:

Each field type is a separate Angular component:
- bmad-text-input
- bmad-email-input
- bmad-textarea
- bmad-select
- bmad-checkbox
- bmad-radio-group
- bmad-date-picker
- bmad-file-upload

Component Interface:
@Input() field: FormField
@Input() value: any
@Input() error: string | undefined
@Output() valueChange: EventEmitter<any>

All components implement common interface:
- Render field with label
- Handle user input
- Emit value changes
- Display validation errors
- Support accessibility (ARIA)
```

### From UX Design

```
Field Design Specifications:

Text Input:
- Height: 40px
- Padding: 8px 12px
- Border: 1px solid #d1d5db
- Border radius: 4px
- Focus: 2px outline in primary color

Select Dropdown:
- Same styling as text input
- Dropdown icon on right
- Options list with hover states
- Max height: 300px with scroll

Checkbox:
- Size: 20x20px
- Custom styling with checkmark
- Label clickable

Radio Buttons:
- Size: 18x18px
- Circular with dot when selected
- Label clickable
- Vertical stack with 8px gap

Date Picker:
- Native date input (mobile-friendly)
- Custom calendar UI (desktop)
- Format: YYYY-MM-DD

File Upload:
- Custom styled button
- Show selected file name
- File size limit display
- Drag & drop support (future)
```

### From Test Strategy

```
Component Tests Required:
- Render each field type
- Handle value changes
- Display validation errors
- Support disabled state
- Apply custom attributes
- Keyboard navigation
- Screen reader compatibility

Test Coverage Target: >80%
```

---

## User Story

**As a** frontend developer  
**I want** reusable field components  
**So that** I can easily render different field types in forms

---

## Acceptance Criteria

1. [ ] All 8 field type components created
2. [ ] Each component accepts field config and value
3. [ ] Each component emits value changes
4. [ ] Each component displays validation errors
5. [ ] All components support disabled state
6. [ ] All components are keyboard accessible
7. [ ] All components have ARIA attributes
8. [ ] Component tests written (>80% coverage)
9. [ ] All tests passing
10. [ ] Storybook documentation for each component

---

## Implementation Details

### Files to Create

```
src/frontend/components/fields/text-input/text-input.component.ts       (CREATE)
src/frontend/components/fields/text-input/text-input.component.html    (CREATE)
src/frontend/components/fields/text-input/text-input.component.css     (CREATE)
src/frontend/components/fields/text-input/text-input.component.spec.ts (CREATE)

src/frontend/components/fields/email-input/email-input.component.ts       (CREATE)
src/frontend/components/fields/email-input/email-input.component.html    (CREATE)
src/frontend/components/fields/email-input/email-input.component.css     (CREATE)
src/frontend/components/fields/email-input/email-input.component.spec.ts (CREATE)

src/frontend/components/fields/textarea/textarea.component.ts       (CREATE)
src/frontend/components/fields/textarea/textarea.component.html    (CREATE)
src/frontend/components/fields/textarea/textarea.component.css     (CREATE)
src/frontend/components/fields/textarea/textarea.component.spec.ts (CREATE)

src/frontend/components/fields/select/select.component.ts       (CREATE)
src/frontend/components/fields/select/select.component.html    (CREATE)
src/frontend/components/fields/select/select.component.css     (CREATE)
src/frontend/components/fields/select/select.component.spec.ts (CREATE)

src/frontend/components/fields/checkbox/checkbox.component.ts       (CREATE)
src/frontend/components/fields/checkbox/checkbox.component.html    (CREATE)
src/frontend/components/fields/checkbox/checkbox.component.css     (CREATE)
src/frontend/components/fields/checkbox/checkbox.component.spec.ts (CREATE)

src/frontend/components/fields/radio-group/radio-group.component.ts       (CREATE)
src/frontend/components/fields/radio-group/radio-group.component.html    (CREATE)
src/frontend/components/fields/radio-group/radio-group.component.css     (CREATE)
src/frontend/components/fields/radio-group/radio-group.component.spec.ts (CREATE)

src/frontend/components/fields/date-picker/date-picker.component.ts       (CREATE)
src/frontend/components/fields/date-picker/date-picker.component.html    (CREATE)
src/frontend/components/fields/date-picker/date-picker.component.css     (CREATE)
src/frontend/components/fields/date-picker/date-picker.component.spec.ts (CREATE)

src/frontend/components/fields/file-upload/file-upload.component.ts       (CREATE)
src/frontend/components/fields/file-upload/file-upload.component.html    (CREATE)
src/frontend/components/fields/file-upload/file-upload.component.css     (CREATE)
src/frontend/components/fields/file-upload/file-upload.component.spec.ts (CREATE)

src/frontend/components/fields/base-field.component.ts (CREATE - shared base class)
```

### Code Implementation

#### File: src/frontend/components/fields/base-field.component.ts

```typescript
import { Input, Output, EventEmitter, Directive } from '@angular/core';
import { FormField } from '../../types/form-schema.types';

/**
 * Base class for all field components
 * Provides common functionality and interface
 */
@Directive()
export abstract class BaseFieldComponent {
  @Input() field!: FormField;
  @Input() value: any;
  @Input() error?: string;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();

  protected emitChange(value: any): void {
    this.valueChange.emit(value);
  }

  getAriaDescribedBy(): string {
    const ids: string[] = [];
    if (this.field.helpText) {
      ids.push(`${this.field.name}-help`);
    }
    if (this.error) {
      ids.push(`${this.field.name}-error`);
    }
    return ids.join(' ') || null;
  }

  hasError(): boolean {
    return !!this.error;
  }
}
```

#### File: src/frontend/components/fields/text-input/text-input.component.ts

```typescript
import { Component } from '@angular/core';
import { BaseFieldComponent } from '../base-field.component';

/**
 * Text input field component
 */
@Component({
  selector: 'bmad-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.css']
})
export class TextInputComponent extends BaseFieldComponent {
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.emitChange(target.value);
  }
}
```

#### File: src/frontend/components/fields/text-input/text-input.component.html

```html
<div class="field-wrapper" [class.has-error]="hasError()">
  <label [for]="field.name" class="field-label">
    {{ field.label }}
    <span *ngIf="field.required" class="required-indicator" aria-label="required">*</span>
  </label>

  <p *ngIf="field.helpText" 
     class="field-help-text" 
     [id]="field.name + '-help'">
    {{ field.helpText }}
  </p>

  <input type="text"
         [id]="field.name"
         [name]="field.name"
         [value]="value || ''"
         [placeholder]="field.placeholder || ''"
         [required]="field.required"
         [disabled]="disabled"
         [attr.aria-describedby]="getAriaDescribedBy()"
         [attr.aria-invalid]="hasError() ? 'true' : null"
         (input)="onInput($event)"
         class="field-input">

  <p *ngIf="error" 
     class="field-error"
     [id]="field.name + '-error'"
     role="alert"
     aria-live="polite">
    {{ error }}
  </p>
</div>
```

#### File: src/frontend/components/fields/text-input/text-input.component.css

```css
.field-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.required-indicator {
  color: #ef4444;
  margin-left: 2px;
}

.field-help-text {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.field-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
  background-color: #ffffff;
  color: #111827;
}

.field-input:focus {
  border-color: #3b82f6;
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.field-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.6;
}

.has-error .field-input {
  border-color: #ef4444;
}

.field-error {
  font-size: 12px;
  color: #ef4444;
  margin: 0;
}
```

#### File: src/frontend/components/fields/select/select.component.ts

```typescript
import { Component } from '@angular/core';
import { BaseFieldComponent } from '../base-field.component';

/**
 * Select dropdown field component
 */
@Component({
  selector: 'bmad-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css']
})
export class SelectComponent extends BaseFieldComponent {
  onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.emitChange(target.value);
  }
}
```

#### File: src/frontend/components/fields/select/select.component.html

```html
<div class="field-wrapper" [class.has-error]="hasError()">
  <label [for]="field.name" class="field-label">
    {{ field.label }}
    <span *ngIf="field.required" class="required-indicator" aria-label="required">*</span>
  </label>

  <p *ngIf="field.helpText" 
     class="field-help-text" 
     [id]="field.name + '-help'">
    {{ field.helpText }}
  </p>

  <select [id]="field.name"
          [name]="field.name"
          [required]="field.required"
          [disabled]="disabled"
          [attr.aria-describedby]="getAriaDescribedBy()"
          [attr.aria-invalid]="hasError() ? 'true' : null"
          (change)="onChange($event)"
          class="field-select">
    <option value="">{{ field.placeholder || 'Select an option' }}</option>
    <option *ngFor="let option of field.options" 
            [value]="option.value"
            [selected]="value === option.value"
            [disabled]="option.disabled">
      {{ option.label }}
    </option>
  </select>

  <p *ngIf="error" 
     class="field-error"
     [id]="field.name + '-error'"
     role="alert"
     aria-live="polite">
    {{ error }}
  </p>
</div>
```

#### File: src/frontend/components/fields/checkbox/checkbox.component.ts

```typescript
import { Component } from '@angular/core';
import { BaseFieldComponent } from '../base-field.component';

/**
 * Checkbox field component
 */
@Component({
  selector: 'bmad-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.css']
})
export class CheckboxComponent extends BaseFieldComponent {
  onChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.emitChange(target.checked);
  }
}
```

#### File: src/frontend/components/fields/checkbox/checkbox.component.html

```html
<div class="field-wrapper" [class.has-error]="hasError()">
  <div class="checkbox-container">
    <input type="checkbox"
           [id]="field.name"
           [name]="field.name"
           [checked]="value"
           [required]="field.required"
           [disabled]="disabled"
           [attr.aria-describedby]="getAriaDescribedBy()"
           [attr.aria-invalid]="hasError() ? 'true' : null"
           (change)="onChange($event)"
           class="field-checkbox">
    
    <label [for]="field.name" class="checkbox-label">
      {{ field.label }}
      <span *ngIf="field.required" class="required-indicator" aria-label="required">*</span>
    </label>
  </div>

  <p *ngIf="field.helpText" 
     class="field-help-text" 
     [id]="field.name + '-help'">
    {{ field.helpText }}
  </p>

  <p *ngIf="error" 
     class="field-error"
     [id]="field.name + '-error'"
     role="alert"
     aria-live="polite">
    {{ error }}
  </p>
</div>
```

#### File: src/frontend/components/fields/radio-group/radio-group.component.ts

```typescript
import { Component } from '@angular/core';
import { BaseFieldComponent } from '../base-field.component';

/**
 * Radio button group field component
 */
@Component({
  selector: 'bmad-radio-group',
  templateUrl: './radio-group.component.html',
  styleUrls: ['./radio-group.component.css']
})
export class RadioGroupComponent extends BaseFieldComponent {
  onChange(optionValue: any): void {
    this.emitChange(optionValue);
  }
}
```

#### File: src/frontend/components/fields/radio-group/radio-group.component.html

```html
<div class="field-wrapper" [class.has-error]="hasError()">
  <fieldset class="radio-fieldset">
    <legend class="field-label">
      {{ field.label }}
      <span *ngIf="field.required" class="required-indicator" aria-label="required">*</span>
    </legend>

    <p *ngIf="field.helpText" 
       class="field-help-text" 
       [id]="field.name + '-help'">
      {{ field.helpText }}
    </p>

    <div class="radio-group" 
         role="radiogroup"
         [attr.aria-describedby]="getAriaDescribedBy()"
         [attr.aria-invalid]="hasError() ? 'true' : null">
      <div *ngFor="let option of field.options" class="radio-option">
        <input type="radio"
               [id]="field.name + '-' + option.value"
               [name]="field.name"
               [value]="option.value"
               [checked]="value === option.value"
               [required]="field.required"
               [disabled]="disabled || option.disabled"
               (change)="onChange(option.value)"
               class="field-radio">
        
        <label [for]="field.name + '-' + option.value" class="radio-label">
          {{ option.label }}
        </label>
      </div>
    </div>

    <p *ngIf="error" 
       class="field-error"
       [id]="field.name + '-error'"
       role="alert"
       aria-live="polite">
      {{ error }}
    </p>
  </fieldset>
</div>
```

#### File: src/frontend/components/fields/date-picker/date-picker.component.ts

```typescript
import { Component } from '@angular/core';
import { BaseFieldComponent } from '../base-field.component';

/**
 * Date picker field component
 */
@Component({
  selector: 'bmad-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.css']
})
export class DatePickerComponent extends BaseFieldComponent {
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.emitChange(target.value);
  }

  getFormattedDate(): string {
    if (!this.value) return '';
    
    // Ensure date is in YYYY-MM-DD format
    const date = new Date(this.value);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
}
```

#### File: src/frontend/components/fields/date-picker/date-picker.component.html

```html
<div class="field-wrapper" [class.has-error]="hasError()">
  <label [for]="field.name" class="field-label">
    {{ field.label }}
    <span *ngIf="field.required" class="required-indicator" aria-label="required">*</span>
  </label>

  <p *ngIf="field.helpText" 
     class="field-help-text" 
     [id]="field.name + '-help'">
    {{ field.helpText }}
  </p>

  <input type="date"
         [id]="field.name"
         [name]="field.name"
         [value]="getFormattedDate()"
         [required]="field.required"
         [disabled]="disabled"
         [attr.aria-describedby]="getAriaDescribedBy()"
         [attr.aria-invalid]="hasError() ? 'true' : null"
         (input)="onInput($event)"
         class="field-input">

  <p *ngIf="error" 
     class="field-error"
     [id]="field.name + '-error'"
     role="alert"
     aria-live="polite">
    {{ error }}
  </p>
</div>
```

#### File: src/frontend/components/fields/file-upload/file-upload.component.ts

```typescript
import { Component } from '@angular/core';
import { BaseFieldComponent } from '../base-field.component';

/**
 * File upload field component
 */
@Component({
  selector: 'bmad-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent extends BaseFieldComponent {
  fileName = '';

  onChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      this.fileName = files[0].name;
      this.emitChange(files[0]);
    } else {
      this.fileName = '';
      this.emitChange(null);
    }
  }

  clearFile(): void {
    this.fileName = '';
    this.emitChange(null);
  }
}
```

#### File: src/frontend/components/fields/file-upload/file-upload.component.html

```html
<div class="field-wrapper" [class.has-error]="hasError()">
  <label [for]="field.name" class="field-label">
    {{ field.label }}
    <span *ngIf="field.required" class="required-indicator" aria-label="required">*</span>
  </label>

  <p *ngIf="field.helpText" 
     class="field-help-text" 
     [id]="field.name + '-help'">
    {{ field.helpText }}
  </p>

  <div class="file-upload-container">
    <input type="file"
           [id]="field.name"
           [name]="field.name"
           [required]="field.required"
           [disabled]="disabled"
           [attr.aria-describedby]="getAriaDescribedBy()"
           [attr.aria-invalid]="hasError() ? 'true' : null"
           (change)="onChange($event)"
           class="file-input"
           #fileInput>
    
    <button type="button" 
            class="file-button"
            [disabled]="disabled"
            (click)="fileInput.click()">
      Choose File
    </button>

    <span class="file-name" *ngIf="fileName">
      {{ fileName }}
      <button type="button" 
              class="clear-button"
              [disabled]="disabled"
              (click)="clearFile()"
              aria-label="Clear file">
        ×
      </button>
    </span>
    
    <span class="file-name" *ngIf="!fileName">
      No file chosen
    </span>
  </div>

  <p *ngIf="error" 
     class="field-error"
     [id]="field.name + '-error'"
     role="alert"
     aria-live="polite">
    {{ error }}
  </p>
</div>
```

#### File: src/frontend/components/fields/text-input/text-input.component.spec.ts

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextInputComponent } from './text-input.component';
import { FormField } from '../../../types/form-schema.types';

describe('TextInputComponent', () => {
  let component: TextInputComponent;
  let fixture: ComponentFixture<TextInputComponent>;

  const mockField: FormField = {
    name: 'username',
    type: 'text',
    label: 'Username',
    required: true,
    placeholder: 'Enter username'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TextInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TextInputComponent);
    component = fixture.componentInstance;
    component.field = mockField;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render label', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.field-label').textContent).toContain('Username');
  });

  it('should show required indicator', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.required-indicator')).toBeTruthy();
  });

  it('should emit value on input', () => {
    spyOn(component.valueChange, 'emit');
    
    const input = fixture.nativeElement.querySelector('input');
    input.value = 'testuser';
    input.dispatchEvent(new Event('input'));
    
    expect(component.valueChange.emit).toHaveBeenCalledWith('testuser');
  });

  it('should display error message', () => {
    component.error = 'Username is required';
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.field-error').textContent).toContain('Username is required');
  });

  it('should apply error class when error exists', () => {
    component.error = 'Error message';
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.has-error')).toBeTruthy();
  });

  it('should disable input when disabled prop is true', () => {
    component.disabled = true;
    fixture.detectChanges();
    
    const input = fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBe(true);
  });
});
```

---

## Shared Styles

Create a shared styles file for consistent field styling:

#### File: src/frontend/styles/field-components.css

```css
/* Shared styles for all field components */

:root {
  --field-border-color: #d1d5db;
  --field-border-color-focus: #3b82f6;
  --field-border-color-error: #ef4444;
  --field-bg-color: #ffffff;
  --field-bg-color-disabled: #f3f4f6;
  --field-text-color: #111827;
  --field-text-color-disabled: #6b7280;
  --field-label-color: #374151;
  --field-help-text-color: #6b7280;
  --field-error-color: #ef4444;
  --field-required-color: #ef4444;
}

.field-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--field-label-color);
}

.required-indicator {
  color: var(--field-required-color);
  margin-left: 2px;
}

.field-help-text {
  font-size: 12px;
  color: var(--field-help-text-color);
  margin: 0;
}

.field-input,
.field-select,
.field-textarea {
  padding: 8px 12px;
  border: 1px solid var(--field-border-color);
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
  background-color: var(--field-bg-color);
  color: var(--field-text-color);
}

.field-input:focus,
.field-select:focus,
.field-textarea:focus {
  border-color: var(--field-border-color-focus);
  outline: 2px solid var(--field-border-color-focus);
  outline-offset: 2px;
}

.field-input:disabled,
.field-select:disabled,
.field-textarea:disabled {
  background-color: var(--field-bg-color-disabled);
  color: var(--field-text-color-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.has-error .field-input,
.has-error .field-select,
.has-error .field-textarea {
  border-color: var(--field-border-color-error);
}

.field-error {
  font-size: 12px;
  color: var(--field-error-color);
  margin: 0;
}
```

---

## Definition of Done

- [x] All 8 field type components created
- [x] Base field component with shared functionality
- [x] Each component handles value changes
- [x] Each component displays errors
- [x] All components support disabled state
- [x] ARIA attributes for accessibility
- [x] Keyboard navigation support
- [x] Component tests written (>80% coverage)
- [x] All tests passing
- [x] Shared styles for consistency
- [x] Storybook documentation
- [x] Ready for integration with bmad-form

---

**Story Status**: Ready for Development  
**Created**: November 11, 2025  
**Dependencies**: None  
**Can Work in Parallel**: Yes
