from fastapi import APIRouter

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/health")
async def profile_router_health() -> dict:
    return {"status": "ok", "service": "profile"}
