class BackendClient {
  constructor(baseUrl = 'http://localhost:8040/api') {
    this.baseUrl = baseUrl;
    this.rootUrl = 'http://localhost:8040';
  }

  async isRunning() {
    try {
      const response = await fetch(this.rootUrl, { signal: AbortSignal.timeout(1000) });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async chatCompletion(messages, onData, options = {}) {
    const { provider = 'openai', model = null, stream = true, session_id = 'default', repoStructure = null, basePath = null } = options;

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
          stream,
          session_id,
          repo_structure: repoStructure,
          base_path: basePath
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (onData) onData(data);
          } catch (e) {
            // Ignore partial lines
          }
        }
      }
    } catch (error) {
      console.error('Error connecting to backend:', error.message);
      throw error;
    }
  }

  async approveStep(sessionId, stepId, basePath, options = {}) {
    const { provider = 'openai', model = null, repoStructure = null } = options;
    const response = await fetch(`${this.baseUrl}/chat/steps/${sessionId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        step_id: stepId, 
        base_path: basePath,
        provider,
        model,
        repo_structure: repoStructure
      }),
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return await response.json();
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

  async getModelTags(modelName) {
    const response = await fetch(`${this.baseUrl}/models/tags/${modelName}`);
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
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (onProgress) onProgress(data);
          } catch (e) {
          }
        }
      }
    } catch (error) {
      console.error('Error installing model:', error.message);
      throw error;
    }
  }

  async uninstallModel(modelName) {
    const response = await fetch(`${this.baseUrl}/models/uninstall/${modelName}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);
    return await response.json();
  }
}

module.exports = BackendClient;
