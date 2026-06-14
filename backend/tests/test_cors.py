import re

from backend.main import DEFAULT_CORS_ORIGIN_REGEX


def test_local_development_origin_on_fallback_port_is_allowed() -> None:
    assert re.fullmatch(DEFAULT_CORS_ORIGIN_REGEX, "http://localhost:3001")
    assert re.fullmatch(DEFAULT_CORS_ORIGIN_REGEX, "http://127.0.0.1:3010")


def test_untrusted_origin_is_not_allowed() -> None:
    assert re.fullmatch(DEFAULT_CORS_ORIGIN_REGEX, "https://example.com") is None
