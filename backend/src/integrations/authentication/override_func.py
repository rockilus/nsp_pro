from typing import Any, Coroutine, Dict, List

from supertokens_python.recipe.emailpassword.constants import FORM_FIELD_EMAIL_ID
from supertokens_python.recipe.emailpassword.interfaces import (
    APIInterface,
    APIOptions,
    GeneralErrorResponse,
    RecipeInterface,
    SignUpEmailAlreadyExistsError,
    SignUpOkResult,
    SignUpPostEmailAlreadyExistsError,
    SignUpPostOkResult,
)
from supertokens_python.recipe.emailpassword.types import FormField
from supertokens_python.utils import find_first_occurrence_in_list

from core import Team, User
from integrations.authorization.authz_services import authz_role_assignment_assign
from scripts.setup_database import config_db
from services.team_services.team_services import create_team
from services.user_services.user_sign_up import create_user


def override_emailpassword_apis(original_implementation: APIInterface):
    original_sign_up_post = original_implementation.sign_up_post

    async def sign_up_post(
        form_fields: List[FormField],
        tenant_id: str,
        api_options: APIOptions,
        user_context: Dict[str, Any],
    ) -> Coroutine[
        Any,
        Any,
        SignUpPostOkResult | SignUpPostEmailAlreadyExistsError | GeneralErrorResponse,
    ]:
        email_form_field = find_first_occurrence_in_list(
            lambda x: x.id == FORM_FIELD_EMAIL_ID, form_fields
        )
        if email_form_field is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Should never come here")
        email = email_form_field.value
        config = config_db.get_config()
        if config is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Config not found in database")
        if config.signup_emails_whitelist_enabled:
            if email not in config.signup_emails_whitelist:
                print("SENDING CUSTOM RESPONSE")
                api_options.response.set_status_code(403)
                json_dict = {'detail': 'email_not_on_whitelist'}
                api_options.response.set_json_content(json_dict)
                return GeneralErrorResponse("email_not_on_whitelist")  # type: ignore

        result = await original_sign_up_post(
            form_fields, tenant_id, api_options, user_context
        )
        return result  # type: ignore

    original_implementation.sign_up_post = sign_up_post  # type: ignore
    return original_implementation


def override_emailpassword_functions(
    original_implementation: RecipeInterface,
) -> RecipeInterface:
    original_sign_up = original_implementation.sign_up

    async def sign_up(
        email: str, password: str, tenant_id: str, user_context: Dict[str, Any]
    ) -> Coroutine[Any, Any, SignUpOkResult | SignUpEmailAlreadyExistsError]:
        # config = config_db.get_config()
        # if config is None:
        #     raise Exception("Config not found in database")
        # if config.signup_emails_whitelist_enabled:
        #     if email not in config.signup_emails_whitelist:
        #         raise Exception("Email not in whitelist")

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
                        language="en",
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
