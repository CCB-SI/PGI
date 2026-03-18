from datetime import datetime

from gestaodecomunicados.services.recurrence_service import expand_event_occurrences_in_year


def test_monthly_third_wednesday_expansion_in_year():
    occurrences = expand_event_occurrences_in_year(
        start_time=datetime(2025, 1, 15, 19, 30),
        end_time=None,
        duration_minutes=120,
        recurrence_rule="FREQ=MONTHLY;BYDAY=WE;BYSETPOS=3",
        year=2026,
    )

    assert len(occurrences) == 12
    assert occurrences[0].start.year == 2026
    assert occurrences[0].start.month == 1


def test_weekly_recurrence_expansion_in_year():
    occurrences = expand_event_occurrences_in_year(
        start_time=datetime(2026, 1, 5, 20, 0),  # Monday
        end_time=None,
        duration_minutes=60,
        recurrence_rule="FREQ=WEEKLY;INTERVAL=1",
        year=2026,
    )

    assert len(occurrences) >= 52
    assert all(item.start.year == 2026 for item in occurrences)


def test_non_recurrent_event_included_only_when_in_same_year():
    occurrences_2026 = expand_event_occurrences_in_year(
        start_time=datetime(2026, 8, 10, 14, 0),
        end_time=None,
        duration_minutes=90,
        recurrence_rule=None,
        year=2026,
    )
    occurrences_2027 = expand_event_occurrences_in_year(
        start_time=datetime(2026, 8, 10, 14, 0),
        end_time=None,
        duration_minutes=90,
        recurrence_rule=None,
        year=2027,
    )

    assert len(occurrences_2026) == 1
    assert len(occurrences_2027) == 0
