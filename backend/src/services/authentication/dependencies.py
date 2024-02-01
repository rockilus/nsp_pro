from datetime import datetime, timedelta
from typing import Annotated, Optional, Tuple

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt  # type: ignore
from passlib.context import CryptContext  # type: ignore

from core.user import User
from scripts.setup_database import user_db
from utils.constants import Constants

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password, hashed_password) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password) -> str:
    return pwd_context.hash(password)


def authenticate_user(username: str, password: str) -> User | bool:
    user = user_db.get_user_by_username(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, Constants.SECRET_KEY, algorithm=Constants.ALGORITHM
    )
    return encoded_jwt


async def get_access_token_from_cookie(request: Request) -> str:
    token_cookie = request.cookies.get("access_token")
    scheme, param = get_access_token_scheme_param(token_cookie)
    if not token_cookie or scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            # headers={"WWW-Authenticate": "Bearer"},
        )
    return param


def get_access_token_scheme_param(
    access_token_cookie_value: Optional[str],
) -> Tuple[str, str]:
    if not access_token_cookie_value:
        return "", ""
    scheme, _, param = access_token_cookie_value.partition(" ")
    return scheme, param


async def get_current_user(
    token: Annotated[str, Depends(get_access_token_from_cookie)]
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, Constants.SECRET_KEY, algorithms=[Constants.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc
    user = user_db.get_user_by_username(username=username)
    if user is None:
        raise credentials_exception
    return user
