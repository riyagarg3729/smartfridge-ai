import random
import uuid
from datetime import datetime
from typing import List, Dict

# Mock food items database with typical expiry windows
FOOD_DATABASE = {
    "apple": {"expiry_days": (3, 14), "emoji": "🍎", "category": "fruit", "waste_grams": 182},
    "milk": {"expiry_days": (1, 5), "emoji": "🥛", "category": "dairy", "waste_grams": 400},
    "cheese": {"expiry_days": (5, 21), "emoji": "🧀", "category": "dairy", "waste_grams": 200},
    "lettuce": {"expiry_days": (2, 7), "emoji": "🥬", "category": "vegetable", "waste_grams": 150},
    "tomato": {"expiry_days": (3, 8), "emoji": "🍅", "category": "vegetable", "waste_grams": 120},
    "eggs": {"expiry_days": (14, 35), "emoji": "🥚", "category": "protein", "waste_grams": 50},
    "chicken": {"expiry_days": (1, 3), "emoji": "🍗", "category": "protein", "waste_grams": 300},
    "yogurt": {"expiry_days": (5, 14), "emoji": "🫙", "category": "dairy", "waste_grams": 150},
    "carrot": {"expiry_days": (7, 21), "emoji": "🥕", "category": "vegetable", "waste_grams": 100},
    "strawberry": {"expiry_days": (1, 4), "emoji": "🍓", "category": "fruit", "waste_grams": 50},
    "orange": {"expiry_days": (7, 21), "emoji": "🍊", "category": "fruit", "waste_grams": 131},
    "broccoli": {"expiry_days": (3, 7), "emoji": "🥦", "category": "vegetable", "waste_grams": 350},
    "butter": {"expiry_days": (14, 60), "emoji": "🧈", "category": "dairy", "waste_grams": 250},
    "spinach": {"expiry_days": (2, 5), "emoji": "🌿", "category": "vegetable", "waste_grams": 200},
    "lemon": {"expiry_days": (14, 30), "emoji": "🍋", "category": "fruit", "waste_grams": 85},
    "cucumber": {"expiry_days": (5, 10), "emoji": "🥒", "category": "vegetable", "waste_grams": 200},
    "blueberries": {"expiry_days": (3, 7), "emoji": "🫐", "category": "fruit", "waste_grams": 150},
    "salmon": {"expiry_days": (1, 2), "emoji": "🐟", "category": "protein", "waste_grams": 200},
    "avocado": {"expiry_days": (2, 5), "emoji": "🥑", "category": "fruit", "waste_grams": 170},
    "pepper": {"expiry_days": (5, 14), "emoji": "🫑", "category": "vegetable", "waste_grams": 120},
}

# Mock recipe database
RECIPE_DATABASE = {
    "apple": [
        {"name": "Apple Cinnamon Oatmeal", "time": "15 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1517673408762-ca8e4b8a39e4?w=400"},
        {"name": "Apple Pie", "time": "60 min", "difficulty": "Medium", "image": "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400"},
    ],
    "milk": [
        {"name": "Creamy Milkshake", "time": "5 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400"},
        {"name": "Homemade Pudding", "time": "20 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400"},
    ],
    "eggs": [
        {"name": "Spanish Omelette", "time": "25 min", "difficulty": "Medium", "image": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400"},
        {"name": "Eggs Benedict", "time": "30 min", "difficulty": "Hard", "image": "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400"},
    ],
    "chicken": [
        {"name": "Grilled Chicken Salad", "time": "20 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"},
        {"name": "Chicken Stir Fry", "time": "25 min", "difficulty": "Medium", "image": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400"},
    ],
    "tomato": [
        {"name": "Fresh Tomato Pasta", "time": "20 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400"},
        {"name": "Tomato Soup", "time": "30 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400"},
    ],
    "avocado": [
        {"name": "Avocado Toast", "time": "10 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400"},
        {"name": "Guacamole", "time": "10 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400"},
    ],
    "spinach": [
        {"name": "Spinach Smoothie", "time": "5 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400"},
        {"name": "Spinach Pasta", "time": "25 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400"},
    ],
    "default": [
        {"name": "Veggie Stir Fry", "time": "20 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400"},
        {"name": "Mixed Salad Bowl", "time": "10 min", "difficulty": "Easy", "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"},
        {"name": "Frittata", "time": "35 min", "difficulty": "Medium", "image": "https://images.unsplash.com/photo-1481833761820-0509d3217039?w=400"},
    ]
}


def mock_detect_food_items(image_data: bytes = None) -> List[str]:
    """Mock AI food detection - returns 3-7 random food items"""
    all_items = list(FOOD_DATABASE.keys())
    count = random.randint(4, 8)
    detected = random.sample(all_items, min(count, len(all_items)))
    return detected


def calculate_expiry(items: List[str]) -> Dict[str, str]:
    """Calculate mock expiry for each detected item"""
    expiry = {}
    for item in items:
        if item in FOOD_DATABASE:
            min_days, max_days = FOOD_DATABASE[item]["expiry_days"]
            days = random.randint(min_days, max_days)
            if days == 1:
                expiry[item] = "1 day"
            else:
                expiry[item] = f"{days} days"
        else:
            expiry[item] = f"{random.randint(2, 10)} days"
    return expiry


def get_recipe_suggestions(items: List[str]) -> List[dict]:
    """Get recipe suggestions based on detected items"""
    recipes = []
    seen = set()

    # Sort items by urgency (shortest expiry first)
    for item in items[:5]:
        item_recipes = RECIPE_DATABASE.get(item, RECIPE_DATABASE["default"])
        for recipe in item_recipes:
            if recipe["name"] not in seen:
                seen.add(recipe["name"])
                recipes.append({
                    **recipe,
                    "main_ingredient": item,
                    "id": str(uuid.uuid4())[:8]
                })

    # Always ensure at least 3 recipes
    if len(recipes) < 3:
        for recipe in RECIPE_DATABASE["default"]:
            if recipe["name"] not in seen and len(recipes) < 3:
                seen.add(recipe["name"])
                recipes.append({
                    **recipe,
                    "main_ingredient": "mixed",
                    "id": str(uuid.uuid4())[:8]
                })

    return recipes[:6]


def calculate_waste_saved(items: List[str], expiry: Dict[str, str]) -> int:
    """Calculate estimated waste saved in grams"""
    total = 0
    for item in items:
        days_str = expiry.get(item, "10 days")
        days = int(days_str.split()[0])
        if days <= 5:  # Near expiry items that would likely be wasted
            grams = FOOD_DATABASE.get(item, {}).get("waste_grams", 100)
            total += grams
    return total


def get_item_details(item: str) -> dict:
    """Get details for a food item"""
    return FOOD_DATABASE.get(item, {"emoji": "🥗", "category": "other", "waste_grams": 100})
