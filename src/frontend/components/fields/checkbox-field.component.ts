import { BaseFieldComponent } from './base-field.component';

/**
 * Checkbox field component
 */
export class CheckboxFieldComponent extends BaseFieldComponent {
  protected getDefaultValue(): any {
    return false;
  }

  render(): string {
    const required = this.isRequired() ? 'required' : '';
    const errorClass = this.hasError() ? 'error' : '';
    const checked = this.value ? 'checked' : '';

    return `
      <div class="form-field checkbox-field ${errorClass}">
        <label class="checkbox-label">
          <input
            type="checkbox"
            id="${this.field.name}"
            name="${this.field.name}"
            ${checked}
            ${required}
            class="form-checkbox"
          />
          <span>${this.field.label}</span>
          ${this.isRequired() ? '<span class="required">*</span>' : ''}
        </label>
        ${this.hasError() ? `<span class="error-message">${this.getError()}</span>` : ''}
      </div>
    `;
  }
}
