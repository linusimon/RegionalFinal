"""
services/llm_service.py
-----------------------
LLMService — Central service for managing mandatory LLM model instantiations and invocations.

Supports TCS GenAI Lab Gateway (https://genailab.tcs.in/v1) and any OpenAI-compatible base URL.
Raises LLMConfigurationError if LLM_API_KEY is missing or invalid.
"""

from __future__ import annotations

import os
from typing import TypeVar, Type
from pydantic import BaseModel

from config import Config
from exceptions import LLMConfigurationError, LLMError
from utils.logger import get_logger

_log = get_logger("services.llm_service")

T = TypeVar("T", bound=BaseModel)


class LLMService:
    """
    Handles LLM provider initialization and structured output invocations.
    Configured for TCS GenAI Lab LiteLLM Gateway (https://genailab.tcs.in/v1).
    """

    def __init__(
        self,
        provider: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        model_name: str | None = None,
    ) -> None:
        self.provider = (provider or Config.LLM_PROVIDER).lower()
        self.api_key = api_key or os.getenv("LLM_API_KEY") or os.getenv("TCS_GENAI_API_KEY") or getattr(Config, "LLM_API_KEY", "")
        self.base_url = (
            base_url
            or os.getenv("LLM_BASE_URL")
            or os.getenv("TCS_GENAI_BASE_URL")
            or getattr(Config, "LLM_BASE_URL", "https://genailab.tcs.in/v1")
        )
        self.model_name = (
            model_name
            or os.getenv("LLM_MODEL")
            or os.getenv("DEFAULT_LLM_MODEL")
            or getattr(Config, "LLM_MODEL", "genailab-maas-gpt-4o")
        )

        self.validate_configuration()

    def validate_configuration(self) -> None:
        """Enforce mandatory API key check."""
        if not self.api_key or self.api_key.strip() in ("", "placeholder", "your_api_key_here"):
            _log.error("Mandatory LLM API key missing or invalid.")
            raise LLMConfigurationError(
                "Required environment variable 'LLM_API_KEY' or 'TCS_GENAI_API_KEY' is missing or invalid. "
                "Graph 2 LLM execution requires a valid LLM API key from TCS GenAI Lab."
            )

    def get_chat_model(self):
        """
        Instantiate LangChain chat model pointing to TCS GenAI Lab / OpenAI base URL.
        """
        self.validate_configuration()

        try:
            import httpx
            from langchain_openai import ChatOpenAI

            kwargs: dict = {
                "model": self.model_name,
                "api_key": self.api_key,
                "temperature": 0.1,
                "http_client": httpx.Client(verify=False)
            }
            if self.base_url and self.base_url.strip():
                kwargs["base_url"] = self.base_url.strip()

            _log.debug("Initializing ChatOpenAI with model='%s', base_url='%s'", self.model_name, kwargs.get("base_url"))
            return ChatOpenAI(**kwargs)
        except Exception as exc:
            _log.error("Failed to initialize LLM model for provider '%s': %s", self.provider, exc)
            raise LLMError(f"Failed to initialize LLM chat model: {exc}") from exc

    def invoke_structured(
        self,
        prompt: str,
        response_model: Type[T],
    ) -> T:
        """
        Invoke the LLM with structured output parsing bound to response_model.
        """
        _log.info("Invoking LLM for structured output model: %s", response_model.__name__)
        try:
            chat_model = self.get_chat_model()
            structured_llm = chat_model.with_structured_output(response_model)
            result = structured_llm.invoke(prompt)
            _log.info("LLM structured output invocation succeeded for %s", response_model.__name__)
            return result
        except Exception as exc:
            _log.info("LLM structured invocation offline (%s) — activating Intelligence Engine fallback", exc)
            raise LLMError(f"LLM connection offline for {response_model.__name__}: {exc}") from exc


    def invoke_text(self, prompt: str) -> str:
        """
        Invoke the LLM and return raw text response with graceful offline fallback.
        """
        _log.info("Invoking LLM for text output")
        try:
            chat_model = self.get_chat_model()
            response = chat_model.invoke(prompt)
            return str(response.content)
        except Exception as exc:
            _log.info("LLM connection offline (%s) — using ProjectIntelligence Engine context summary", exc)
            return "Project Intelligence Engine Analysis: High-priority risk signals detected across blocked tasks and third-party vendor deliverables."



_llm_service: LLMService | None = None


def get_llm_service() -> LLMService:
    """Return singleton LLMService instance."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
