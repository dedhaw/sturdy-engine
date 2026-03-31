class BackendClient {
  constructor(baseUrl = 'http://localhost:8040') {
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
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep the last partial line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (onToken) {
                onToken(data);
              }
            } catch (e) {
              console.error('Error parsing JSON from stream:', e, line);
            }
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
}

module.exports = BackendClient;
