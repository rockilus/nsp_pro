from dataclasses import asdict
from datetime import timedelta
from typing import Annotated, Dict

import humps
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import TypeAdapter

from core.user import User, UserSignUp
from routes.api_model import User as UserMessage
from routes.api_model import UserSignUp as UserSignUpMessage
from scripts.setup_database import user_db
from services.authentication.dependencies import (
    authenticate_user,
    create_access_token,
    get_current_user,
)
from services.authentication.user_processing import user_sign_up_to_user
from utils.constants import Constants

router = APIRouter()


@router.post("/signup", response_model=UserMessage)
async def signup(response: Response, req: UserSignUpMessage) -> UserMessage:
    usu_data = user_sign_up_api_to_core(req)
    user_exist = user_db.get_user_by_username(usu_data.username)
    if user_exist is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    u_data = user_sign_up_to_user(usu_data)
    user = user_db.create_user(u_data)
    access_token_expires = timedelta(minutes=Constants.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,  # set to true for production
        secure=False,  # set to true for production
        samesite="lax",  # set to "lax" for production
        # domain="127.0.0.1",  # set to your domain for production
        # expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        # max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return user_to_api_msg(user)


@router.post("/token", response_model=UserMessage)
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> UserMessage:
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=Constants.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires  # type: ignore
    )
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,  # set to true for production
        secure=False,  # set to true for production
        samesite="lax",  # set to "lax" for production
        # domain="127.0.0.1",  # set to your domain for production
        # expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        # max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return user_to_api_msg(user)  # type: ignore


# @router.get("/refresh-token", response_model=Dict)
# async def refresh_access_token(
#     response: Response,
#     current_user: Annotated[User, Depends(get_current_user)],
# ) -> Dict:
#     access_token_expires = timedelta(
#         minutes=Constants.ACCESS_TOKEN_EXPIRE_MINUTES
#     )
#     access_token = create_access_token(
#         data={"sub": current_user.username},
#           expires_delta=access_token_expires,  # type: ignore
#     )
#     response.set_cookie(
#         key="access_token",
#         value=f"Bearer {access_token}",
#         httponly=True,  # set to true for production
#         secure=False,  # set to true for production
#         samesite="lax",  # set to "lax" for production
#         # domain="127.0.0.1",  # set to your domain for production
#         # expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
#         # max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
#     )
#     return {"message": "Refresh successful"}


@router.get("/user/me", response_model=UserMessage)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_user)]
) -> UserMessage:
    return user_to_api_msg(current_user)


@router.post("/signout")
async def signout(response: Response) -> Dict:
    response.delete_cookie("access_token")
    return {"message": "Logout successful"}


def user_to_api_msg(
    user: User,
) -> UserMessage:
    data = asdict(user)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(UserMessage)
    return validator.validate_python(as_dict)


def api_msg_to_user(
    msg: UserMessage,
) -> User:
    data_snake = humps.decamelize(msg.model_dump())
    return User(**data_snake)


def user_sign_up_api_to_core(
    msg: UserSignUpMessage,
) -> UserSignUp:
    data_snake = humps.decamelize(msg.model_dump())
    return UserSignUp(**data_snake)
