from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from services.ai_service import (
    mock_detect_food_items,
    calculate_expiry,
    get_recipe_suggestions,
    calculate_waste_saved,
    get_item_details
)
from services.database import get_db
from utils.auth import get_current_user
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read image
    image_data = await file.read()
    if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    # AI Detection (mock)
    detected_items = mock_detect_food_items(image_data)
    expiry = calculate_expiry(detected_items)
    recipes = get_recipe_suggestions(detected_items)
    waste_saved = calculate_waste_saved(detected_items, expiry)

    # Enrich items with details
    enriched_items = []
    for item in detected_items:
        details = get_item_details(item)
        days_str = expiry.get(item, "7 days")
        days = int(days_str.split()[0])
        enriched_items.append({
            "name": item,
            "emoji": details["emoji"],
            "category": details["category"],
            "expiry": days_str,
            "expiry_days": days,
            "status": "critical" if days <= 2 else "warning" if days <= 5 else "good"
        })

    # Sort by urgency
    enriched_items.sort(key=lambda x: x["expiry_days"])

    # Save to database
    db = get_db()
    scan_id = str(uuid.uuid4())
    scan_doc = {
        "_id": scan_id,
        "user_id": current_user["user_id"],
        "items": [i["name"] for i in enriched_items],
        "enriched_items": enriched_items,
        "expiry": expiry,
        "recipes": recipes,
        "waste_saved_grams": waste_saved,
        "timestamp": datetime.utcnow(),
        "image_name": file.filename
    }
    await db.scans.insert_one(scan_doc)

    # Update user stats
    await db.users.update_one(
        {"_id": current_user["user_id"]},
        {"$inc": {"total_scans": 1, "total_waste_saved_grams": waste_saved}}
    )

    return {
        "scan_id": scan_id,
        "items": [i["name"] for i in enriched_items],
        "enriched_items": enriched_items,
        "expiry": expiry,
        "recipes": recipes,
        "waste_saved_grams": waste_saved,
        "timestamp": datetime.utcnow().isoformat(),
        "message": f"Detected {len(detected_items)} items in your fridge!"
    }


@router.get("/suggest-today")
async def suggest_today(current_user: dict = Depends(get_current_user)):
    """AI suggestion: what to cook today based on latest scan"""
    db = get_db()
    latest_scan = await db.scans.find_one(
        {"user_id": current_user["user_id"]},
        sort=[("timestamp", -1)]
    )

    if not latest_scan:
        return {"suggestion": "Upload a fridge photo to get personalized suggestions!", "recipe": None}

    # Find most urgent items
    enriched = latest_scan.get("enriched_items", [])
    critical = [i for i in enriched if i.get("status") == "critical"]
    warning = [i for i in enriched if i.get("status") == "warning"]

    urgent = critical or warning
    if urgent:
        item_names = [i["name"] for i in urgent[:3]]
        suggestion = f"🚨 Use your {', '.join(item_names)} today — they're expiring soon!"
        recipes = latest_scan.get("recipes", [])
        recipe = next((r for r in recipes if r.get("main_ingredient") in [i["name"] for i in urgent]), None)
    else:
        suggestion = "✅ Your fridge looks good! Everything is fresh."
        recipe = latest_scan.get("recipes", [{}])[0] if latest_scan.get("recipes") else None

    return {"suggestion": suggestion, "recipe": recipe}
