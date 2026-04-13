from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from shared.schemas.core import TeamInvitation
from shared.schemas.dto import (
    EnrichedTeamInvitationDTO,
    TeamInvitationDTO,
    TeamWithMembershipDTO,
)

from src.dependencies import get_team_invitation_service, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.audit import log_impersonated_action
from src.security.user_context import UserContext
from src.services.team_invitation_service import TeamInvitationService

router = APIRouter()


@router.post("/team-invitations/teams/{team_id}", response_model=TeamInvitationDTO)
async def create_team_invitation(
    team_id: str,
    invitation: TeamInvitationDTO,
    user_context: UserContext = Depends(get_user_context),
    service: TeamInvitationService = Depends(get_team_invitation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id, "create-team-invitation", "team", team_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to create a team invitation.",
            )
        log_impersonated_action(user_context, "create_team_invitation")
        invitation_data = TeamInvitation.from_dto(invitation)
        created_invitation = await service.create_team_invitation(
            invitation=invitation_data,
            sender_id=user_context.effective_user_id,
        )
        if not created_invitation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An invitation with the same email and type already exists.",
            )
        response = created_invitation.to_dto()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    return response


@router.get("/team-invitations/pending", response_model=List[EnrichedTeamInvitationDTO])
async def get_user_pending_invitations(
    user_context: UserContext = Depends(get_user_context),
    service: TeamInvitationService = Depends(get_team_invitation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id,
            "read-team-invitations",
            "user",
            user_context.user_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to read your pending invitations.",
            )
        invitations = service.get_user_pending_invitations(
            user_id=user_context.effective_user_id
        )
        response = [invitation.to_dto() for invitation in invitations]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    return response


@router.get("/team-invitations/teams/{team_id}", response_model=List[TeamInvitationDTO])
async def get_team_invitations(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: TeamInvitationService = Depends(get_team_invitation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id, "read-team-invitations", "team", team_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to read team invitations.",
            )
        invitations = service.get_team_invitations(team_id)
        response = [invitation.to_dto() for invitation in invitations]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    return response


class TeamInvitationResponseRequest(BaseModel):
    token: str


@router.post("/team-invitations/accept")
async def accept_team_invitation(
    request: TeamInvitationResponseRequest,
    user_context: UserContext = Depends(get_user_context),
    service: TeamInvitationService = Depends(get_team_invitation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> TeamWithMembershipDTO:
    try:
        if not await authz.check(
            user_context.user_id,
            "accept-team-invitation",
            "user",
            user_context.user_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to accept team invitations.",
            )
        token = request.token
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is required.",
            )
        log_impersonated_action(user_context, "accept_team_invitation")
        team = await service.accept_team_invitation(
            user_context.effective_user_id, token
        )
        response = team.to_dto()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    return response


@router.post("/team-invitations/reject")
async def reject_team_invitation(
    request: TeamInvitationResponseRequest,
    user_context: UserContext = Depends(get_user_context),
    service: TeamInvitationService = Depends(get_team_invitation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id,
            "reject-team-invitation",
            "user",
            user_context.user_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to reject team invitations.",
            )
        token = request.token
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token is required.",
            )
        log_impersonated_action(user_context, "reject_team_invitation")
        success = service.reject_team_invitation(user_context.effective_user_id, token)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired invitation.",
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    return {"message": "Invitation rejected successfully."}


@router.post("/team-invitations/{invitation_id}/resend/teams/{team_id}")
async def resend_team_invitation_email(
    team_id: str,
    invitation_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: TeamInvitationService = Depends(get_team_invitation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> TeamInvitationDTO:
    try:
        if not await authz.check(
            user_context.user_id, "resend-team-invitation", "team", team_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to resend the team invitation.",
            )
        invitation = await service.resend_invite(invitation_id=invitation_id)
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found or cannot be resent.",
            )
        response = invitation.to_dto()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    return response


@router.delete("/team-invitations/{invitation_id}/teams/{team_id}")
async def delete_team_invitation(
    invitation_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    service: TeamInvitationService = Depends(get_team_invitation_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id,
            "delete-team-invitation",
            "team",
            team_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete the team invitation.",
            )
        service.delete_team_invitation(invitation_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    return {"message": "Invitation deleted successfully."}
