"""Repository for swap request documents."""

from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.swap import SwapRequestSchema
from shared.schemas.core import SwapRequest, SwapStatus


class SwapRepository(BaseRepository[SwapRequestSchema]):
    """Repository for swap request documents using modern database interface."""

    def __init__(self, database_interface: DatabaseInterface):
        """
        Initialize SwapRepository.

        Args:
            database_interface: Database interface instance
        """
        super().__init__(database_interface, "swap_requests", SwapRequestSchema)

    def create_swap_request(self, swap_request: SwapRequest) -> SwapRequest:
        """Create a new swap request."""
        swap_schema = SwapRequestSchema.from_core(swap_request)
        result = self.create(swap_schema)
        return result.to_core()

    def get_swap_by_id(self, swap_id: str) -> Optional[SwapRequest]:
        """Get a swap request by its ID."""
        swap = self.find_by_id(swap_id)
        return swap.to_core() if swap else None

    def get_swaps_by_team(
        self, team_id: str, status: Optional[SwapStatus] = None
    ) -> List[SwapRequest]:
        """
        Get all swap requests for a team, optionally filtered by status.

        Args:
            team_id: Team ID
            status: Optional status filter

        Returns:
            List of SwapRequest objects
        """
        query = {"team": team_id}
        if status is not None:
            query["status"] = status.value

        swaps = self.find_all(query)
        return [s.to_core() for s in swaps]

    def update_swap_request(self, swap_request: SwapRequest) -> SwapRequest:
        """Update an existing swap request."""
        swap_schema = SwapRequestSchema.from_core(swap_request)
        result = self.update(schema=swap_schema)
        if result is None:
            raise ValueError(f"Swap request {swap_request.id} not found for update")
        return result.to_core()

    def delete_swap_request(self, swap_id: str) -> bool:
        """Delete a swap request by ID."""
        return self.delete(swap_id)
