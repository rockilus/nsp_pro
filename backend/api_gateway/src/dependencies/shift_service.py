from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.assignment_service import get_assignment_service
from src.dependencies.database import get_db_collections
from src.dependencies.link_shift_service import get_link_shift_service
from src.services.assignment_service import AssignmentService
from src.services.link_shift_service import LinkShiftService
from src.services.shift_service import ShiftService


def get_shift_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    assignment_service: AssignmentService = Depends(get_assignment_service),
    link_shift_service: LinkShiftService = Depends(get_link_shift_service),
) -> ShiftService:
    return ShiftService(
        collection=db_collections,
        assignment_service=assignment_service,
        link_shift_service=link_shift_service,
    )
