from pydantic import BaseModel

from shared.schemas.dto.team import MembershipForTeamWithMembershipDTO


class UserDTO(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    language: str
    signUpAt: float
    impersonatingUserId: str | None


class UserWithMembershipDTO(BaseModel):
    user: UserDTO
    membership: MembershipForTeamWithMembershipDTO


class PasswordDataDTO(BaseModel):
    currentPassword: str
    newPassword: str
    newPasswordConfirm: str
    accessToken: str
