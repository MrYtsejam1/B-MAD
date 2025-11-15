
document.addEventListener('DOMContentLoaded', function() {
    console.log('Demo page loaded');
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateForm);
        console.log('Generate button event listener attached');
    }
});

async function generateForm() {
    console.log('Generate button clicked');
    const prompt = document.getElementById('prompt').value;
    const resultDiv = document.getElementById('result');
    const btn = document.getElementById('generateBtn');

    if (!prompt.trim()) {
        resultDiv.innerHTML = '<div class="error">Please enter a form description</div>';
        return;
    }

    btn.disabled = true;
    resultDiv.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Generating form schema...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/v1/forms/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer demo_token'
            },
            body: JSON.stringify({
                prompt: prompt,
                context: {
                    purpose: 'demo',
                    audience: 'general users'
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate form');
        }

        displayGeneratedForm(data.schema);
    } catch (error) {
        console.error('Form generation error:', error);
        resultDiv.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${error.message}
                <br><br>
                <strong>Note:</strong> This demo requires valid OpenAI or Anthropic API keys to be configured in the .env file.
                The backend is running but cannot generate forms without API credentials.
            </div>
        `;
    } finally {
        btn.disabled = false;
    }
}

function displayGeneratedForm(schema) {
    const resultDiv = document.getElementById('result');
    
    let fieldsHtml = '';
    schema.fields.forEach(field => {
        const required = field.required ? '<span class="required">*</span>' : '';
        const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
        
        let inputHtml = '';
        if (field.type === 'textarea') {
            inputHtml = `<textarea ${placeholder}></textarea>`;
        } else if (field.type === 'select') {
            const options = field.options.map(opt => 
                `<option value="${opt.value}">${opt.label}</option>`
            ).join('');
            inputHtml = `<select><option value="">Select...</option>${options}</select>`;
        } else if (field.type === 'checkbox') {
            inputHtml = `<input type="checkbox">`;
        } else {
            inputHtml = `<input type="${field.type}" ${placeholder}>`;
        }

        fieldsHtml += `
            <div class="form-field">
                <label>${field.label}${required}</label>
                ${inputHtml}
            </div>
        `;
    });

    resultDiv.innerHTML = `
        <div class="success">
            ✅ Form generated successfully!
        </div>
        <div class="generated-form">
            <h3>${schema.title || 'Generated Form'}</h3>
            ${schema.description ? `<p style="color: #666; margin-bottom: 20px;">${schema.description}</p>` : ''}
            ${fieldsHtml}
            <button class="btn" style="margin-top: 10px;">Submit</button>
        </div>
        <div class="demo-section" style="margin-top: 20px;">
            <h3>Generated Schema (JSON)</h3>
            <div class="code-block">${JSON.stringify(schema, null, 2)}</div>
        </div>
    `;
}
