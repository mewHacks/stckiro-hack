from typing import Literal, Optional

from pydantic import BaseModel, Field

Status = Literal["Pending", "Assigned", "Rescued"]
Via = Literal["internet", "mesh"]


class Profile(BaseModel):
    name: str = ""
    medical: str = ""
    contacts: list[str] = []


class Location(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracyM: Optional[float] = Field(default=None, ge=0)


class Beacon(BaseModel):
    connected: bool = False
    firmware: str = ""


class SOS(BaseModel):
    """Full alert from the app. Only bag + at are required so a minimal ping still lands."""

    bag: str = Field(min_length=1, max_length=64)
    at: int
    reason: str = ""
    priority: Literal["critical", "high"] = "high"
    battery: Optional[int] = Field(default=None, ge=0, le=100)
    profile: Profile = Field(default_factory=Profile)
    location: Optional[Location] = None
    beacon: Beacon = Field(default_factory=Beacon)


class SOSAck(BaseModel):
    status: Literal["accepted"] = "accepted"
    duplicate: bool


class Victim(BaseModel):
    id: int
    name: str
    area: str
    people: int
    severity: int = Field(ge=1, le=3)
    last: int
    status: Status
    via: Via
    lat: Optional[float]
    lng: Optional[float]


class Rescuer(BaseModel):
    id: int
    lat: float
    lng: float
