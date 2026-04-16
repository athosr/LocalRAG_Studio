from rag_service.api.routes import health


def test_health_route():
    assert health() == {"ok": True}
