from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator

class BookingCreate(BaseModel):
    customerId: int
    pickupAddress: str
    dropoffAddress: str
    pickupTime: datetime
    cargoType: Optional[str] = None
    weightKg: Optional[Decimal] = None
    fareAmount: Decimal


class DispatchRequest(BaseModel):
    vehicle_id: int
    driver_id: int


class BookingResponse(BaseModel):
    id: int
    customerId: int
    pickupAddress: str
    dropoffAddress: str
    pickupTime: datetime
    cargoType: Optional[str] = None
    weightKg: Optional[Decimal] = None
    fareAmount: Decimal
    status: str
    vehicleId: Optional[int] = None
    vehicleRegistration: Optional[str] = None
    driverId: Optional[int] = None
    createdAt: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None  

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    full_name: str
    role: str

class DriverCreate(BaseModel):
    name: str
    email: str
    phone: str
    license_number: str
    password: Optional[str] = "password123"

class BookingCreate(BaseModel):
    customer_id: int = Field(..., alias="customerId")
    pickup_location_id: int = Field(..., alias="pickupLocationId")
    dropoff_location_id: int = Field(..., alias="dropoffLocationId")
    pickup_time: Optional[datetime] = Field(default_factory=datetime.utcnow, alias="pickupTime")
    cargo_type: Optional[str] = Field("Standard Freight", alias="cargoType")
    weight_kg: float = Field(..., alias="weightKg")
    fare_amount: Optional[float] = Field(0.0, alias="fareAmount")

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
class LocationCreate(BaseModel):
    user_id: int = Field(..., alias="userId")
    company_name: Optional[str] = Field(None, alias="companyName")
    title: str
    address: str
    city: str
    postal_code: Optional[str] = Field(None, alias="postalCode")

    class Config:
        populate_by_name = True

    @field_validator("company_name", "postal_code", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return str(v).strip()

class LocationOut(BaseModel):
    id: int
    user_id: int
    company_name: Optional[str] = None
    title: str
    address: str
    city: str
    postal_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BookingStatusUpdate(BaseModel):
    status: str
    driver_id: Optional[int] = Field(None, alias="driverId")
    vehicle_id: Optional[int] = Field(None, alias="vehicleId")

    class Config:
        populate_by_name = True


class LocationSimpleOut(BaseModel):
    id: int
    company_name: Optional[str] = None
    title: str
    address: str
    city: str

    class Config:
        from_attributes = True


class BookingOut(BaseModel):
    id: int
    customer_id: int
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    pickup_location_id: int
    dropoff_location_id: int
    pickup_address: str
    dropoff_address: str
    pickup_time: datetime
    cargo_type: str
    weight_kg: float
    fare_amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserRegister(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    role: Optional[str] = "ROLE_CUSTOMER"