from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List

from .. import models, schemas, database

router = APIRouter(
    prefix="/api/buses",
    tags=["Buses"]
)

@router.get("/cities", response_model=List[str])
def get_cities(db: Session = Depends(database.get_db)):
    sources = db.query(models.Route.source).distinct().all()
    destinations = db.query(models.Route.destination).distinct().all()
    
    cities = set([s[0] for s in sources] + [d[0] for d in destinations])
    return sorted(list(cities))

@router.get("/search", response_model=List[schemas.Schedule])
def search_buses(source: str, destination: str, travel_date: date, db: Session = Depends(database.get_db)):
    from sqlalchemy import or_, and_
    import random
    from datetime import time
    
    route = db.query(models.Route).filter(
        or_(
            and_(
                func.lower(models.Route.source) == source.lower().strip(),
                func.lower(models.Route.destination) == destination.lower().strip()
            ),
            and_(
                func.lower(models.Route.source) == destination.lower().strip(),
                func.lower(models.Route.destination) == source.lower().strip()
            )
        )
    ).first()
    
    if not route:
        # User requested a route that doesn't exist yet! Auto-generate it and 6 buses to guarantee availability.
        route = models.Route(source=source.strip(), destination=destination.strip(), duration=f"{random.randint(4, 15)} hours")
        db.add(route)
        db.commit()
        db.refresh(route)
        
        # We assume 8 distinct buses exist from the seed.py, let's attach 6 random ones to this new route.
        bus_ids = random.sample(range(1, 9), 6) # pick 6 random buses out of the 8 available
        for i, b_id in enumerate(bus_ids):
            dep_hour = (i * 3 + random.randint(6, 12)) % 24 # Spread out departure times
            arr_hour = (dep_hour + random.randint(4, 12)) % 24
            
            db.add(models.Schedule(
                bus_id=b_id, 
                route_id=route.id, 
                departure_time=time(dep_hour, random.choice([0, 15, 30, 45])), 
                arrival_time=time(arr_hour, random.choice([0, 15, 30, 45])), 
                price=float(random.randint(500, 2500))
            ))
        db.commit()
    
    # Return all schedules for this route
    schedules = db.query(models.Schedule).filter(models.Schedule.route_id == route.id).all()
    
    is_reverse = route.source.lower() != source.lower().strip()
    for schedule in schedules:
        if is_reverse:
            schedule.route.source, schedule.route.destination = schedule.route.destination, schedule.route.source

    return schedules

@router.get("/seats/{schedule_id}/{travel_date}", response_model=schemas.ScheduleSeats)
def get_seats(schedule_id: int, travel_date: date, db: Session = Depends(database.get_db)):
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    bus = schedule.bus
    bookings = db.query(models.Booking).filter(
        models.Booking.schedule_id == schedule_id,
        models.Booking.travel_date == travel_date
    ).all()
    
    booked_seats = {b.seat_number for b in bookings}
    
    seats = []
    for i in range(1, bus.total_seats + 1):
        seats.append(schemas.SeatStatus(seat_number=i, is_booked=(i in booked_seats)))
        
    return schemas.ScheduleSeats(
        schedule_id=schedule_id,
        travel_date=travel_date,
        total_seats=bus.total_seats,
        seats=seats
    )
