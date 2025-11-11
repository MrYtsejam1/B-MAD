import { BaseFieldComponent } from './base-field.component';

/**
 * Text input field component
 */
export class TextFieldComponent extends BaseFieldComponent {
  protected getDefaultValue(): any {
    return '';
  }

  render(): string {
    const required = this.isRequired() ? 'required' : '';
    const errorClass = this.hasError() ? 'error' : '';
    const placeholder = this.field.placeholder || '';

    return `
      <div class="form-field ${errorClass}">
        <label for="${this.field.name}">
          ${this.field.label}
          ${this.isRequired() ? '<span class="required">*</span>' : ''}
        </label>
        <input
          type="text"
          id="${this.field.name}"
          name="${this.field.name}"
          value="${this.value}"
          placeholder="${placeholder}"
          ${required}
          class="form-input"
        />
        ${this.hasError() ? `<span class="error-message">${this.getError()}</span>` : ''}
      </div>
    `;
  }
}
