from datetime import datetime, timedelta

from gestaodecomunicados.services import event_rules


def test_requires_geofencing_logistics_for_supported_cities():
    assert event_rules.requires_geofencing_logistics("Santa Isabel") is True
    assert event_rules.requires_geofencing_logistics("Arujá") is True
    assert event_rules.requires_geofencing_logistics("Igaratá") is True


def test_requires_geofencing_logistics_for_unsupported_city():
    assert event_rules.requires_geofencing_logistics("Guarulhos") is False


def test_resolve_capacity_for_jardim_salao_principal():
    capacity = event_rules.resolve_capacity("Jardim das Acácias", "Salão Principal")
    assert capacity == 300


def test_resolve_capacity_for_igreja_redentor_default_space():
    capacity = event_rules.resolve_capacity("Igreja do Redentor", "Qualquer")
    assert capacity == 300


def test_exceeds_capacity_true_when_limit_passed():
    assert event_rules.exceeds_capacity("Jardim das Acácias", "Salão Principal", 301) is True


def test_exceeds_capacity_false_when_within_limit():
    assert event_rules.exceeds_capacity("Jardim das Acácias", "Salão Principal", 250) is False


def test_online_requires_jardim_acacias_when_online_true_and_other_location():
    assert event_rules.online_requires_jardim_acacias("Igreja do Redentor", True) is True


def test_online_requires_jardim_acacias_when_online_false():
    assert event_rules.online_requires_jardim_acacias("Igreja do Redentor", False) is False


def test_online_requires_jardim_acacias_accepts_jardim_location():
    assert event_rules.online_requires_jardim_acacias("Jardim das Acácias", True) is False


def test_has_time_conflict_true_for_overlapping_ranges():
    existing_start = datetime(2026, 3, 20, 19, 0)
    existing_end = datetime(2026, 3, 20, 21, 0)
    candidate_start = datetime(2026, 3, 20, 20, 0)
    candidate_end = datetime(2026, 3, 20, 22, 0)

    assert event_rules.has_time_conflict(existing_start, existing_end, candidate_start, candidate_end) is True


def test_has_time_conflict_false_for_touching_ranges():
    existing_start = datetime(2026, 3, 20, 19, 0)
    existing_end = datetime(2026, 3, 20, 21, 0)
    candidate_start = datetime(2026, 3, 20, 21, 0)
    candidate_end = datetime(2026, 3, 20, 22, 0)

    assert event_rules.has_time_conflict(existing_start, existing_end, candidate_start, candidate_end) is False


def test_infer_end_time_uses_explicit_end_time_when_present():
    start = datetime(2026, 3, 20, 19, 0)
    explicit_end = datetime(2026, 3, 20, 20, 30)

    assert event_rules.infer_end_time(start, explicit_end, 90) == explicit_end


def test_infer_end_time_uses_duration_when_end_missing():
    start = datetime(2026, 3, 20, 19, 0)

    assert event_rules.infer_end_time(start, None, 90) == start + timedelta(minutes=90)
