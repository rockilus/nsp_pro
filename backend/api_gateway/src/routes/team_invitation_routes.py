from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr
from shared.schemas.core.team_invitation import TeamInvitation
from shared.schemas.dto.team_invitation import TeamInvitationDTO

from src.dependencies import get_team_invitation_service
from src.services.team_invitation_service import TeamInvitationService

router = APIRouter()


@router.post("/team-invitations", response_model=TeamInvitationDTO)
async def create_team_invitation(
    invitation: TeamInvitationDTO,
    service: TeamInvitationService = Depends(get_team_invitation_service),
):
    invitation_data = TeamInvitation.from_dto(invitation)
    created_invitation = await service.create_team_invitation(invitation_data)
    if not created_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An invitation with the same email and type already exists.",
        )
    return created_invitation.to_dto()


@router.get("/team-invitations/{team_id}", response_model=List[TeamInvitationDTO])
def get_team_invitations(
    team_id: str,
    service: TeamInvitationService = Depends(get_team_invitation_service),
):
    invitations = service.get_team_invitations(team_id)
    return [invitation.to_dto() for invitation in invitations]


@router.get("/team-invitations/pending", response_model=List[TeamInvitationDTO])
def get_pending_invitations_by_email(
    email: EmailStr,
    service: TeamInvitationService = Depends(get_team_invitation_service),
):
    invitations = service.get_pending_invitations_by_email(email)
    return [invitation.to_dto() for invitation in invitations]


@router.post("/team-invitations/accept")
async def accept_team_invitation(
    user_id: str,
    token: str,
    service: TeamInvitationService = Depends(get_team_invitation_service),
):
    success = await service.accept_team_invitation(user_id, token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation.",
        )
    return {"message": "Invitation accepted successfully."}


@router.post("/team-invitations/reject")
def reject_team_invitation(
    user_id: str,
    token: str,
    service: TeamInvitationService = Depends(get_team_invitation_service),
):
    success = service.reject_team_invitation(user_id, token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation.",
        )
    return {"message": "Invitation rejected successfully."}


@router.post("/team-invitations/{invitation_id}/resend")
def resend_team_invitation_email(
    invitation_id: str,
    service: TeamInvitationService = Depends(get_team_invitation_service),
) -> TeamInvitationDTO:
    invitation = service.resend_invite(invitation_id=invitation_id)
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or cannot be resent.",
        )
    return invitation.to_dto()


@router.delete("/team-invitations/{invitation_id}")
def delete_team_invitation(
    invitation_id: str,
    service: TeamInvitationService = Depends(get_team_invitation_service),
):
    service.delete_team_invitation(invitation_id)
    return {"message": "Invitation deleted successfully."}
