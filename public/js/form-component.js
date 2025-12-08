/**
 * Static Web Component for Dynamic Form Generation
 * This component is loaded once and configured with data - no inline scripts needed
 * Supports enhanced configs from coder model: sections, hints, field widths, themes
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

        const { 
            fields = [], 
            data = {}, 
            styles = {},
            sections = [],
            fieldEnhancements = {},
            submitButton = {},
            title = '',
            description = ''
        } = this._config;

        const spacing = styles.spacing || 'normal';
        const spacingValues = {
            compact: { field: '12px', section: '16px', padding: '20px 24px' },
            normal: { field: '16px', section: '24px', padding: '28px 32px' },
            spacious: { field: '20px', section: '32px', padding: '36px 40px' }
        };
        const spacingConfig = spacingValues[spacing] || spacingValues.normal;

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                font-family: ${styles.fontFamily || 'Arial, sans-serif'};
            }
            .form-container {
                max-width: ${styles.maxWidth || '600px'};
                margin: 0 auto;
                padding: ${styles.padding || spacingConfig.padding};
                background: ${styles.background || '#ffffff'};
                border-radius: ${styles.borderRadius || '8px'};
                box-shadow: ${styles.boxShadow || '0 2px 10px rgba(0,0,0,0.1)'};
            }
            .form-title {
                font-size: 1.5rem;
                font-weight: 600;
                color: ${styles.primaryColor || '#333'};
                margin: 0 0 8px 0;
            }
            .form-description {
                color: #666;
                margin: 0 0 24px 0;
                font-size: 0.95rem;
            }
            .form-section {
                margin-bottom: ${spacingConfig.section};
                padding-bottom: ${spacingConfig.section};
                border-bottom: 1px solid #eee;
            }
            .form-section:last-of-type {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .section-header {
                margin-bottom: 16px;
            }
            .section-title {
                font-size: 1.1rem;
                font-weight: 600;
                color: ${styles.primaryColor || '#333'};
                margin: 0 0 4px 0;
            }
            .section-description {
                color: #888;
                font-size: 0.85rem;
                margin: 0;
            }
            .section-fields {
                display: flex;
                flex-wrap: wrap;
                gap: ${spacingConfig.field};
            }
            .form-field {
                margin-bottom: ${spacingConfig.field};
                width: 100%;
                box-sizing: border-box;
            }
            .form-field.width-half {
                width: calc(50% - 8px);
            }
            .form-field.width-third {
                width: calc(33.333% - 11px);
            }
            @media (max-width: 600px) {
                .form-field.width-half,
                .form-field.width-third {
                    width: 100%;
                }
            }
            .form-field label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                color: #333;
                font-size: 0.9rem;
            }
            .form-field input,
            .form-field textarea,
            .form-field select {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
                font-family: inherit;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .form-field input:focus,
            .form-field textarea:focus,
            .form-field select:focus {
                outline: none;
                border-color: ${styles.primaryColor || '#007bff'};
                box-shadow: 0 0 0 3px ${styles.primaryColor ? styles.primaryColor + '20' : 'rgba(0,123,255,0.15)'};
            }
            .form-field textarea {
                resize: vertical;
                min-height: 100px;
            }
            .field-hint {
                color: #888;
                font-size: 0.8rem;
                margin-top: 4px;
            }
            .submit-btn {
                background: ${styles.buttonBackground || '#007bff'};
                color: ${styles.buttonColor || '#ffffff'};
                border: none;
                padding: 14px 28px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                width: 100%;
                margin-top: 16px;
                transition: opacity 0.2s, transform 0.1s;
            }
            .submit-btn:hover {
                opacity: 0.9;
            }
            .submit-btn:active {
                transform: scale(0.98);
            }
            .required-indicator {
                color: #dc3545;
                margin-left: 4px;
            }
        `;

        const container = document.createElement('div');
        container.className = 'form-container';

        // Add title and description if provided
        if (title) {
            const titleEl = document.createElement('h2');
            titleEl.className = 'form-title';
            titleEl.textContent = title;
            container.appendChild(titleEl);
        }
        if (description) {
            const descEl = document.createElement('p');
            descEl.className = 'form-description';
            descEl.textContent = description;
            container.appendChild(descEl);
        }

        const form = document.createElement('form');
        form.id = 'dynamicForm';

        // Render with sections if provided, otherwise render flat
        if (sections && sections.length > 0) {
            this.renderWithSections(form, sections, fields, data, fieldEnhancements);
        } else {
            this.renderFlatFields(form, fields, data, fieldEnhancements);
        }

        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'submit-btn';
        submitBtn.textContent = submitButton.text || 'Submit';
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

    renderWithSections(form, sections, fields, data, fieldEnhancements) {
        // Create a map of field names to field definitions
        const fieldMap = {};
        fields.forEach(field => {
            const fieldName = typeof field === 'string' ? field : field.name;
            fieldMap[fieldName] = field;
        });

        // Track which fields have been rendered
        const renderedFields = new Set();

        // Render each section
        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'form-section';

            // Section header
            if (section.title) {
                const headerDiv = document.createElement('div');
                headerDiv.className = 'section-header';

                const titleEl = document.createElement('h3');
                titleEl.className = 'section-title';
                titleEl.textContent = section.title;
                headerDiv.appendChild(titleEl);

                if (section.description) {
                    const descEl = document.createElement('p');
                    descEl.className = 'section-description';
                    descEl.textContent = section.description;
                    headerDiv.appendChild(descEl);
                }

                sectionDiv.appendChild(headerDiv);
            }

            // Section fields container
            const fieldsContainer = document.createElement('div');
            fieldsContainer.className = 'section-fields';

            // Render fields in this section
            section.fields.forEach(fieldName => {
                const field = fieldMap[fieldName];
                if (field) {
                    const fieldEl = this.createFieldElement(field, data, fieldEnhancements);
                    fieldsContainer.appendChild(fieldEl);
                    renderedFields.add(fieldName);
                }
            });

            sectionDiv.appendChild(fieldsContainer);
            form.appendChild(sectionDiv);
        });

        // Render any remaining fields not in sections
        const remainingFields = fields.filter(field => {
            const fieldName = typeof field === 'string' ? field : field.name;
            return !renderedFields.has(fieldName);
        });

        if (remainingFields.length > 0) {
            const otherSection = document.createElement('div');
            otherSection.className = 'form-section';

            const fieldsContainer = document.createElement('div');
            fieldsContainer.className = 'section-fields';

            remainingFields.forEach(field => {
                const fieldEl = this.createFieldElement(field, data, fieldEnhancements);
                fieldsContainer.appendChild(fieldEl);
            });

            otherSection.appendChild(fieldsContainer);
            form.appendChild(otherSection);
        }
    }

    renderFlatFields(form, fields, data, fieldEnhancements) {
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'section-fields';

        fields.forEach(field => {
            const fieldEl = this.createFieldElement(field, data, fieldEnhancements);
            fieldsContainer.appendChild(fieldEl);
        });

        form.appendChild(fieldsContainer);
    }

    createFieldElement(field, data, fieldEnhancements) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-field';

        const fieldName = typeof field === 'string' ? field : field.name;
        const fieldLabel = typeof field === 'string' ? this.formatFieldName(field) : (field.label || this.formatFieldName(field.name));
        const fieldType = typeof field === 'string' ? 'text' : (field.type || 'text');
        const fieldRequired = typeof field === 'string' ? false : (field.required || false);
        const fieldPlaceholder = typeof field === 'string' ? ('Enter ' + this.formatFieldName(field).toLowerCase()) : (field.placeholder || '');
        const fieldValue = data[fieldName] || '';

        // Apply field enhancements
        const enhancement = fieldEnhancements[fieldName] || {};
        if (enhancement.width === 'half') {
            fieldDiv.classList.add('width-half');
        } else if (enhancement.width === 'third') {
            fieldDiv.classList.add('width-third');
        }

        // Label
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

        // Input element based on type
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

        // Add hint if provided
        if (enhancement.hint) {
            const hintEl = document.createElement('div');
            hintEl.className = 'field-hint';
            hintEl.textContent = enhancement.hint;
            fieldDiv.appendChild(hintEl);
        }

        return fieldDiv;
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
