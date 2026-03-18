from datetime import datetime, timedelta
from typing import Optional

GEOFENCE_CITIES = {"santa isabel", "arujá", "aruja", "igaratá", "igarata"}
JARDIM_ACACIAS_NAMES = {"jardim das acácias", "jardim das acacias"}

LOCATION_SPACE_CAPACITY = {
    ("jardim das acácias", "salão principal"): 300,
    ("jardim das acacias", "salão principal"): 300,
    ("jardim das acácias", "sala de reuniões"): 60,
    ("jardim das acacias", "sala de reuniões"): 60,
    ("igreja do redentor", "principal"): 300,
}


def normalize_text(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def infer_end_time(
    start_time: datetime,
    end_time: Optional[datetime],
    duration_minutes: Optional[int],
) -> datetime:
    if end_time:
        return end_time
    return start_time + timedelta(minutes=duration_minutes or 60)


def resolve_capacity(location_name: str, space_name: Optional[str]) -> Optional[int]:
    normalized_location = normalize_text(location_name)
    normalized_space = normalize_text(space_name)

    if normalized_space:
        exact_match = LOCATION_SPACE_CAPACITY.get((normalized_location, normalized_space))
        if exact_match is not None:
            return exact_match

    if "igreja do redentor" in normalized_location:
        return 300

    return None


def requires_geofencing_logistics(city_name: Optional[str]) -> bool:
    return normalize_text(city_name) in GEOFENCE_CITIES


def online_requires_jardim_acacias(location_name: Optional[str], is_online: bool) -> bool:
    if not is_online:
        return False
    return normalize_text(location_name) not in JARDIM_ACACIAS_NAMES


def exceeds_capacity(
    location_name: str,
    space_name: Optional[str],
    estimated_people: Optional[int],
) -> bool:
    if estimated_people is None:
        return False
    capacity = resolve_capacity(location_name, space_name)
    if capacity is None:
        return False
    return estimated_people > capacity


def has_time_conflict(
    existing_start: datetime,
    existing_end: datetime,
    candidate_start: datetime,
    candidate_end: datetime,
) -> bool:
    return existing_start < candidate_end and existing_end > candidate_start
