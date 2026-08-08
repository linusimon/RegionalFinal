"""
Microsoft Presidio Security & PII Guardrail Engine (backend/app/core/microsoft_presidio_guardrails.py)
Production-grade PII detection and anonymization using real presidio-analyzer + presidio-anonymizer.
Features:
  - Real NLP-based PII entity recognition via spaCy NER
  - Entities: PERSON, ORG, LOCATION, EMAIL, PHONE, SSN, CREDIT_CARD, IP, DATE_TIME
  - Prompt injection & jailbreak pattern detection (fast regex pre-filter)
  - Domain relevance check -- blocks off-topic queries before LLM
  - Output leakage scanning on LLM responses
  - Audit logging to SQLite audit_logs table
  - App-appropriate user-friendly block messages
"""

import re
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Prompt Injection & Security Patterns (OWASP LLM Top 10)
_INJECTION_PATTERNS = [
    r'ignore\s+(all\s+)?(previous\s+)?instructions',
    r'disregard\s+(all\s+)?prior\s+prompts',
    r'reveal\s+(system\s+)?prompt',
    r'show\s+(me\s+)?(the\s+)?system\s+instructions',
    r'output\s+(all\s+)?secret\s+keys',
    r'print\s+(the\s+)?env(ironment)?\s+variables',
    r'pretend\s+you\s+are\s+dan',
    r'bypass\s+(safety\s+)?guardrails',
    r'jailbreak',
    r'act\s+as\s+an\s+unfiltered\s+ai',
    r'do\s+anything\s+now',
]

# Toxicity / Harmful Language Patterns
_TOXICITY_PATTERNS = [
    r'\b(kill|hate|exploit|attack|malware|ransomware|hack|phish)\b',
    r'\b(fuck|shit|bitch|bastard|asshole|cunt)\b',
]

# Domain Relevance Keywords (Program Management)
_PM_KEYWORDS = [
    'project', 'risk', 'mitigation', 'wbs', 'task', 'delay', 'budget',
    'timeline', 'schedule', 'raid', 'issue', 'dependency', 'assumption',
    'status', 'report', 'stakeholder', 'sow', 'sop', 'vendor', 'sprint',
    'phase', 'mobilization', 'planning', 'design', 'execution', 'closure',
    'compliance', 'audit', 'security', 'team', 'resource', 'milestone',
    'prj', 'email', 'escalate', 'blocker', 'health', 'progress', 'owner',
    'cost', 'spent', 'action', 'review', 'meeting', 'update', 'summary',
    'critical path', 'onboarding', 'handover', 'sign-off',
]

# Regex Fallback PII Patterns (used if Presidio library unavailable)
_PII_REGEX_FALLBACK = {
    'EMAIL_ADDRESS': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    'PHONE_NUMBER':  r'\b(?:\+?[\d\s\-().]{7,15})\b',
    'US_SSN':        r'\b\d{3}-\d{2}-\d{4}\b',
    'CREDIT_CARD':   r'\b(?:\d{4}[-. ]?){3}\d{4}\b',
    'IP_ADDRESS':    r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
    'SECRET_KEY':    r'\b(sk-[a-zA-Z0-9]{20,}|bearer\s+[a-zA-Z0-9._-]{20,})\b',
}

# App-Appropriate User-Facing Block Messages
_BLOCK_MESSAGES = {
    'injection':  "I'm not able to process that request. Please ask a project or risk management question.",
    'toxic':      "Please keep queries professional. I'm here to help with project risks, RAID items, and stakeholder communication.",
    'irrelevant': "I'm focused on project management. Try asking about risks, tasks, RAID items, budget, or team updates for your project.",
    'pii_note':   "Sensitive information in your message was anonymized before processing.",
}

# Lazy-Loaded Presidio Engines (initialized once on first use)
_presidio_analyzer = None
_presidio_anonymizer = None
_presidio_available = None  # None = not yet checked


def _get_presidio_engines():
    """Lazy-load Presidio engines on first use. Falls back gracefully if unavailable."""
    global _presidio_analyzer, _presidio_anonymizer, _presidio_available
    if _presidio_available is not None:
        return _presidio_analyzer, _presidio_anonymizer
    try:
        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine
        _presidio_analyzer = AnalyzerEngine()
        _presidio_anonymizer = AnonymizerEngine()
        _presidio_available = True
        logger.info("[Presidio] Engine loaded successfully.")
    except Exception as e:
        _presidio_available = False
        logger.warning("[Presidio] Library not available (%s). Using regex fallback.", e)
    return _presidio_analyzer, _presidio_anonymizer


@dataclass
class PresidioGuardrailResult:
    is_safe: bool
    action: str                          # 'ALLOW' | 'ANONYMIZE' | 'BLOCK'
    original_text: str
    sanitized_text: str
    detected_entities: List[Dict[str, Any]] = field(default_factory=list)
    reason: Optional[str] = None
    user_message: Optional[str] = None  # App-appropriate message shown in chat UI


class MicrosoftPresidioGuardrailEngine:
    """
    Production-grade Microsoft Presidio Security & PII Guardrail Engine.
    Pipeline: Injection Check -> Toxicity Check -> Relevance Check -> PII Detection -> ALLOW/ANONYMIZE
    """

    @classmethod
    def analyze_and_anonymize_input(
        cls,
        text: str,
        user_name: str = 'System User',
        project_code: str = 'PRJ-001'
    ) -> PresidioGuardrailResult:
        """
        Full input guardrail pipeline:
          1. Prompt injection / jailbreak detection (fast regex pre-filter)
          2. Toxicity / harmful language detection (fast regex)
          3. Domain relevance check (blocks off-topic queries before LLM)
          4. PII detection & anonymization (real Presidio NLP or regex fallback)
        """
        if not text or not isinstance(text, str):
            return PresidioGuardrailResult(
                is_safe=True, action='ALLOW',
                original_text=text or '', sanitized_text=text or ''
            )

        text_lower = text.lower()

        # Step 1: Prompt Injection / Jailbreak Detection
        for pattern in _INJECTION_PATTERNS:
            if re.search(pattern, text_lower):
                cls._log_audit_event(
                    user_name, 'Security Block - Prompt Injection',
                    project_code, f'Matched pattern: {pattern}'
                )
                return PresidioGuardrailResult(
                    is_safe=False, action='BLOCK',
                    original_text=text, sanitized_text=text,
                    reason='Prompt injection detected.',
                    user_message=_BLOCK_MESSAGES['injection']
                )

        # Step 2: Toxicity / Harmful Language Detection
        for pattern in _TOXICITY_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                cls._log_audit_event(
                    user_name, 'Security Block - Toxic Content',
                    project_code, f'Matched pattern: {pattern}'
                )
                return PresidioGuardrailResult(
                    is_safe=False, action='BLOCK',
                    original_text=text, sanitized_text=text,
                    reason='Toxic language detected.',
                    user_message=_BLOCK_MESSAGES['toxic']
                )

        # Step 3: Domain Relevance Check
        words = text_lower.split()
        if len(words) > 4:  # short messages pass through (e.g. "PRJ-001 risks?")
            matched = [kw for kw in _PM_KEYWORDS if kw in text_lower]
            has_proj = bool(re.search(r'prj[-\s]?\d{3}', text_lower))
            if not matched and not has_proj:
                cls._log_audit_event(
                    user_name, 'Relevance Block - Off-Topic Query',
                    project_code, f'Query: {text[:80]}'
                )
                return PresidioGuardrailResult(
                    is_safe=False, action='BLOCK',
                    original_text=text, sanitized_text=text,
                    reason='Not relevant to project management.',
                    user_message=_BLOCK_MESSAGES['irrelevant']
                )

        # Step 4: PII Detection & Anonymization
        analyzer, anonymizer = _get_presidio_engines()
        detected_entities = []
        sanitized = text

        if analyzer and anonymizer:
            try:
                results = analyzer.analyze(
                    text=text, language='en',
                    entities=[
                        'EMAIL_ADDRESS', 'PHONE_NUMBER', 'US_SSN', 'CREDIT_CARD',
                        'IP_ADDRESS', 'PERSON', 'LOCATION', 'ORGANIZATION', 'DATE_TIME'
                    ]
                )
                if results:
                    from presidio_anonymizer.entities import OperatorConfig
                    anon = anonymizer.anonymize(
                        text=text, analyzer_results=results,
                        operators={'DEFAULT': OperatorConfig('replace', {'new_value': '<REDACTED>'})}
                    )
                    sanitized = anon.text
                    for r in results:
                        detected_entities.append({
                            'entity_type': r.entity_type,
                            'start': r.start,
                            'end': r.end,
                            'confidence_score': round(r.score, 2),
                            'placeholder': '<REDACTED>'
                        })
            except Exception as e:
                logger.warning('[Presidio] Analysis error, falling back to regex: %s', e)
                sanitized, detected_entities = cls._regex_pii_fallback(text)
        else:
            sanitized, detected_entities = cls._regex_pii_fallback(text)

        if detected_entities:
            summary = ', '.join(set(e['entity_type'] for e in detected_entities))
            cls._log_audit_event(
                user_name, 'PII Anonymized - Microsoft Presidio',
                project_code, f'Entities: [{summary}]'
            )
            return PresidioGuardrailResult(
                is_safe=True, action='ANONYMIZE',
                original_text=text, sanitized_text=sanitized,
                detected_entities=detected_entities,
                user_message=_BLOCK_MESSAGES['pii_note']
            )

        return PresidioGuardrailResult(
            is_safe=True, action='ALLOW',
            original_text=text, sanitized_text=text
        )

    @classmethod
    def analyze_output_leakage(cls, text: str) -> Dict[str, Any]:
        """Scans LLM-generated output for PII or credential leakage before streaming to user."""
        if not text:
            return {'is_clean': True, 'leakage_detected': False, 'sanitized_text': text, 'status': 'PASSED'}

        analyzer, anonymizer = _get_presidio_engines()
        sanitized = text
        leakage = False

        if analyzer and anonymizer:
            try:
                results = analyzer.analyze(
                    text=text, language='en',
                    entities=['EMAIL_ADDRESS', 'PHONE_NUMBER', 'US_SSN', 'CREDIT_CARD', 'IP_ADDRESS']
                )
                secret_hits = list(re.finditer(_PII_REGEX_FALLBACK['SECRET_KEY'], text, re.IGNORECASE))
                if results or secret_hits:
                    leakage = True
                    if results:
                        from presidio_anonymizer.entities import OperatorConfig
                        anon = anonymizer.anonymize(
                            text=text, analyzer_results=results,
                            operators={'DEFAULT': OperatorConfig('replace', {'new_value': '<REDACTED>'})}
                        )
                        sanitized = anon.text
                    for m in secret_hits:
                        sanitized = sanitized.replace(m.group(0), '<SECRET_KEY_REDACTED>')
            except Exception as e:
                logger.warning('[Presidio Output Scan] Error: %s', e)
        else:
            if re.search(_PII_REGEX_FALLBACK['SECRET_KEY'], text, re.IGNORECASE):
                leakage = True
                sanitized = re.sub(_PII_REGEX_FALLBACK['SECRET_KEY'], '<SECRET_KEY_REDACTED>', text, flags=re.IGNORECASE)

        return {
            'is_clean': not leakage,
            'leakage_detected': leakage,
            'sanitized_text': sanitized,
            'status': 'CREDENTIAL_LEAK_PREVENTED' if leakage else 'PASSED'
        }

    @staticmethod
    def _regex_pii_fallback(text: str):
        """Regex-based PII detection used when presidio-analyzer is unavailable."""
        sanitized = text
        entities = []
        for etype, pattern in _PII_REGEX_FALLBACK.items():
            for m in re.finditer(pattern, sanitized, re.IGNORECASE):
                placeholder = f'<{etype}>'
                sanitized = sanitized.replace(m.group(0), placeholder)
                entities.append({
                    'entity_type': etype,
                    'start': m.start(),
                    'end': m.end(),
                    'confidence_score': 0.85,
                    'placeholder': placeholder
                })
        return sanitized, entities

    @staticmethod
    def _log_audit_event(user_name: str, action: str, target: str, details: str):
        """Records Presidio security events into SQLite audit_logs table."""
        try:
            from flask import has_app_context
            if not has_app_context():
                logger.info('[Presidio Audit] %s - %s: %s', action, target, details)
                return
            from backend.app.db.models import db, AuditLog
            db.session.add(AuditLog(
                user_name=user_name, user_role='System Agent',
                action=action, target_type=target, details=details
            ))
            db.session.commit()
        except Exception as e:
            logger.warning('[Presidio Audit] Could not persist: %s', e)
