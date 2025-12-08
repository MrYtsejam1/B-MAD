/**
 * Static Web Component for Dynamic Form Generation
 * This component is loaded once and configured with data - no inline scripts needed
 */
class GeneratedFormComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._config = null;
    }

    static get observedAttributes() {
        return ['config'];
    }

    set config(value) {
        this._config = value;
        this.render();
    }

    get config() {
        return this._config;
    }

    connectedCallback() {
        if (this._config) {
            this.render();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'config' && newValue) {
            try {
                this._config = JSON.parse(newValue);
                this.render();
            } catch (e) {
                console.error('Failed to parse config:', e);
            }
        }
    }

    render() {
        if (!this._config) return;

        const { fields = [], data = {}, styles = {} } = this._config;

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                font-family: ${styles.fontFamily || 'Arial, sans-serif'};
            }
            .form-container {
                max-width: ${styles.maxWidth || '600px'};
                margin: 0 auto;
                padding: ${styles.padding || '20px'};
                background: ${styles.background || '#ffffff'};
                border-radius: ${styles.borderRadius || '8px'};
                box-shadow: ${styles.boxShadow || '0 2px 10px rgba(0,0,0,0.1)'};
            }
            .form-field {
                margin-bottom: 15px;
            }
            .form-field label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #333;
            }
            .form-field input,
            .form-field textarea,
            .form-field select {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
                font-family: inherit;
            }
            .form-field input:focus,
            .form-field textarea:focus,
            .form-field select:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
            }
            .form-field textarea {
                resize: vertical;
                min-height: 100px;
            }
            .submit-btn {
                background: ${styles.buttonBackground || '#007bff'};
                color: ${styles.buttonColor || '#ffffff'};
                border: none;
                padding: 12px 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
                margin-top: 10px;
            }
            .submit-btn:hover {
                opacity: 0.9;
            }
            .required-indicator {
                color: #dc3545;
                margin-left: 4px;
            }
        `;

        const container = document.createElement('div');
        container.className = 'form-container';

        const form = document.createElement('form');
        form.id = 'dynamicForm';

        fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'form-field';

            const fieldName = typeof field === 'string' ? field : field.name;
            const fieldLabel = typeof field === 'string' ? this.formatFieldName(field) : (field.label || this.formatFieldName(field.name));
            const fieldType = typeof field === 'string' ? 'text' : (field.type || 'text');
            const fieldRequired = typeof field === 'string' ? false : (field.required || false);
            const fieldPlaceholder = typeof field === 'string' ? ('Enter ' + this.formatFieldName(field).toLowerCase()) : (field.placeholder || '');
            const fieldValue = data[fieldName] || '';

            const label = document.createElement('label');
            label.setAttribute('for', fieldName);
            label.textContent = fieldLabel;
            if (fieldRequired) {
                const requiredSpan = document.createElement('span');
                requiredSpan.className = 'required-indicator';
                requiredSpan.textContent = '*';
                label.appendChild(requiredSpan);
            }
            fieldDiv.appendChild(label);

            if (fieldType === 'textarea') {
                const textarea = document.createElement('textarea');
                textarea.id = fieldName;
                textarea.name = fieldName;
                textarea.placeholder = fieldPlaceholder;
                textarea.required = fieldRequired;
                textarea.rows = 4;
                textarea.value = fieldValue;
                fieldDiv.appendChild(textarea);
            } else if (fieldType === 'select') {
                const select = document.createElement('select');
                select.id = fieldName;
                select.name = fieldName;
                select.required = fieldRequired;

                // Add placeholder option
                const placeholderOpt = document.createElement('option');
                placeholderOpt.value = '';
                placeholderOpt.textContent = fieldPlaceholder || 'Select...';
                placeholderOpt.disabled = true;
                if (!fieldValue) placeholderOpt.selected = true;
                select.appendChild(placeholderOpt);

                // Add options from field definition
                const fieldOptions = typeof field === 'object' && field.options ? field.options : [];
                fieldOptions.forEach(opt => {
                    const option = document.createElement('option');
                    const optValue = opt.value || opt;
                    const optLabel = opt.label || opt.value || opt;
                    option.value = optValue;
                    option.textContent = optLabel;
                    if (optValue === fieldValue) option.selected = true;
                    select.appendChild(option);
                });

                fieldDiv.appendChild(select);
            } else {
                const input = document.createElement('input');
                input.type = fieldType;
                input.id = fieldName;
                input.name = fieldName;
                input.placeholder = fieldPlaceholder;
                input.required = fieldRequired;
                input.value = fieldValue;
                fieldDiv.appendChild(input);
            }

            form.appendChild(fieldDiv);
        });

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'submit-btn';
        submitBtn.textContent = 'Submit';
        form.appendChild(submitBtn);

        container.appendChild(form);

        // Clear and rebuild shadow DOM
        this.shadowRoot.innerHTML = '';
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);

        // Attach event listener
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const formDataObj = {};
            formData.forEach((value, key) => {
                formDataObj[key] = value;
            });
            this.dispatchEvent(new CustomEvent('formSubmit', {
                detail: formDataObj,
                bubbles: true,
                composed: true
            }));
            console.log('Form submitted:', formDataObj);
        });
    }

    formatFieldName(field) {
        return field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
}

// Register the component if not already registered
if (!customElements.get('generated-form-component')) {
    customElements.define('generated-form-component', GeneratedFormComponent);
}
