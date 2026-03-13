from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=False)
    role = Column(String, default="patient") # patient, admin, hospital
    status = Column(String, default="pending") # pending, approved, rejected

    claims = relationship("Claim", back_populates="owner")

class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    claim_id_str = Column(String, unique=True, index=True) # e.g., #12345
    type = Column(String) # Hospitalization, Diagnostic, etc.
    amount = Column(Float)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="processing") # processing, pending, approved, rejected
    description = Column(String, nullable=True)
    admin_comment = Column(String, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="claims")
    documents = relationship("Document", back_populates="claim")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="processing")
    
    claim_id = Column(Integer, ForeignKey("claims.id"))
    claim = relationship("Claim", back_populates="documents")
