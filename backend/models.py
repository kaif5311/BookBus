from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, Time, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user") # 'user' or 'admin'

    bookings = relationship("Booking", back_populates="user")

class Bus(Base):
    __tablename__ = "buses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String) # AC, Non-AC, Sleeper, Seater
    total_seats = Column(Integer)

    schedules = relationship("Schedule", back_populates="bus")

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    destination = Column(String, index=True)
    duration = Column(String)

    schedules = relationship("Schedule", back_populates="route")

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id"))
    route_id = Column(Integer, ForeignKey("routes.id"))
    departure_time = Column(Time)
    arrival_time = Column(Time)
    price = Column(Float)

    bus = relationship("Bus", back_populates="schedules")
    route = relationship("Route", back_populates="schedules")
    bookings = relationship("Booking", back_populates="schedule")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    schedule_id = Column(Integer, ForeignKey("schedules.id"))
    seat_number = Column(Integer)
    travel_date = Column(Date)
    passenger_name = Column(String)
    passenger_phone = Column(String)
    passenger_address = Column(String)

    user = relationship("User", back_populates="bookings")
    schedule = relationship("Schedule", back_populates="bookings")
