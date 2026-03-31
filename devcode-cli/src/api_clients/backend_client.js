class BackendClient {
  constructor(baseUrl = 'http://localhost:8040/api') {
    this.baseUrl = baseUrl;
  }

  async chatCompletion(messages, onToken, options = {}) {
    const { provider = 'openai', model = null, stream = true } = options;

    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          provider,
          model,
          stream
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
      }

      if (stream) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          if (onToken) {
            onToken(chunk);
          }
        }
      } else {
        return await response.json();
      }
    } catch (error) {
      console.error('Error connecting to backend:', error.message);
      throw error;
    }
  }

  async getInstalledModels() {
    const response = await fetch(`${this.baseUrl}/models/installed`);
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return await response.json();
  }

  async getAvailableModels() {
    const response = await fetch(`${this.baseUrl}/models/available`);
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return await response.json();
  }

  async installModel(modelName, onProgress) {
    try {
      const response = await fetch(`${this.baseUrl}/models/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (onProgress) {
                onProgress(data);
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error installing model:', error.message);
      throw error;
    }
  }
}

module.exports = BackendClient;
