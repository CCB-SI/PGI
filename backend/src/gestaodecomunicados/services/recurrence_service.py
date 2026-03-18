from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import calendar


WEEKDAY_MAP = {
    "MO": 0,
    "TU": 1,
    "WE": 2,
    "TH": 3,
    "FR": 4,
    "SA": 5,
    "SU": 6,
}


@dataclass
class Occurrence:
    start: datetime
    end: datetime


def _parse_rrule(rule: Optional[str]) -> Dict[str, str]:
    if not rule:
        return {}

    result: Dict[str, str] = {}
    for part in rule.split(";"):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        result[key.strip().upper()] = value.strip()
    return result


def _parse_until(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            return datetime.strptime(value, "%Y%m%dT%H%M%SZ")
        if "T" in value:
            return datetime.strptime(value, "%Y%m%dT%H%M%S")
        return datetime.strptime(value, "%Y%m%d")
    except ValueError:
        return None


def _nth_weekday_in_month(year: int, month: int, weekday: int, nth: int) -> Optional[datetime]:
    month_days = calendar.monthcalendar(year, month)
    matches = [week[weekday] for week in month_days if week[weekday] != 0]
    if not matches:
        return None

    if nth > 0:
        if nth > len(matches):
            return None
        return datetime(year, month, matches[nth - 1])

    index = abs(nth)
    if index > len(matches):
        return None
    return datetime(year, month, matches[-index])


def expand_occurrences(
    start_time: datetime,
    end_time: Optional[datetime],
    duration_minutes: Optional[int],
    recurrence_rule: Optional[str],
    window_start: datetime,
    window_end: datetime,
    max_occurrences: int = 366,
) -> List[Occurrence]:
    parsed = _parse_rrule(recurrence_rule)

    event_end = end_time or (start_time + timedelta(minutes=duration_minutes or 60))
    duration = event_end - start_time

    if not parsed:
        if window_start <= start_time < window_end:
            return [Occurrence(start=start_time, end=event_end)]
        return []

    freq = parsed.get("FREQ", "").upper()
    interval = int(parsed.get("INTERVAL", "1") or 1)
    count_limit = int(parsed.get("COUNT", "0") or 0)
    until = _parse_until(parsed.get("UNTIL"))

    occurrences: List[Occurrence] = []
    generated_count = 0

    if freq in {"DAILY", "WEEKLY"}:
        current = start_time
        step_days = interval if freq == "DAILY" else 7 * interval

        byday = [item.strip().upper() for item in parsed.get("BYDAY", "").split(",") if item.strip()]
        allowed_weekdays = {WEEKDAY_MAP[item] for item in byday if item in WEEKDAY_MAP}

        while current < window_end and len(occurrences) < max_occurrences:
            if until and current > until:
                break

            current_end = current + duration
            weekday_ok = True
            if allowed_weekdays:
                weekday_ok = current.weekday() in allowed_weekdays

            if weekday_ok:
                generated_count += 1
                if window_start <= current < window_end:
                    occurrences.append(Occurrence(start=current, end=current_end))
                if count_limit and generated_count >= count_limit:
                    break

            current += timedelta(days=step_days)

        return occurrences

    if freq == "MONTHLY":
        byday = [item.strip().upper() for item in parsed.get("BYDAY", "").split(",") if item.strip()]
        bysetpos = int(parsed.get("BYSETPOS", "0") or 0)

        year = start_time.year
        month = start_time.month

        while len(occurrences) < max_occurrences:
            if datetime(year, month, 1) >= window_end:
                break

            if byday and bysetpos and byday[0] in WEEKDAY_MAP:
                base_date = _nth_weekday_in_month(year, month, WEEKDAY_MAP[byday[0]], bysetpos)
                if base_date:
                    candidate = base_date.replace(
                        hour=start_time.hour,
                        minute=start_time.minute,
                        second=start_time.second,
                        microsecond=start_time.microsecond,
                    )
                else:
                    candidate = None
            else:
                day = min(start_time.day, calendar.monthrange(year, month)[1])
                candidate = datetime(
                    year,
                    month,
                    day,
                    start_time.hour,
                    start_time.minute,
                    start_time.second,
                    start_time.microsecond,
                )

            if candidate is not None:
                if until and candidate > until:
                    break

                generated_count += 1
                if window_start <= candidate < window_end:
                    occurrences.append(Occurrence(start=candidate, end=candidate + duration))
                if count_limit and generated_count >= count_limit:
                    break

            month += interval
            while month > 12:
                month -= 12
                year += 1

        return occurrences

    if freq == "YEARLY":
        current_year = start_time.year
        while len(occurrences) < max_occurrences:
            candidate = start_time.replace(year=current_year)
            if candidate >= window_end:
                break
            if until and candidate > until:
                break

            generated_count += 1
            if window_start <= candidate < window_end:
                occurrences.append(Occurrence(start=candidate, end=candidate + duration))
            if count_limit and generated_count >= count_limit:
                break

            current_year += interval

        return occurrences

    if window_start <= start_time < window_end:
        return [Occurrence(start=start_time, end=event_end)]
    return []


def expand_event_occurrences_in_year(
    start_time: datetime,
    end_time: Optional[datetime],
    duration_minutes: Optional[int],
    recurrence_rule: Optional[str],
    year: int,
) -> List[Occurrence]:
    year_start = datetime(year, 1, 1)
    year_end = datetime(year + 1, 1, 1)
    return expand_occurrences(
        start_time=start_time,
        end_time=end_time,
        duration_minutes=duration_minutes,
        recurrence_rule=recurrence_rule,
        window_start=year_start,
        window_end=year_end,
        max_occurrences=500,
    )
