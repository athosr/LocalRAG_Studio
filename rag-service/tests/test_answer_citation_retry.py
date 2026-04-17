from rag_service.contracts import AppSettingsPayload
from rag_service.services import answer


def _settings() -> AppSettingsPayload:
    return AppSettingsPayload.model_validate({"activeProvider": "ollama"})


def test_retry_adds_citations_when_first_pass_has_none(monkeypatch):
    responses = [
        "Sam Rivera was assigned INC-2025-004.",
        "Sam Rivera was assigned INC-2025-004. [#3]",
    ]
    calls: list[list[dict[str, str]]] = []

    def fake_complete_chat(
        settings: AppSettingsPayload,
        api_key: str | None,
        messages: list[dict[str, str]],
    ) -> str:
        del settings, api_key
        calls.append(messages)
        return responses[len(calls) - 1]

    monkeypatch.setattr(answer.emb, "complete_chat", fake_complete_chat)

    text, refs = answer._complete_with_citation_repair(
        settings=_settings(),
        api_key=None,
        context='[#1] title="a" chunk=0\nx\n\n[#3] title="b" chunk=0\ny',
        question="Who assigned INC-2025-004?",
        max_ref=3,
    )

    assert text.endswith("[#3]")
    assert refs == [3]
    assert len(calls) == 2


def test_retry_keeps_original_when_repair_still_invalid(monkeypatch):
    responses = [
        "Sam Rivera was assigned INC-2025-004.",
        "Sam Rivera was assigned INC-2025-004. [#99]",
    ]
    calls: list[list[dict[str, str]]] = []

    def fake_complete_chat(
        settings: AppSettingsPayload,
        api_key: str | None,
        messages: list[dict[str, str]],
    ) -> str:
        del settings, api_key
        calls.append(messages)
        return responses[len(calls) - 1]

    monkeypatch.setattr(answer.emb, "complete_chat", fake_complete_chat)

    text, refs = answer._complete_with_citation_repair(
        settings=_settings(),
        api_key=None,
        context='[#1] title="a" chunk=0\nx',
        question="Who assigned INC-2025-004?",
        max_ref=1,
    )

    assert text == responses[0]
    assert refs == []
    assert len(calls) == 2


def test_retry_skipped_when_first_pass_has_valid_citation(monkeypatch):
    calls: list[list[dict[str, str]]] = []

    def fake_complete_chat(
        settings: AppSettingsPayload,
        api_key: str | None,
        messages: list[dict[str, str]],
    ) -> str:
        del settings, api_key
        calls.append(messages)
        return "Sam Rivera was assigned INC-2025-004. [#1]"

    monkeypatch.setattr(answer.emb, "complete_chat", fake_complete_chat)

    text, refs = answer._complete_with_citation_repair(
        settings=_settings(),
        api_key=None,
        context='[#1] title="a" chunk=0\nx',
        question="Who assigned INC-2025-004?",
        max_ref=1,
    )

    assert text.endswith("[#1]")
    assert refs == [1]
    assert len(calls) == 1
