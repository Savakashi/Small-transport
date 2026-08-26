import os
import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    create_engine,
    Text,
    Float
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, CheckConstraint, FetchedValue
from sqlalchemy.orm import declarative_base
from pydantic import BaseModel, Field
from typing import Optional


# PostgreSQL Environment Variables with defaults
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cloud")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class VehicleStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    MAINTENANCE = "MAINTENANCE"
    INACTIVE = "INACTIVE"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    registration_number = Column(String(30), unique=True, nullable=False)
    model = Column(String(50), nullable=False)
    vehicle_type = Column(String(30), nullable=False)
    max_payload_kg = Column(Numeric(8, 2), nullable=True)
    status = Column(
        SQLEnum(VehicleStatus, name="vehicle_status_enum"),
        default=VehicleStatus.AVAILABLE,
        nullable=False,
    )


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, unique=True, nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    rating = Column(Numeric(2, 1), default=5.0)

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    company_name = Column(String(150), nullable=True)
    title = Column(String(100), nullable=False)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="locations")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)
    pickup_location_id = Column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    dropoff_location_id = Column(Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    pickup_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    cargo_type = Column(String(100), default="Standard Freight")
    weight_kg = Column(Float, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("User", back_populates="bookings")
    pickup_location = relationship("Location", foreign_keys=[pickup_location_id])
    dropoff_location = relationship("Location", foreign_keys=[dropoff_location_id])
    invoice = relationship("Invoice", back_populates="booking", uselist=False, cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    base_fare = Column(Float, nullable=False)
    weight_surcharge = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, nullable=False)

    # Let PostgreSQL compute and return this value automatically
    total_amount = Column(Float, server_default=FetchedValue(), nullable=False)
    
    payment_status = Column(String(50), default="PENDING", nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)

    booking = relationship("Booking", back_populates="invoice")

class UserRole(str, enum.Enum):
    ROLE_CUSTOMER = "ROLE_CUSTOMER"
    ROLE_DRIVER = "ROLE_DRIVER"
    ROLE_ADMIN = "ROLE_ADMIN"
    ROLE_DISPATCHER = "ROLE_DISPATCHER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "role IN ('ROLE_CUSTOMER', 'ROLE_DRIVER', 'ROLE_ADMIN', 'ROLE_DISPATCHER')",
            name="check_valid_user_role"
        ),
    )

    locations = relationship("Location", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="customer")

class DispatchRequest(BaseModel):
    vehicle_id: Optional[int] = Field(None, alias="vehicleId")
    driver_id: Optional[int] = Field(None, alias="driverId")

    class Config:
        populate_by_name = True 