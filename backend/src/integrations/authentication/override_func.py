from typing import Any, Coroutine, Dict

from supertokens_python.recipe.emailpassword.interfaces import (
    RecipeInterface,
    SignUpEmailAlreadyExistsError,
    SignUpOkResult,
)

from core import Team, User
from integrations.authorization.authz_services import authz_role_assignment_assign
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
        print("sending sign up request to supertokens:", email)
        result = await original_sign_up(email, password, tenant_id, user_context)
        print("supertokens response:", isinstance(result, SignUpOkResult), email)

        # Post sign in/up response, we check if it was successful
        if isinstance(result, SignUpOkResult):
            user_id = result.user.user_id
            email = result.user.email
            if result.user:
                print("creating user and team in mongodb:", email)
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
                print("user and team created in mongodb:", email)
                print("assigning user as leader of team in permit.io:", email)
                await authz_role_assignment_assign(user_id, "team", team.id, "leader")
                await authz_role_assignment_assign(user_id, "user", user_id, "owner")
                print("user assigned as leader of team in permit.io:", email)
        return result  # type: ignore

    original_implementation.sign_up = sign_up  # type: ignore

    return original_implementation
