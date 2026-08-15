import json
import os
import urllib.request
from django.conf import settings


class OpenAIClientError(Exception):
    """Exception raised when the OpenAI API call fails."""

    pass


class OpenAIClientWrapper:
    """
    Thin, server-side wrapper for OpenAI Chat Completions API.
    Ref: TRD.md §9.1
    """

    def __init__(self, api_key: str | None = None, model: str = "gpt-4o"):
        self.api_key = api_key or getattr(
            settings, "OPENAI_API_KEY", os.getenv("OPENAI_API_KEY", "")
        )
        self.model = model

    def create_chat_completion(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        tool_choice: str | dict | None = None,
        temperature: float = 0.7,
        response_format: dict | None = None,
    ) -> dict:
        """
        Executes a chat completion request to OpenAI API.
        Returns raw JSON dictionary response from OpenAI.
        """
        if not self.api_key or self.api_key == "mock":
            # Mock response mode for testing or offline dev
            return self._mock_completion_response(messages, tools)

        url = "https://api.openai.com/v1/chat/completions"
        payload: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        if tools:
            payload["tools"] = tools
        if tool_choice:
            payload["tool_choice"] = tool_choice
        if response_format:
            payload["response_format"] = response_format

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status != 200:
                    raise OpenAIClientError(f"OpenAI API returned HTTP {resp.status}")
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            if isinstance(e, OpenAIClientError):
                raise e
            raise OpenAIClientError(f"OpenAI API connection failed: {e}") from e

    def _mock_completion_response(self, messages: list[dict], tools: list[dict] | None) -> dict:
        """Generates a structured mock response for offline dev & testing."""
        return {
            "id": "chatcmpl-mock-123",
            "object": "chat.completion",
            "created": 1700000000,
            "model": self.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": json.dumps(
                            {
                                "message": {"role": "assistant"},
                                "content": [
                                    {
                                        "type": "text",
                                        "content": "Welcome to City Companion! I found matching options in Kanpur.",
                                    }
                                ],
                            }
                        ),
                    },
                    "finish_reason": "stop",
                }
            ],
        }
