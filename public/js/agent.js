
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

            case 'complete':
                this.addLogEntry('agent', '✅ Complete!');
                break;

            case 'result':
                if (data.mode === 'web_component' && data.component) {
                    this.displayWebComponent(data.component);
                } else if (data.schema) {
                    this.displayForm(data.schema);
                } else if (data.formSchema) {
                    this.displayForm(data.formSchema);
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
        questionContainer.className = 'chat-question-container';
        questionContainer.innerHTML = `
            <div class="chat-input-row">
                <input type="text" id="chatAnswer" class="chat-answer-input" placeholder="Type your answer..." autofocus>
                <button class="btn chat-send-btn" id="sendAnswer">Send</button>
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
                const script = document.createElement('script');
                script.textContent = componentData.javascript;
                document.body.appendChild(script);
                
                await customElements.whenDefined(selector);
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
            this.addLogEntry('error', 'Failed to load web component: ' + error.message);
            
            agentResult.innerHTML = `
                <div class="error">❌ Failed to load web component: ${this.escapeHtml(error.message)}</div>
                <div class="demo-section" style="margin-top: 20px;">
                    <p>The component could not be loaded. This may be due to Content Security Policy restrictions.</p>
                </div>
            `;
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
