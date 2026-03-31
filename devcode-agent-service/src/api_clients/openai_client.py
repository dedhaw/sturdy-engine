from openai import AsyncOpenAI
import os

class OpenAIClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key)

    async def chat_completion(self, messages, model="gpt-4o-mini", stream=True):
        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=stream
            )
            
            if stream:
                async for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            else:
                yield response.choices[0].message.content
        except Exception as e:
            yield f"Error: {str(e)}"
