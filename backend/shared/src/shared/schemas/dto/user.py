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
    systemRole: str | None = None


class UserUpdateDTO(BaseModel):
    """Fields a user is allowed to update on their own profile.

    Intentionally excludes id, email, signUpAt, impersonatingUserId, and systemRole.
    Email changes affect authentication (Cognito) and must go through a
    dedicated endpoint.
    """

    firstName: str
    lastName: str
    language: str


class UserWithMembershipDTO(BaseModel):
    user: UserDTO
    membership: MembershipForTeamWithMembershipDTO


class PasswordDataDTO(BaseModel):
    currentPassword: str
    newPassword: str
    newPasswordConfirm: str
