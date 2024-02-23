from typing import Any, Coroutine, Dict

from permit import Permit  # type: ignore
from supertokens_python.recipe.emailpassword.interfaces import (
    RecipeInterface,
    SignUpEmailAlreadyExistsError,
    SignUpOkResult,
)

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
                await permit.api.users.assign_role(
                    {"user": user_id, "role": "admin", "tenant": "default"}
                )

        return result  # type: ignore

    original_implementation.sign_up = sign_up  # type: ignore

    return original_implementation
