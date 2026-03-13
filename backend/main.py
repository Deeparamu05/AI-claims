from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
import os
import shutil
from typing import List

import models, database, auth

app = FastAPI(title="ClaimsApp Professional API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure necessary directories exist
UPLOAD_DIR = "uploads"
for folder in [UPLOAD_DIR, "data"]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Initialize database
database.init_db()

@app.post("/token")
async def login_for_access_token(db: Session = Depends(database.get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin validation. Please wait for approval."
        )
    elif user.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your registration request has been rejected."
        )
        
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register")
async def register_user(username: str, email: str, password: str, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(password)
    if username == "admin":
        role = "admin"
        user_status = "approved"
        is_active = True
    else:
        role = "patient"
        user_status = "pending"
        is_active = False
    
    new_user = models.User(
        username=username, 
        email=email, 
        hashed_password=hashed_password, 
        role=role, 
        status=user_status,
        is_active=is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@app.get("/claims")
async def get_claims(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return current_user.claims

@app.post("/claims")
async def create_claim(
    type: str, 
    amount: float, 
    description: str = None, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    import random
    claim_id_str = f"#{random.randint(10000, 99999)}"
    new_claim = models.Claim(
        claim_id_str=claim_id_str,
        type=type,
        amount=amount,
        description=description,
        owner_id=current_user.id
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

@app.post("/claims/{claim_id}/upload")
async def upload_document(
    claim_id: int, 
    file: UploadFile = File(...), 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    claim = db.query(models.Claim).filter(models.Claim.id == claim_id, models.Claim.owner_id == current_user.id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    file_path = os.path.join(UPLOAD_DIR, f"{claim_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    new_doc = models.Document(
        filename=file.filename,
        file_path=file_path,
        claim_id=claim.id
    )
    db.add(new_doc)
    db.commit()
    return {"message": "File uploaded successfully"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# Admin Endpoints
@app.get("/admin/claims")
async def admin_get_all_claims(
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return db.query(models.Claim).all()

@app.post("/admin/claims/{claim_id}/validate")
async def admin_validate_claim(
    claim_id: int,
    status: str,
    comment: str = None,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    claim = db.query(models.Claim).filter(models.Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    claim.status = status
    if comment:
        claim.admin_comment = comment
    
    db.commit()
    db.refresh(claim)
    return claim

@app.get("/admin/users")
async def admin_get_all_users(
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return db.query(models.User).all()

@app.post("/admin/users/{user_id}/validate")
async def admin_validate_user(
    user_id: int,
    status: str, # approved, rejected
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user.status = status
    target_user.is_active = (status == "approved")
    
    db.commit()
    db.refresh(target_user)
    return target_user

# AI & Policy Intelligence Endpoints
@app.get("/policy/intelligence")
async def get_policy_intelligence(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "coverage_limit": 500000,
        "active_benefits": ["Cashless Hospitalization", "OPD Coverage", "Critical Illness"],
        "guidelines": [
            "Submit original bills for all consultations.",
            "Pre-authorization required for planned surgeries.",
            "Claims above ₹50,000 require secondary validation."
        ]
    }

@app.post("/ai/chat")
async def ai_chat(query: str, current_user: models.User = Depends(auth.get_current_user)):
    # Simulated AI logic
    responses = {
        "status": f"Your current claims are being processed. User #{current_user.id} has {len(current_user.claims)} active cases.",
        "coverage": "Based on our Policy Intelligence module, you have ₹5,00,000 in total coverage across networked hospitals.",
        "default": "I am analyzing your request using our neural network. This appears to be a valid inquiry under Section 12 of your policy agreement."
    }
    
    import time
    time.sleep(1) # Simulate performance
    
    if "status" in query.lower():
        return {"response": responses["status"]}
    elif "coverage" in query.lower() or "limit" in query.lower():
        return {"response": responses["coverage"]}
    else:
        return {"response": responses["default"]}
