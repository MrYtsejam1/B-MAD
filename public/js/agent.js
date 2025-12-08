
class AgentClient {
    constructor() {
        this.currentStream = null;
        this.sessionId = null;
        this.conversationMode = 'session'; // 'session' for new conversational flow, 'legacy' for old flow
    }

    async startSession(userInput, model, context = {}) {
        if (this.currentStream) {
            console.log('Aborting previous stream');
            this.currentStream.abort();
        }

        this.currentStream = new AbortController();
        this.sessionId = null;
        
        console.log('🤖 CHAT MODE: Starting session at /api/v1/session/start');
        console.log('Selected model:', model);

        try {
            const response = await fetch('/api/v1/session/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo_token'
                },
                body: JSON.stringify({
                    userInput,
                    mode: 'chat',
                    model: model,
                    scenario: context.mcpServer || 'auto'
                }),
                signal: this.currentStream.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await this.processStreamResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                console.error('Session start error:', error);
                this.onEvent('error', { message: error.message });
            }
        } finally {
            this.currentStream = null;
        }
    }

    async continueSession(answer) {
        if (!this.sessionId) {
            console.error('No active session to continue');
            this.onEvent('error', { message: 'No active session' });
            return;
        }

        if (this.currentStream) {
            this.currentStream.abort();
        }

        this.currentStream = new AbortController();
        
        console.log('🤖 CHAT MODE: Continuing session at /api/v1/session/message');
        console.log('Session ID:', this.sessionId);
        console.log('Answer:', answer);

        try {
            const response = await fetch('/api/v1/session/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo_token'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    answer
                }),
                signal: this.currentStream.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await this.processStreamResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                console.error('Session continue error:', error);
                this.onEvent('error', { message: error.message });
            }
        } finally {
            this.currentStream = null;
        }
    }

    async processStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                console.log('Stream complete');
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            
            const frames = buffer.split('\n\n');
            buffer = frames.pop() || '';

            for (const frame of frames) {
                if (frame.trim()) {
                    this.processFrame(frame);
                }
            }
        }
    }

    async startStream(userInput, model, context = {}) {
        if (this.conversationMode === 'session') {
            return this.startSession(userInput, model, context);
        }

        if (this.currentStream) {
            console.log('Aborting previous stream');
            this.currentStream.abort();
        }

        this.currentStream = new AbortController();
        
        console.log('🤖 LEGACY MODE: Starting SSE stream to /api/v1/agent/stream');
        console.log('Selected model:', model);
        console.log('Context:', context);

        try {
            const response = await fetch('/api/v1/agent/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo_token'
                },
                body: JSON.stringify({
                    userInput,
                    sessionId: 'legacy_' + Date.now(),
                    context: {
                        ...context,
                        model
                    }
                }),
                signal: this.currentStream.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            await this.processStreamResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                console.error('Stream error:', error);
                this.onEvent('error', { message: error.message });
            }
        } finally {
            this.currentStream = null;
        }
    }

    processFrame(frame) {
        const lines = frame.split('\n');
        let eventType = 'message';
        let data = null;

        for (const line of lines) {
            if (line.startsWith('event: ')) {
                eventType = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
                const dataStr = line.substring(6).trim();
                try {
                    data = JSON.parse(dataStr);
                } catch (e) {
                    data = dataStr;
                }
            }
        }

        if (data) {
            this.onEvent(eventType, data);
        }
    }

    onEvent(type, data) {
        console.log('SSE Event:', type, data);
    }

    abort() {
        if (this.currentStream) {
            this.currentStream.abort();
            this.currentStream = null;
        }
    }
}

class AgentUI {
    constructor() {
        this.client = new AgentClient();
        this.client.onEvent = this.handleEvent.bind(this);
        this.currentQuestions = null;
        this.conversationHistory = [];
    }

    async startConversation(userInput, model, mcpServer = 'auto') {
        const streamLog = document.getElementById('agentStreamLog');
        streamLog.innerHTML = '';
        
        const agentResult = document.getElementById('agentResult');
        agentResult.innerHTML = '';
        
        this.addLogEntry('user', userInput);
        
        const context = {};
        if (mcpServer !== 'auto') {
            context.mcpServer = mcpServer;
        }

        await this.client.startStream(userInput, model, context);
    }

    handleEvent(type, data) {
        console.log('Agent event:', type, data);

        switch (type) {
            case 'connected':
                this.addLogEntry('system', '✓ Connected to agent');
                break;

            case 'heartbeat':
                break;

            case 'analyzing':
                this.addLogEntry('agent', '🔍 ' + (data.message || 'Analyzing your request...'));
                break;

            case 'generating':
                this.addLogEntry('agent', '⚙️ ' + (data.message || 'Generating form...'));
                break;

            case 'session_started':
                if (data.sessionId) {
                    this.client.sessionId = data.sessionId;
                    console.log('Session started:', data.sessionId);
                }
                break;

            case 'question':
                if (data.question) {
                    this.handleSingleQuestion(data);
                } else if (data.questions) {
                    this.handleQuestions(data.questions);
                }
                break;

            case 'file_upload_request':
                this.handleFileUploadRequest(data);
                break;

            case 'complete':
                this.addLogEntry('agent', '✅ Complete!');
                if (data) {
                    if (data.mode === 'web_component' && data.component) {
                        this.displayWebComponent(data.component);
                    } else if (data.component) {
                        this.displayWebComponent(data.component);
                    } else if (data.schema) {
                        this.displayForm(data.schema);
                    } else if (data.formSchema) {
                        this.displayForm(data.formSchema);
                    }
                }
                break;

            case 'result':
                if (data.mode === 'web_component' && data.component) {
                    this.displayWebComponent(data.component);
                } else if (data.component) {
                    this.displayWebComponent(data.component);
                } else if (data.schema) {
                    this.displayForm(data.schema);
                } else if (data.formSchema) {
                    this.displayForm(data.formSchema);
                } else if (data.form) {
                    this.displayForm(data.form);
                } else if (data.action === 'generate') {
                    this.addLogEntry('agent', '✅ Form data collected. Ready to generate form.');
                    this.addLogEntry('system', 'Extracted: ' + JSON.stringify(data.extractedData || {}, null, 2));
                } else {
                    this.addLogEntry('agent', '✅ Result: ' + JSON.stringify(data, null, 2));
                }
                break;

            case 'error':
                this.addLogEntry('error', '❌ Error: ' + (data.message || 'Unknown error'));
                break;

            default:
                this.addLogEntry('system', `[${type}] ${JSON.stringify(data)}`);
        }
    }

    addLogEntry(type, message) {
        const streamLog = document.getElementById('agentStreamLog');
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.setAttribute('role', 'status');
        entry.setAttribute('aria-live', 'polite');
        
        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-message">${this.escapeHtml(message)}</span>`;
        
        streamLog.appendChild(entry);
        streamLog.scrollTop = streamLog.scrollHeight;
    }

    handleSingleQuestion(data) {
        const { question, questionNumber, maxQuestions } = data;
        
        const progressText = maxQuestions ? ` (${questionNumber}/${maxQuestions})` : '';
        this.addLogEntry('agent', `❓${progressText} ${question}`);

        const streamLog = document.getElementById('agentStreamLog');
        const questionContainer = document.createElement('div');
        questionContainer.className = 'chatbot-input-container';
        questionContainer.innerHTML = `
            <div class="chatbot-input-wrapper">
                <input type="text" id="chatAnswer" class="chatbot-input" placeholder="Type your message..." autofocus>
                <button class="chatbot-send-btn" id="sendAnswer" title="Send message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        `;

        streamLog.appendChild(questionContainer);
        streamLog.scrollTop = streamLog.scrollHeight;

        const sendAnswer = () => {
            const input = document.getElementById('chatAnswer');
            const answer = input?.value?.trim();
            
            if (!answer) {
                return;
            }

            questionContainer.remove();
            this.addLogEntry('user', answer);
            this.client.continueSession(answer);
        };

        document.getElementById('sendAnswer').addEventListener('click', sendAnswer);
        document.getElementById('chatAnswer').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendAnswer();
            }
        });

        document.getElementById('chatAnswer')?.focus();
    }

    handleFileUploadRequest(data) {
        const { message, accept, endpoint, sessionId } = data;
        
        this.addLogEntry('agent', `📎 ${message || 'Please upload your invoice/receipt'}`);

        const streamLog = document.getElementById('agentStreamLog');
        const uploadContainer = document.createElement('div');
        uploadContainer.className = 'file-upload-request-container';
        uploadContainer.innerHTML = `
            <div class="file-upload-request">
                <div class="file-upload-dropzone" id="fileDropzone">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p>Drag & drop your invoice here or</p>
                    <label class="file-upload-btn">
                        <input type="file" id="invoiceFileInput" accept="${accept || 'image/*,application/pdf'}" style="display: none;">
                        Browse Files
                    </label>
                </div>
                <div id="fileUploadStatus" class="file-upload-status"></div>
                <button class="chatbot-send-btn skip-upload-btn" id="skipUpload" title="Skip and continue without file">
                    Skip
                </button>
            </div>
        `;

        streamLog.appendChild(uploadContainer);
        streamLog.scrollTop = streamLog.scrollHeight;

        const fileInput = document.getElementById('invoiceFileInput');
        const dropzone = document.getElementById('fileDropzone');
        const statusDiv = document.getElementById('fileUploadStatus');

        const processFile = async (file) => {
            if (!file) return;

            statusDiv.innerHTML = '<span class="ocr-processing">Processing invoice with OCR...</span>';

            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(endpoint || '/api/v1/ocr/invoice', {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (result.success && result.enrichedFields) {
                    statusDiv.innerHTML = '<span class="ocr-success">Invoice processed successfully!</span>';
                    
                    // Store enriched fields in session
                    this.addLogEntry('system', 'Extracted from invoice: ' + JSON.stringify(result.enrichedFields, null, 2));
                    
                    // Mark OCR as processed and continue session with enriched data
                    uploadContainer.remove();
                    this.client.continueSession('OCR_PROCESSED:' + JSON.stringify(result.enrichedFields));
                } else {
                    statusDiv.innerHTML = `<span class="ocr-error">OCR failed: ${result.error || 'Unknown error'}</span>`;
                }
            } catch (error) {
                console.error('File upload error:', error);
                statusDiv.innerHTML = `<span class="ocr-error">Upload error: ${error.message}</span>`;
            }
        };

        fileInput.addEventListener('change', (e) => {
            processFile(e.target.files[0]);
        });

        // Drag and drop handlers
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            processFile(file);
        });

        // Skip button - continue without file
        document.getElementById('skipUpload').addEventListener('click', () => {
            uploadContainer.remove();
            this.addLogEntry('user', 'Skipped file upload');
            this.client.continueSession('SKIP_FILE_UPLOAD');
        });
    }

    handleQuestions(questions) {
        if (!questions || questions.length === 0) return;

        this.currentQuestions = questions;
        this.addLogEntry('agent', '❓ I need some more information:');

        const streamLog = document.getElementById('agentStreamLog');
        const questionContainer = document.createElement('div');
        questionContainer.className = 'question-container';
        questionContainer.innerHTML = `
            <div class="questions">
                ${questions.map((q, i) => `
                    <div class="question-field">
                        <label for="answer_${i}">${this.escapeHtml(q)}</label>
                        <input type="text" id="answer_${i}" class="answer-input" placeholder="Your answer...">
                    </div>
                `).join('')}
                <button class="btn" id="submitAnswers">Submit Answers</button>
            </div>
        `;

        streamLog.appendChild(questionContainer);
        streamLog.scrollTop = streamLog.scrollHeight;

        document.getElementById('submitAnswers').addEventListener('click', () => {
            this.submitAnswers();
        });

        document.getElementById('answer_0')?.focus();
    }

    submitAnswers() {
        const answers = [];
        for (let i = 0; i < this.currentQuestions.length; i++) {
            const input = document.getElementById(`answer_${i}`);
            if (input) {
                answers.push(input.value);
            }
        }

        const answersText = this.currentQuestions.map((q, i) => 
            `${q} ${answers[i]}`
        ).join('. ');

        this.addLogEntry('user', answersText);

        const model = document.getElementById('modelSelect').value;
        const mcpServer = document.getElementById('mcpServerSelect').value;
        
        this.client.startStream(answersText, model, { mcpServer });
    }

    displayForm(formSchema) {
        const agentResult = document.getElementById('agentResult');
        
        if (typeof displayGeneratedForm === 'function') {
            agentResult.innerHTML = '';
            const tempDiv = document.createElement('div');
            document.body.appendChild(tempDiv);
            tempDiv.id = 'temp-result';
            
            const originalResultDiv = document.getElementById('result');
            const tempResultDiv = document.getElementById('temp-result');
            if (originalResultDiv) {
                document.getElementById('result').id = 'result-backup';
            }
            tempDiv.id = 'result';
            
            displayGeneratedForm(formSchema, true);
            
            agentResult.innerHTML = tempDiv.innerHTML;
            tempDiv.remove();
            
            if (originalResultDiv) {
                document.getElementById('result-backup').id = 'result';
            }
        } else {
            agentResult.innerHTML = `
                <div class="success">✅ Form generated successfully!</div>
                <div class="generated-form">
                    <h3>${this.escapeHtml(formSchema.title || 'Generated Form')}</h3>
                    <p>${this.escapeHtml(formSchema.description || '')}</p>
                    <pre>${JSON.stringify(formSchema, null, 2)}</pre>
                </div>
            `;
        }
    }

    async displayWebComponent(componentData) {
        const agentResult = document.getElementById('agentResult');
        
        this.addLogEntry('system', '🎨 Loading web component...');

        try {
            agentResult.innerHTML = `
                <div class="success">✅ Web component generated successfully!</div>
                <div id="componentContainer" style="margin-top: 20px;"></div>
            `;

            const selector = componentData.selector || 'generated-form-component';
            
            if (componentData.javascriptUrl) {
                const script = document.createElement('script');
                script.src = componentData.javascriptUrl;
                script.async = false;
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Component loading timeout'));
                    }, 5000);
                    
                    script.onload = async () => {
                        try {
                            await customElements.whenDefined(selector);
                            clearTimeout(timeout);
                            resolve();
                        } catch (err) {
                            clearTimeout(timeout);
                            reject(err);
                        }
                    };
                    
                    script.onerror = () => {
                        clearTimeout(timeout);
                        reject(new Error('Failed to load component script'));
                    };
                    
                    document.body.appendChild(script);
                });
            } else if (componentData.javascript) {
                console.log('[AgentUI] Injecting inline component script, selector:', selector);
                const script = document.createElement('script');
                script.textContent = componentData.javascript;
                document.body.appendChild(script);
                
                // Add timeout for inline scripts too
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Component registration timeout - the script may have failed to execute due to CSP or syntax error'));
                    }, 5000);
                    
                    customElements.whenDefined(selector).then(() => {
                        clearTimeout(timeout);
                        console.log('[AgentUI] Custom element defined:', selector);
                        resolve();
                    }).catch(err => {
                        clearTimeout(timeout);
                        reject(err);
                    });
                });
            }

            const container = document.getElementById('componentContainer');
            const component = document.createElement(selector);
            
            component.addEventListener('formSubmit', (e) => {
                console.log('Form submitted from web component:', e.detail);
                this.addLogEntry('system', '📝 Form submitted: ' + JSON.stringify(e.detail, null, 2));
            });

            container.appendChild(component);
            
            this.addLogEntry('system', '✅ Web component loaded and mounted');
        } catch (error) {
            console.error('Failed to load web component:', error);
            this.addLogEntry('error', 'Failed to load web component: ' + error.message + '. Showing fallback form.');
            
            // Fallback: render form data as regular HTML form
            this.displayFallbackForm(componentData, agentResult, error.message);
        }
    }

    displayFallbackForm(componentData, container, errorMessage) {
        const fields = componentData.fields || [];
        const data = componentData.data || {};
        
        let fieldsHtml = fields.map(field => {
            const fieldName = typeof field === 'string' ? field : field.name;
            const fieldLabel = typeof field === 'string' ? this.formatFieldName(field) : (field.label || this.formatFieldName(field.name));
            const fieldType = typeof field === 'string' ? 'text' : (field.type || 'text');
            const fieldValue = data[fieldName] || '';
            const fieldRequired = typeof field === 'string' ? false : (field.required || false);
            
            if (fieldType === 'select') {
                const options = (typeof field === 'object' && field.options) ? field.options : [];
                const optionsHtml = options.map(opt => {
                    const optValue = opt.value || opt;
                    const optLabel = opt.label || opt.value || opt;
                    const selected = optValue === fieldValue ? 'selected' : '';
                    return `<option value="${this.escapeHtml(optValue)}" ${selected}>${this.escapeHtml(optLabel)}</option>`;
                }).join('');
                return `
                    <div class="form-field">
                        <label for="${fieldName}">${this.escapeHtml(fieldLabel)}${fieldRequired ? ' *' : ''}</label>
                        <select id="${fieldName}" name="${fieldName}" ${fieldRequired ? 'required' : ''}>
                            <option value="" disabled ${!fieldValue ? 'selected' : ''}>Select...</option>
                            ${optionsHtml}
                        </select>
                    </div>
                `;
            } else if (fieldType === 'textarea') {
                return `
                    <div class="form-field">
                        <label for="${fieldName}">${this.escapeHtml(fieldLabel)}${fieldRequired ? ' *' : ''}</label>
                        <textarea id="${fieldName}" name="${fieldName}" rows="4" ${fieldRequired ? 'required' : ''}>${this.escapeHtml(fieldValue)}</textarea>
                    </div>
                `;
            } else {
                return `
                    <div class="form-field">
                        <label for="${fieldName}">${this.escapeHtml(fieldLabel)}${fieldRequired ? ' *' : ''}</label>
                        <input type="${fieldType}" id="${fieldName}" name="${fieldName}" value="${this.escapeHtml(fieldValue)}" ${fieldRequired ? 'required' : ''}>
                    </div>
                `;
            }
        }).join('');
        
        container.innerHTML = `
            <div class="warning" style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                <strong>Note:</strong> Web component failed to load (${this.escapeHtml(errorMessage)}). Showing standard form instead.
            </div>
            <div class="demo-section">
                <h3>Generated Form</h3>
                <form id="fallbackForm" class="generated-form">
                    ${fieldsHtml}
                    <button type="submit" class="submit-btn">Submit</button>
                </form>
            </div>
        `;
        
        // Add submit handler
        const form = container.querySelector('#fallbackForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const formDataObj = {};
                formData.forEach((value, key) => {
                    formDataObj[key] = value;
                });
                console.log('Fallback form submitted:', formDataObj);
                this.addLogEntry('system', 'Form submitted: ' + JSON.stringify(formDataObj, null, 2));
            });
        }
    }

    formatFieldName(field) {
        return field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let agentUI = null;

document.addEventListener('DOMContentLoaded', function() {
    agentUI = new AgentUI();
    
    const agentBtn = document.getElementById('generateAgentBtn');
    const promptField = document.getElementById('prompt');
    
    if (agentBtn && promptField) {
        agentBtn.addEventListener('click', () => {
            const prompt = promptField.value;
            const model = document.getElementById('modelSelect').value;
            const mcpServer = document.getElementById('mcpServerSelect').value;
            
            if (!prompt.trim()) {
                alert('Please enter a form description');
                return;
            }
            
            console.log('[AgentUI] Starting new conversation with prompt:', prompt);
            agentUI.startConversation(prompt, model, mcpServer);
            
            promptField.value = '';
            promptField.focus();
        });
        
        promptField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                agentBtn.click();
            }
        });
    }
});
