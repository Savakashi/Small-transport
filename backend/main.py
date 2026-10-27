from fastapi import FastAPI, Depends, HTTPException, status, Query, status, APIRouter
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload
from typing import List
import models
import schemas
from models import SessionLocal, engine, Booking, Vehicle, Driver, BookingStatus, VehicleStatus
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
import bcrypt
import math
import socket

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Transport & Logistics API", version="1.0.0")

CONTAINER_INSTANCE_ID = socket.gethostname()

@app.middleware("http")
async def add_load_balancer_telemetry_header(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Backend-Instance"] = CONTAINER_INSTANCE_ID
    return response

@app.get("/healthz")
def health_check():
    return {
        "status": "healthy",
        "served_by_instance": CONTAINER_INSTANCE_ID
    }


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 2)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        # Verify active database connection
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "degraded", "database": str(e)}

def map_booking_response(booking: Booking) -> schemas.BookingResponse:
    return schemas.BookingResponse(
        id=booking.id,
        customerId=booking.customer_id,
        pickupAddress=booking.pickup_address,
        dropoffAddress=booking.dropoff_address,
        pickupTime=booking.pickup_time,
        cargoType=booking.cargo_type,
        weightKg=booking.weight_kg,
        fareAmount=booking.fare_amount,
        status=booking.status.value,
        vehicleId=booking.vehicle_id,
        vehicleRegistration=booking.vehicle.registration_number if booking.vehicle else None,
        driverId=booking.driver_id,
        createdAt=booking.created_at
    )

@app.post("/api/v1/bookings", status_code=status.HTTP_201_CREATED)
@app.post("/api/v1/bookings")
def create_booking(payload: schemas.BookingCreate, db: Session = Depends(get_db)):
    # 1. Fetch origin and destination locations
    pickup = db.query(models.Location).filter(models.Location.id == payload.pickup_location_id).first()
    dropoff = db.query(models.Location).filter(models.Location.id == payload.dropoff_location_id).first()

    if not pickup or not dropoff:
        raise HTTPException(status_code=404, detail="Selected location not found.")

    if pickup.id == dropoff.id:
        raise HTTPException(status_code=400, detail="Pickup and dropoff locations cannot be identical.")

    # 2. Determine Distance (km)
    trip_distance_km = 0.0
    if pickup.latitude and pickup.longitude and dropoff.latitude and dropoff.longitude:
        trip_distance_km = calculate_haversine_distance_km(
            float(pickup.latitude), float(pickup.longitude),
            float(dropoff.latitude), float(dropoff.longitude)
        )

    base_fare = 500.00
    weight_surcharge = round(float(payload.weight_kg) * 2.50, 2)
    distance_charge = round(trip_distance_km * 12.00, 2) if trip_distance_km > 0 else 0.0

    subtotal = base_fare + weight_surcharge + distance_charge
    tax_amount = round(subtotal * 0.18, 2) 

    new_booking = Booking(
        customer_id=payload.customer_id,
        pickup_location_id=payload.pickup_location_id,
        dropoff_location_id=payload.dropoff_location_id,
        pickup_time=payload.pickup_time,
        cargo_type=payload.cargo_type,
        weight_kg=payload.weight_kg,
        status="PENDING",
    )
    db.add(new_booking)
    db.flush()

    invoice_number = f"INV-{datetime.utcnow().year}-{new_booking.id:04d}"
    new_invoice = models.Invoice(
        booking_id=new_booking.id,
        invoice_number=invoice_number,
        base_fare=base_fare,
        weight_surcharge=weight_surcharge + distance_charge, 
        tax_amount=tax_amount,
    )
    db.add(new_invoice)
    db.commit()

    return {
        "booking_id": new_booking.id,
        "distance_km": trip_distance_km,
        "base_fare": base_fare,
        "weight_surcharge": weight_surcharge,
        "distance_charge": distance_charge,
        "tax_amount": tax_amount,
        "total_amount": round(subtotal + tax_amount, 2),
    }

@app.get("/api/v1/bookings", response_model=List[schemas.BookingOut])
def get_bookings(
    customer_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Booking).options(
        joinedload(models.Booking.pickup_location),
        joinedload(models.Booking.dropoff_location),
        joinedload(models.Booking.invoice),
    )

    if customer_id is not None:
        query = query.filter(models.Booking.customer_id == customer_id)

    if driver_id is not None:
        driver = db.query(models.Driver).filter(
            (models.Driver.id == driver_id) | (models.Driver.user_id == driver_id)
        ).first()
        resolved_driver_id = driver.id if driver else driver_id
        query = query.filter(models.Booking.driver_id == resolved_driver_id)

    if status_filter is not None:
        query = query.filter(models.Booking.status == status_filter)

    bookings = query.order_by(models.Booking.id.desc()).all()

    results = []
    for b in bookings:
        pickup_str = (
            f"{b.pickup_location.company_name + ' - ' if b.pickup_location.company_name else ''}"
            f"{b.pickup_location.title}, {b.pickup_location.address}, {b.pickup_location.city}"
            if b.pickup_location else "N/A"
        )
        dropoff_str = (
            f"{b.dropoff_location.company_name + ' - ' if b.dropoff_location.company_name else ''}"
            f"{b.dropoff_location.title}, {b.dropoff_location.address}, {b.dropoff_location.city}"
            if b.dropoff_location else "N/A"
        )
        total_fare = b.invoice.total_amount if b.invoice else 0.0

        results.append({
            "id": b.id,
            "customer_id": b.customer_id,
            "vehicle_id": b.vehicle_id,
            "driver_id": b.driver_id,
            "pickup_location_id": b.pickup_location_id,
            "dropoff_location_id": b.dropoff_location_id,
            "pickup_address": pickup_str,
            "dropoff_address": dropoff_str,
            "pickup_time": b.pickup_time,
            "cargo_type": b.cargo_type,
            "weight_kg": b.weight_kg,
            "fare_amount": total_fare,
            "status": b.status,
            "created_at": b.created_at,
        })
    return results


@app.patch("/api/v1/bookings/{booking_id}/dispatch")
def dispatch_booking(booking_id: int,  payload: schemas.DispatchRequest, db: Session = Depends(get_db) ):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    v_id = payload.vehicle_id
    d_id = payload.driver_id

    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == v_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if vehicle.max_payload_kg is not None and float(booking.weight_kg) > float(vehicle.max_payload_kg):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cargo weight ({float(booking.weight_kg):g} kg) exceeds the maximum payload "
                f"of vehicle {vehicle.registration_number} ({float(vehicle.max_payload_kg):g} kg)"
            ),
        )

    booking.vehicle_id = v_id
    booking.driver_id = d_id
    booking.status = "IN_TRANSIT"

    vehicle.status = "ON_TRIP"

    driver = db.query(models.Driver).filter(models.Driver.id == d_id).first()
    if driver:
        driver.is_available = False

    db.commit()
    return {"message": "Booking dispatched successfully", "booking_id": booking_id }


@app.patch("/api/v1/bookings/{booking_id}/complete")
def complete_trip(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = "COMPLETED"

    if booking.vehicle_id:
        v = db.query(models.Vehicle).filter(models.Vehicle.id == booking.vehicle_id).first()
        if v:
            v.status = "AVAILABLE"

    if booking.driver_id:
        d = db.query(models.Driver).filter(models.Driver.id == booking.driver_id).first()
        if d:
            d.is_available = True

    db.commit()
    return {"message": "Trip marked as delivered and completed", "booking_id": booking.id}

@app.get("/api/v1/vehicles")
def get_all_vehicles(db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).all()
    return [
        {
            "id": v.id,
            "registrationNumber": v.registration_number,
            "model": v.model,
            "vehicleType": v.vehicle_type,
            "maxPayloadKg": float(v.max_payload_kg) if v.max_payload_kg else 0.0,
            "status": v.status.value,
        }
        for v in vehicles
    ]

@app.post("/api/v1/vehicles", status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: dict, db: Session = Depends(get_db)):
    new_vehicle = Vehicle(
        registration_number=payload["registration_number"],
        model=payload["model"],
        vehicle_type=payload["vehicle_type"],
        max_payload_kg=payload["max_payload_kg"],
        status=VehicleStatus.AVAILABLE
    )
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    return {
        "id": new_vehicle.id,
        "registrationNumber": new_vehicle.registration_number,
        "model": new_vehicle.model,
        "vehicleType": new_vehicle.vehicle_type,
        "maxPayloadKg": float(new_vehicle.max_payload_kg),
        "status": new_vehicle.status.value,
    }

@app.get("/api/v1/drivers")
def get_drivers(db: Session = Depends(get_db)):
    drivers = (
        db.query(
            models.Driver.id,
            models.User.name,
            models.User.email,
            models.User.phone,
            models.Driver.license_number,
            models.Driver.rating,
            models.Driver.is_available,
        )
        .join(models.User, models.Driver.user_id == models.User.id)
        .all()
    )

    return [
        {
            "id": d.id,
            "name": d.name,
            "email": d.email,
            "phone": d.phone,
            "license_number": d.license_number,
            "rating": float(d.rating) if d.rating else 5.0,
            "is_available": d.is_available,
        }
        for d in drivers
    ]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-keep-it-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.strip().encode("utf-8")[:72],
            hashed_password.strip().encode("utf-8")
        )
    except Exception as e:
        print(f"[DEBUG AUTH] bcrypt.checkpw exception: {e}")
        return False


def get_password_hash(password: str) -> str:
    password_bytes = password.strip().encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@app.post("/api/v1/auth/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    clean_password = payload.password.strip()

    print(f"\n--- [LOGIN ATTEMPT] ---")
    print(f"Incoming Email: '{clean_email}'")
    print(f"Incoming Role Filter: '{payload.role}'")

    user = db.query(models.User).filter(models.User.email == clean_email).first()

    if not user:
        print(f"[LOGIN FAILED] No user found with email: {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    print(f"User Found in DB: ID={user.id}, Role={user.role}")

    if not verify_password(clean_password, user.password_hash):
        print(f"[LOGIN FAILED] Password mismatch for {clean_email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if payload.role:
        sent_role = payload.role.strip().upper().replace("ROLE_", "")
        db_role = user.role.strip().upper().replace("ROLE_", "")

        if sent_role != db_role:
            print(f"[LOGIN FAILED] Role mismatch: sent '{payload.role}' vs DB '{user.role}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User does not have '{payload.role}' role."
            )

    print(f"[LOGIN SUCCESS] Authenticated {clean_email} successfully!\n")

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})

    return schemas.AuthResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.name,
        role=user.role
    )

@app.post("/api/v1/drivers", status_code=status.HTTP_201_CREATED)
def create_driver(payload: schemas.DriverCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    pwd_hash = get_password_hash(payload.password)
    user = models.User(
        name=payload.name,
        email=payload.email.strip().lower(),
        phone=payload.phone.strip(),
        password_hash=pwd_hash,
        role="ROLE_DRIVER",
    )
    db.add(user)
    db.flush()

    driver = models.Driver(
        user_id=user.id,
        license_number=payload.license_number.strip().upper(),
        is_available=True,
        rating=5.0,
    )
    db.add(driver)
    db.commit()
    return {"message": "Driver registered successfully", "driver_id": driver.id}

@app.post("/api/v1/locations", response_model=schemas.LocationResponse)
def create_location(payload: schemas.LocationCreate, db: Session = Depends(get_db)):
    new_loc = models.Location(
        user_id=payload.userId,
        company_name=payload.companyName,
        title=payload.title,
        address=payload.address,
        city=payload.city,
        postal_code=payload.postalCode,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    return new_loc

@app.get("/api/v1/locations", response_model=List[schemas.LocationResponse])
def get_user_locations(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Location).filter(models.Location.user_id == user_id).all()

@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(payload.password.encode('utf-8'), salt).decode('utf-8')

    new_user = models.User(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hashed_password,
        role=payload.role or "ROLE_CUSTOMER",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if payload.role == "ROLE_DRIVER":
        new_driver = models.Driver(
            user_id=new_user.id,
            license_number=f"LIC-{new_user.id:04d}",
            rating=5.0,
            is_available=True,
        )
        db.add(new_driver)
        db.commit()

    return {"message": "User registered successfully", "user_id": new_user.id}
