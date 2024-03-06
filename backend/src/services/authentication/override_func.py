from typing import Any, Coroutine, Dict

from supertokens_python.recipe.emailpassword.interfaces import (
    RecipeInterface,
    SignUpEmailAlreadyExistsError,
    SignUpOkResult,
)

from core.team import Team
from core.user import User
from services.authorization.authz_services import permit_role_assignment_assign
from services.team_services.team_services import create_team
from services.user_services.user_sign_up import create_user


def override_emailpassword_functions(
    original_implementation: RecipeInterface,
) -> RecipeInterface:
    original_sign_up = original_implementation.sign_up

    async def sign_up(
        email: str, password: str, tenant_id: str, user_context: Dict[str, Any]
    ) -> Coroutine[Any, Any, SignUpOkResult | SignUpEmailAlreadyExistsError]:
        # First we call the original implementation of signInUpPOST.
        result = await original_sign_up(email, password, tenant_id, user_context)

        # Post sign in/up response, we check if it was successful
        if isinstance(result, SignUpOkResult):
            user_id = result.user.user_id
            email = result.user.email
            if result.user:
                await create_user(
                    User(
                        id=user_id,
                        email=email,
                        first_name="",
                        last_name="",
                        workers=[],
                    )
                )
                team = await create_team(
                    Team(id="", team_members=[user_id], team_leaders=[user_id])
                )
                await permit_role_assignment_assign(user_id, "team", team.id, "leader")
        return result  # type: ignore

    original_implementation.sign_up = sign_up  # type: ignore

    return original_implementation
