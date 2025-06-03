const vscode = require('vscode');
const http = require('http');

class OfflineAIClient {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
    }

    async isRunning() {
        return new Promise((resolve) => {
            const req = http.get(`${this.baseUrl}/api/tags`, (res) => {
                resolve(res.statusCode === 200);
            });
            
            req.on('error', () => {
                resolve(false);
            });
            
            req.setTimeout(5000, () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    async getAvailableModels() {
        return new Promise((resolve, reject) => {
            const req = http.get(`${this.baseUrl}/api/tags`, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response.models || []);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
        });
    }

    async modelExists(modelName) {
        try {
            const models = await this.getAvailableModels();
            return models.some(model => model.name.includes(modelName));
        } catch (error) {
            throw new Error(`Failed to check model existence: ${error.message}`);
        }
    }

    async downloadModel(modelName, progressCallback = null) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ name: modelName });
            
            const options = {
                hostname: 'localhost',
                port: 11434,
                path: '/api/pull',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = http.request(options, (res) => {
                let buffer = '';
                
                res.on('data', (chunk) => {
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    
                    lines.forEach(line => {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                
                                if (progressCallback && data.status) {
                                    progressCallback(data);
                                }
                                
                                if (data.status && data.status.includes('success')) {
                                    resolve();
                                }
                                
                            } catch (parseError) {
                                // Ignore JSON parse errors for partial chunks
                            }
                        }
                    });
                });
                
                res.on('end', () => {
                    if (buffer.trim()) {
                        try {
                            const data = JSON.parse(buffer);
                            if (data.status && data.status.includes('success')) {
                                resolve();
                            }
                        } catch (parseError) {
                            resolve();
                        }
                    } else {
                        resolve();
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(new Error(`Download failed: ${error.message}`));
            });
            
            req.write(postData);
            req.end();
        });
    }

    // Chat completion with streaming
    async chatCompletion(messages, onToken = null, model = null) {
        const selectedModel = model || this.getSelectedModel();
        if (!selectedModel) {
            throw new Error('No model selected');
        }

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                model: selectedModel,
                messages: messages,
                stream: true
            });
            
            const options = {
                hostname: 'localhost',
                port: 11434,
                path: '/api/chat',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = http.request(options, (res) => {
                let buffer = '';
                
                res.on('data', (chunk) => {
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    
                    lines.forEach(line => {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                
                                if (data.message && data.message.content && onToken) {
                                    onToken(data.message.content);
                                }
                                
                                if (data.done) {
                                    resolve();
                                }
                                
                            } catch (parseError) {
                                // Ignore parse errors for partial chunks
                            }
                        }
                    });
                });
                
                res.on('end', () => {
                    resolve();
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.write(postData);
            req.end();
        });
    }

    async saveSelectedModel(modelName) {
        const config = vscode.workspace.getConfiguration('devcode');
        await config.update('selectedModel', modelName, vscode.ConfigurationTarget.Global);
    }

    getSelectedModel() {
        const config = vscode.workspace.getConfiguration('devcode');
        return config.get('selectedModel');
    }

    getModelFamilies() {
        return [
            { 
                label: 'DeepSeek r1', 
                description: 'Advanced reasoning and problem-solving',
                value: 'deepseek-r1' 
            },
            { 
                label: 'Llama 3.2', 
                description: 'General purpose, well-balanced performance',
                value: 'llama3.2' 
            },
            { 
                label: 'Code Llama', 
                description: 'Specialized for code generation and programming',
                value: 'codellama' 
            },
            { 
                label: 'Mistral', 
                description: 'Fast and efficient general-purpose model',
                value: 'mistral' 
            },
            { 
                label: 'Phi 3', 
                description: 'Microsoft\'s compact high-performance model',
                value: 'phi3' 
            },
            { 
                label: 'Qwen2.5 Coder', 
                description: 'Excellent for coding and technical tasks',
                value: 'qwen2.5-coder' 
            }
        ];
    }

    getModelSizes(modelFamily) {
        const sizes = {
            'deepseek-r1': [
                { label: '7B - Fast responses (4.9GB)', value: 'deepseek-r1:7b', size: '4.9GB' },
                { label: '14B - Balanced performance (8.9GB)', value: 'deepseek-r1:14b', size: '8.9GB' },
                { label: '32B - Best quality (19GB)', value: 'deepseek-r1:32b', size: '19GB' }
            ],
            'llama3.2': [
                { label: '1B - Ultra fast (1.3GB)', value: 'llama3.2:1b', size: '1.3GB' },
                { label: '3B - Good balance (2.0GB)', value: 'llama3.2:3b', size: '2.0GB' }
            ],
            'codellama': [
                { label: '7B - Code focused (3.8GB)', value: 'codellama:7b', size: '3.8GB' },
                { label: '13B - Advanced coding (7.3GB)', value: 'codellama:13b', size: '7.3GB' },
                { label: '34B - Expert level (19GB)', value: 'codellama:34b', size: '19GB' }
            ],
            'mistral': [
                { label: '7B - Efficient and fast (4.1GB)', value: 'mistral:7b', size: '4.1GB' }
            ],
            'phi3': [
                { label: 'Mini - Compact (2.3GB)', value: 'phi3:mini', size: '2.3GB' },
                { label: 'Medium - Balanced (7.9GB)', value: 'phi3:medium', size: '7.9GB' }
            ],
            'qwen2.5-coder': [
                { label: '1.5B - Quick coding (1.0GB)', value: 'qwen2.5-coder:1.5b', size: '1.0GB' },
                { label: '7B - Professional coding (4.2GB)', value: 'qwen2.5-coder:7b', size: '4.2GB' },
                { label: '14B - Expert coding (8.1GB)', value: 'qwen2.5-coder:14b', size: '8.1GB' }
            ]
        };
        
        return sizes[modelFamily] || [];
    }
}

module.exports = OfflineAIClient;