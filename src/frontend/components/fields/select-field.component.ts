import { BaseFieldComponent } from './base-field.component';

/**
 * Select dropdown field component
 */
export class SelectFieldComponent extends BaseFieldComponent {
  protected getDefaultValue(): any {
    return '';
  }

  render(): string {
    const required = this.isRequired() ? 'required' : '';
    const errorClass = this.hasError() ? 'error' : '';
    const options = this.field.options || [];

    const optionsHtml = options.map(opt => 
      `<option value="${opt.value}" ${this.value === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    return `
      <div class="form-field ${errorClass}">
        <label for="${this.field.name}">
          ${this.field.label}
          ${this.isRequired() ? '<span class="required">*</span>' : ''}
        </label>
        <select
          id="${this.field.name}"
          name="${this.field.name}"
          ${required}
          class="form-select"
        >
          <option value="">Select an option</option>
          ${optionsHtml}
        </select>
        ${this.hasError() ? `<span class="error-message">${this.getError()}</span>` : ''}
      </div>
    `;
  }
}
