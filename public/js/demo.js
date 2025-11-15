
document.addEventListener('DOMContentLoaded', function() {
    console.log('Demo page loaded');
    const generateBtn = document.getElementById('generateBtn');
    const generateRealBtn = document.getElementById('generateRealBtn');
    
    if (generateBtn) {
        generateBtn.addEventListener('click', () => generateForm(false));
        console.log('Generate button (demo mode) event listener attached');
    }
    
    if (generateRealBtn) {
        generateRealBtn.addEventListener('click', () => generateForm(true));
        console.log('Generate button (real AI) event listener attached');
    }
});

async function generateForm(useRealAI = false) {
    console.log('Generate button clicked, useRealAI:', useRealAI);
    const prompt = document.getElementById('prompt').value;
    const resultDiv = document.getElementById('result');
    const btn = useRealAI ? document.getElementById('generateRealBtn') : document.getElementById('generateBtn');

    if (!prompt.trim()) {
        resultDiv.innerHTML = '<div class="error">Please enter a form description</div>';
        return;
    }

    btn.disabled = true;
    resultDiv.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Generating form schema${useRealAI ? ' with AI' : ' (demo mode)'}...</p>
        </div>
    `;

    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer demo_token'
        };
        
        if (useRealAI) {
            headers['X-Force-Real-AI'] = 'true';
        }
        
        const response = await fetch('/api/v1/forms/generate', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                description: prompt,
                options: {
                    purpose: 'demo',
                    audience: 'general users'
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error?.message || data.error || 'Failed to generate form';
            throw new Error(errorMsg);
        }

        displayGeneratedForm(data.schema, useRealAI);
    } catch (error) {
        console.error('Form generation error:', error);
        const errorMessage = useRealAI 
            ? `<strong>Error:</strong> ${error.message}
               <br><br>
               <strong>Note:</strong> To use real AI generation, configure OpenAI or Anthropic API keys in Render environment variables:
               <br>• OPENAI_API_KEY (for OpenAI GPT-4)
               <br>• ANTHROPIC_API_KEY (for Anthropic Claude)
               <br><br>
               Use the "Demo Mode" button to see the mock response without API keys.`
            : `<strong>Error:</strong> ${error.message}`;
        
        resultDiv.innerHTML = `<div class="error">${errorMessage}</div>`;
    } finally {
        btn.disabled = false;
    }
}

function displayGeneratedForm(schema, isRealAI = false) {
    const resultDiv = document.getElementById('result');
    const aiMode = isRealAI ? '🤖 AI-Generated' : '📝 Demo Mode';
    
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
            ✅ Form generated successfully! ${aiMode}
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
