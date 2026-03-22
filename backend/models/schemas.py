from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional
from datetime import datetime

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    id: str
    email: str
    name: str
    hashed_password: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ScanResult(BaseModel):
    items: List[str]
    expiry: Dict[str, str]
    recipes: List[dict]
    waste_saved_grams: int
    scan_id: str
    timestamp: datetime

class HistoryEntry(BaseModel):
    scan_id: str
    user_id: str
    image_url: Optional[str]
    items: List[str]
    expiry: Dict[str, str]
    recipes: List[dict]
    waste_saved_grams: int
    timestamp: datetime
