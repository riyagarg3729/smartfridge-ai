from fastapi import APIRouter, HTTPException, status
from models.schemas import UserSignup, UserLogin, Token
from services.database import get_db
from utils.auth import hash_password, verify_password, create_access_token
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/signup", response_model=Token)
async def signup(user_data: UserSignup):
    db = get_db()

    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user_data.password)

    user_doc = {
        "_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed_pw,
        "created_at": datetime.utcnow(),
        "total_scans": 0,
        "total_waste_saved_grams": 0
    }

    await db.users.insert_one(user_doc)

    token = create_access_token({
        "sub": user_id,
        "email": user_data.email,
        "name": user_data.name
    })

    return Token(
        access_token=token,
        user={"id": user_id, "email": user_data.email, "name": user_data.name}
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = get_db()

    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": user["_id"],
        "email": user["email"],
        "name": user["name"]
    })

    return Token(
        access_token=token,
        user={
            "id": user["_id"],
            "email": user["email"],
            "name": user["name"],
            "total_scans": user.get("total_scans", 0),
            "total_waste_saved_grams": user.get("total_waste_saved_grams", 0)
        }
    )
