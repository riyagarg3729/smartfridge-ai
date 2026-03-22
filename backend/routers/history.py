from fastapi import APIRouter, Depends, Query
from services.database import get_db
from utils.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/history")
async def get_history(
    limit: int = Query(default=10, le=50),
    skip: int = Query(default=0),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    cursor = db.scans.find(
        {"user_id": current_user["user_id"]},
        sort=[("timestamp", -1)]
    ).skip(skip).limit(limit)

    scans = []
    async for scan in cursor:
        scan["id"] = scan.pop("_id")
        scans.append(scan)

    total = await db.scans.count_documents({"user_id": current_user["user_id"]})

    return {"scans": scans, "total": total, "limit": limit, "skip": skip}


@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    db = get_db()

    # Last 7 scans for bar chart
    cursor = db.scans.find(
        {"user_id": current_user["user_id"]},
        sort=[("timestamp", -1)]
    ).limit(7)

    scans = []
    async for scan in cursor:
        scans.append(scan)
    scans.reverse()

    # Bar chart: waste saved per scan
    waste_chart = [
        {
            "label": s["timestamp"].strftime("%b %d") if hasattr(s["timestamp"], "strftime") else "Scan",
            "value": s.get("waste_saved_grams", 0)
        }
        for s in scans
    ]

    # Line chart: expiry trend (avg days left across scans)
    expiry_trend = []
    for s in scans:
        expiry = s.get("expiry", {})
        if expiry:
            days_list = []
            for val in expiry.values():
                try:
                    days_list.append(int(val.split()[0]))
                except:
                    pass
            avg = sum(days_list) / len(days_list) if days_list else 0
            expiry_trend.append({
                "label": s["timestamp"].strftime("%b %d") if hasattr(s["timestamp"], "strftime") else "Scan",
                "value": round(avg, 1)
            })

    # User stats
    user = await db.users.find_one({"_id": current_user["user_id"]})
    total_waste_saved = user.get("total_waste_saved_grams", 0) if user else 0
    total_scans = user.get("total_scans", 0) if user else 0

    # Category breakdown from latest scan
    latest = scans[-1] if scans else None
    category_data = {}
    if latest:
        for item_info in latest.get("enriched_items", []):
            cat = item_info.get("category", "other")
            category_data[cat] = category_data.get(cat, 0) + 1

    return {
        "waste_chart": waste_chart,
        "expiry_trend": expiry_trend,
        "total_waste_saved_grams": total_waste_saved,
        "total_scans": total_scans,
        "co2_saved_kg": round(total_waste_saved * 0.0025, 2),
        "money_saved_usd": round(total_waste_saved * 0.003, 2),
        "category_breakdown": category_data
    }


@router.delete("/history/{scan_id}")
async def delete_scan(scan_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.scans.delete_one({
        "_id": scan_id,
        "user_id": current_user["user_id"]
    })
    if result.deleted_count == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"message": "Scan deleted successfully"}
