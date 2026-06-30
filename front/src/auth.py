import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
# Assuming you have these helpers for user auth and password verification
# from .. import crud, schemas
# from ..dependencies import get_db
# from ..core.security import verify_password, create_access_token

router = APIRouter()

# Récupération des secrets depuis l'environnement
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

@router.post("/api/auth/token", tags=["Authentication"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Handles user and admin login, returning a JWT token.
    It first checks for admin credentials, then falls back to regular user authentication.
    """
    # Logique de connexion pour l'administrateur
    if form_data.username == ADMIN_EMAIL and form_data.password == ADMIN_PASSWORD:
        expire = datetime.now(timezone.utc) + timedelta(minutes=30)
        to_encode = {"sub": form_data.username, "exp": expire, "role": "admin"}
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
        return {"access_token": encoded_jwt, "token_type": "bearer", "role": "admin"}

    # --- Logique pour les utilisateurs normaux ---
    # This part assumes you have a database and user verification logic.
    # Since that code is not provided, I will outline the standard implementation.
    # user = crud.get_user_by_email(db, email=form_data.username)
    # if not user or not verify_password(form_data.password, user.hashed_password):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Incorrect username or password",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )
    #
    # access_token = create_access_token(data={"sub": user.email})
    # return {"access_token": access_token, "token_type": "bearer", "role": "user"}

    # For now, as the user logic is not implemented, we'll raise an error
    # if the credentials are not the admin's.
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )