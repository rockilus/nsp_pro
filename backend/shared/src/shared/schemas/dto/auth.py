from pydantic import BaseModel, EmailStr, field_validator


class SignUpRequestDTO(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class SignInRequestDTO(BaseModel):
    email: EmailStr
    password: str


class ConfirmCodeRequestDTO(BaseModel):
    email: EmailStr
    code: str


class ForgotPasswordRequestDTO(BaseModel):
    email: EmailStr


class ConfirmForgotPasswordRequestDTO(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class ChangeEmailRequestDTO(BaseModel):
    new_email: EmailStr


class VerifyEmailRequestDTO(BaseModel):
    code: str


class ResendCodeRequestDTO(BaseModel):
    email: EmailStr
