from dataclasses import asdict

import humps
from fastapi import APIRouter
from pydantic import TypeAdapter

from core.user import User
from routes.api_model import User as UserMessage

# from scripts.setup_database import user_db

router = APIRouter()


# @router.post("/signup", response_model=UserMessage)
# async def signup(response: Response, req: UserSignUpMessage) -> UserMessage:
#     usu_data = user_sign_up_api_to_core(req)
#     user_exist = user_db.get_user_by_email(usu_data.username)
#     if user_exist is not None:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Username already registered",
#         )
#     u_data = user_sign_up_to_user(usu_data)
#     user = user_db.create_user(u_data)
#     access_token_expires = timedelta(
#         minutes=Constants.ACCESS_TOKEN_EXPIRE_MINUTES
#     )
#     access_token = create_access_token(
#         data={"sub": user.username}, expires_delta=access_token_expires
#     )
#     response.set_cookie()
#     return user_to_api_msg(user)


# @router.post("/token", response_model=UserMessage)
# async def login_for_access_token(
#     response: Response,
#     form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
# ) -> UserMessage:
#     user = authenticate_user(form_data.username, form_data.password)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     access_token_expires = timedelta(
#         minutes=Constants.ACCESS_TOKEN_EXPIRE_MINUTES
#     )
#     access_token = create_access_token(
#         data={"sub": user.username}, expires_delta=access_token_expires
#     )
#     response.set_cookie()
#     return user_to_api_msg(user)  # type: ignore


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
#     response.set_cookie()
#     return {"message": "Refresh successful"}


# @router.get("/user/me", response_model=UserMessage)
# async def read_users_me(
#     current_user: Annotated[User, Depends(get_current_user)]
# ) -> UserMessage:
#     return user_to_api_msg(current_user)


# @router.post("/signout")
# async def signout(response: Response) -> Dict:
#     response.delete_cookie("access_token")
#     return {"message": "Logout successful"}


def user_to_api_msg(
    user: User,
) -> UserMessage:
    data = asdict(user)
    data = {k: v for k, v in data.items() if k not in ["hashed_password", "roles"]}
    as_dict = humps.camelize(data)
    validator = TypeAdapter(UserMessage)
    return validator.validate_python(as_dict)


# def user_sign_up_api_to_core(
#     msg: UserSignUpMessage,
# ) -> UserSignUp:
#     data_snake = humps.decamelize(msg.model_dump())
#     return UserSignUp(**data_snake)
