from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, oauth2_scheme
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.token_blacklist import TokenBlacklist
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_token_response(user_id: int) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(user_id)),
        refresh_token=create_refresh_token(str(user_id)),
        expires_in=settings.access_token_expire_minutes * 60,
        refresh_expires_in=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


def _blacklist_token(
    db: Session,
    *,
    token_jti: str,
    token_type: str,
    user_id: int,
    token_exp: int,
) -> None:
    already_blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.jti == token_jti).first()
    if already_blacklisted:
        return

    db.add(
        TokenBlacklist(
            jti=token_jti,
            token_type=token_type,
            user_id=user_id,
            expires_at=datetime.fromtimestamp(token_exp, tz=UTC),
        )
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")

    full_name = payload.full_name or payload.email.split("@")[0]
    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=full_name,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(user=UserResponse.model_validate(user), tokens=_build_token_response(user.id))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")

    return AuthResponse(user=UserResponse.model_validate(user), tokens=_build_token_response(user.id))


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    token_payload = decode_token(payload.refresh_token)

    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is required.")

    token_jti = token_payload.get("jti")
    token_sub = token_payload.get("sub")
    token_exp = token_payload.get("exp")
    if not token_jti or not token_sub or not token_exp:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed refresh token.")

    is_blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.jti == token_jti).first()
    if is_blacklisted:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked.")

    user = db.query(User).filter(User.id == int(token_sub)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    blacklisted = TokenBlacklist(
        jti=token_jti,
        token_type="refresh",
        user_id=user.id,
        expires_at=datetime.fromtimestamp(token_exp, tz=UTC),
    )
    db.add(blacklisted)
    db.commit()

    return _build_token_response(user.id)


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: LogoutRequest | None = None,
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> MessageResponse:
    access_payload = decode_token(token)
    token_jti = access_payload.get("jti")
    token_exp = access_payload.get("exp")
    token_type = access_payload.get("type")
    if not token_jti or not token_exp or not token_type:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token.")

    _blacklist_token(
        db,
        token_jti=token_jti,
        token_type=token_type,
        user_id=current_user.id,
        token_exp=token_exp,
    )

    if payload and payload.refresh_token:
        try:
            refresh_payload = decode_token(payload.refresh_token)
        except HTTPException:
            refresh_payload = {}
        refresh_jti = refresh_payload.get("jti")
        refresh_exp = refresh_payload.get("exp")
        refresh_sub = refresh_payload.get("sub")
        if (
            refresh_payload.get("type") == "refresh"
            and refresh_jti
            and refresh_exp
            and refresh_sub == str(current_user.id)
        ):
            _blacklist_token(
                db,
                token_jti=refresh_jti,
                token_type="refresh",
                user_id=current_user.id,
                token_exp=refresh_exp,
            )

    db.commit()

    return MessageResponse(message="Logout successful.")
