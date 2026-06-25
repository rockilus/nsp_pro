from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SignUpRequestDTO(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "first_name": "Jane",
                "last_name": "Smith",
                "password": "securePass123",
                "confirm_password": "securePass123",
            }
        }
    )

    email: EmailStr = Field(examples=["user@example.com"])
    first_name: str = Field(examples=["Jane"])
    last_name: str = Field(examples=["Smith"])
    password: str = Field(examples=["securePass123"])
    confirm_password: str = Field(examples=["securePass123"])

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
