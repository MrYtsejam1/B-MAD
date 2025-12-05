
class AgentClient {
    constructor() {
        this.currentStream = null;
        this.sessionId = this.generateSessionId();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async startStream(userInput, model, context = {}) {
        if (this.currentStream) {
            console.log('Aborting previous stream');
            this.currentStream.abort();
        }

        this.currentStream = new AbortController();

        try {
            const response = await fetch('/api/v1/agent/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer demo_token'
                },
                body: JSON.stringify({
                    userInput,
                    sessionId: this.sessionId,
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
                buffer = frames.pop() || ''; // Keep incomplete frame in buffer

                for (const frame of frames) {
                    if (frame.trim()) {
                        this.processFrame(frame);
                    }
                }
            }
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

            case 'question':
                this.handleQuestions(data.questions);
                break;

            case 'complete':
                this.addLogEntry('agent', '✅ Complete!');
                if (data.formSchema) {
                    this.displayForm(data.formSchema);
                }
                break;

            case 'result':
                if (data.formSchema) {
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
    if (agentBtn) {
        agentBtn.addEventListener('click', () => {
            const prompt = document.getElementById('prompt').value;
            const model = document.getElementById('modelSelect').value;
            const mcpServer = document.getElementById('mcpServerSelect').value;
            
            if (!prompt.trim()) {
                alert('Please enter a form description');
                return;
            }
            
            agentUI.startConversation(prompt, model, mcpServer);
        });
    }
});
