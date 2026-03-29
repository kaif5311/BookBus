from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database, security

router = APIRouter(
    prefix="/api/bookings",
    tags=["Bookings"]
)

@router.post("/", response_model=List[schemas.Booking])
def book_ticket(booking: schemas.BookingCreateBulk, db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    # Check if schedule exists
    schedule = db.query(models.Schedule).filter(models.Schedule.id == booking.schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    bus = schedule.bus
    
    # Pre-flight validation for all passengers
    for p in booking.passengers:
        # Check if seat is valid for bus
        if p.seat_number < 1 or p.seat_number > bus.total_seats:
            raise HTTPException(status_code=400, detail=f"Invalid seat number: {p.seat_number}")

        # Check for double booking
        existing_booking = db.query(models.Booking).filter(
            models.Booking.schedule_id == booking.schedule_id,
            models.Booking.travel_date == booking.travel_date,
            models.Booking.seat_number == p.seat_number
        ).first()
        
        if existing_booking:
            raise HTTPException(status_code=400, detail=f"Seat {p.seat_number} is already booked")
            
    # All clear, create bookings
    new_bookings = []
    for p in booking.passengers:
        new_booking = models.Booking(
            user_id=current_user.id,
            schedule_id=booking.schedule_id,
            seat_number=p.seat_number,
            travel_date=booking.travel_date,
            passenger_name=p.passenger_name,
            passenger_phone=p.passenger_phone,
            passenger_address=p.passenger_address
        )
        db.add(new_booking)
        new_bookings.append(new_booking)
        
    db.commit()
    for nb in new_bookings:
        db.refresh(nb)
        
    return new_bookings

@router.get("/my-bookings", response_model=List[schemas.Booking])
def get_my_bookings(db: Session = Depends(database.get_db), current_user: models.User = Depends(security.get_current_user)):
    return db.query(models.Booking).filter(models.Booking.user_id == current_user.id).all()
