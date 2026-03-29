from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, time

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# Route Schemas
class RouteBase(BaseModel):
    source: str
    destination: str
    duration: str

class RouteCreate(RouteBase):
    pass

class RouteUpdate(BaseModel):
    source: Optional[str] = None
    destination: Optional[str] = None
    duration: Optional[str] = None

class Route(RouteBase):
    id: int

    class Config:
        from_attributes = True

# Bus Schemas
class BusBase(BaseModel):
    name: str
    type: str # AC, Non-AC
    total_seats: int

class BusCreate(BusBase):
    pass

class BusUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    total_seats: Optional[int] = None

class Bus(BusBase):
    id: int

    class Config:
        from_attributes = True

# Schedule Schemas
class ScheduleBase(BaseModel):
    bus_id: int
    route_id: int
    departure_time: time
    arrival_time: time
    price: float

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    bus_id: Optional[int] = None
    route_id: Optional[int] = None
    departure_time: Optional[time] = None
    arrival_time: Optional[time] = None
    price: Optional[float] = None

class Schedule(ScheduleBase):
    id: int
    bus: Bus
    route: Route

    class Config:
        from_attributes = True

# Seat View Schema
class SeatStatus(BaseModel):
    seat_number: int
    is_booked: bool

class ScheduleSeats(BaseModel):
    schedule_id: int
    travel_date: date
    total_seats: int
    seats: List[SeatStatus]

# Booking Schemas
class PassengerDetail(BaseModel):
    seat_number: int
    passenger_name: str
    passenger_phone: str
    passenger_address: str

class BookingCreateBulk(BaseModel):
    schedule_id: int
    travel_date: date
    passengers: List[PassengerDetail]

class Booking(BaseModel):
    id: int
    user_id: int
    schedule_id: int
    seat_number: int
    travel_date: date
    passenger_name: str
    passenger_phone: str
    passenger_address: str
    schedule: Schedule

    class Config:
        from_attributes = True
