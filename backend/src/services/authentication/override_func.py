from typing import Any, Coroutine, Dict

from permit import Permit  # type: ignore
from supertokens_python.recipe.emailpassword.interfaces import (
    RecipeInterface,
    SignUpEmailAlreadyExistsError,
    SignUpOkResult,
)

from services.user_services.user_sign_up import user_sign_up
from utils.constants import Constants

permit = Permit(pdp=Constants.PDP_URL, token=Constants.PERMIT_API_KEY)


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
                await permit.api.users.sync({"key": user_id, "email": email})
                team_id = user_sign_up(user_id, email)
                permit_team_instance = await permit.api.resource_instances.create(
                    {
                        "key": team_id,
                        "resource": "team",
                        "tenant": "default",
                    }
                )
                await permit.api.role_assignments.assign(
                    {
                        "role": "leader",
                        "resource_instance": f"team:{permit_team_instance.key}",
                        "user": user_id,
                        "tenant": "default",
                    }
                )
        return result  # type: ignore

    original_implementation.sign_up = sign_up  # type: ignore

    return original_implementation
