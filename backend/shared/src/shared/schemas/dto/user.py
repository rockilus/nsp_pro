from typing import List

from pydantic import BaseModel

from shared.schemas.dto.team import MembershipForTeamWithMembershipDTO


class UserDTO(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    workers: List[str]
    language: str
    signUpAt: float


class UserWithMembershipDTO(BaseModel):
    user: UserDTO
    membership: MembershipForTeamWithMembershipDTO


class PasswordDataDTO(BaseModel):
    currentPassword: str
    newPassword: str
    newPasswordConfirm: str


class UserAuthDTO(BaseModel):
    id: str
    email: str


class UserDashboardDTO(BaseModel):
    user: UserDTO | None
    userAuthn: UserAuthDTO | None
    userAuthz: UserAuthDTO | None
