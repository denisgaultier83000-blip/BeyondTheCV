from fastapi import APIRouter
router = APIRouter(prefix="/profile", tags=["Profile"])

@router.get("/health")
async def profile_router_health():
return {"status": "ok", "service": "profile"}
