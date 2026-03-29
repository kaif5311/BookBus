from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, database, security

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)

# Admin only endpoints
@router.post("/buses", response_model=schemas.Bus)
def add_bus(bus: schemas.BusCreate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    new_bus = models.Bus(**bus.dict())
    db.add(new_bus)
    db.commit()
    db.refresh(new_bus)
    return new_bus

@router.get("/buses", response_model=List[schemas.Bus])
def get_all_buses(db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    return db.query(models.Bus).all()

@router.put("/buses/{bus_id}", response_model=schemas.Bus)
def update_bus(bus_id: int, bus_update: schemas.BusUpdate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    bus = db.query(models.Bus).filter(models.Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus not found")
    
    update_data = bus_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bus, key, value)
    
    db.commit()
    db.refresh(bus)
    return bus

@router.delete("/buses/{bus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bus(bus_id: int, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    bus = db.query(models.Bus).filter(models.Bus.id == bus_id).first()
    if not bus:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bus not found")
    
    # Check if there are active schedules using this bus to prevent orphaned data or DB integrity errors
    active_schedules = db.query(models.Schedule).filter(models.Schedule.bus_id == bus_id).first()
    if active_schedules:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete bus because it is currently assigned to a schedule.")
        
    db.delete(bus)
    db.commit()
    return None

@router.post("/routes", response_model=schemas.Route)
def add_route(route: schemas.RouteCreate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    new_route = models.Route(**route.dict())
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route

@router.get("/routes", response_model=List[schemas.Route])
def get_all_routes(db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    return db.query(models.Route).all()

@router.put("/routes/{route_id}", response_model=schemas.Route)
def update_route(route_id: int, route_update: schemas.RouteUpdate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    route = db.query(models.Route).filter(models.Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    
    update_data = route_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(route, key, value)
    
    db.commit()
    db.refresh(route)
    return route

@router.delete("/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_route(route_id: int, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    route = db.query(models.Route).filter(models.Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    
    active_schedules = db.query(models.Schedule).filter(models.Schedule.route_id == route_id).first()
    if active_schedules:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete route because it is currently assigned to a schedule.")
        
    db.delete(route)
    db.commit()
    return None

@router.post("/schedules", response_model=schemas.Schedule)
def add_schedule(schedule: schemas.ScheduleCreate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    new_schedule = models.Schedule(**schedule.dict())
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule

@router.get("/schedules", response_model=List[schemas.Schedule])
def get_all_schedules(db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    return db.query(models.Schedule).all()

@router.put("/schedules/{schedule_id}", response_model=schemas.Schedule)
def update_schedule(schedule_id: int, schedule_update: schemas.ScheduleUpdate, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    
    update_data = schedule_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)
    
    db.commit()
    db.refresh(schedule)
    return schedule

@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    schedule = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    
    active_bookings = db.query(models.Booking).filter(models.Booking.schedule_id == schedule_id).first()
    if active_bookings:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete schedule because there are active bookings for it.")
         
    db.delete(schedule)
    db.commit()
    return None

@router.get("/bookings", response_model=List[schemas.Booking])
def get_all_bookings(db: Session = Depends(database.get_db), current_admin: models.User = Depends(security.get_current_admin)):
    return db.query(models.Booking).all()
