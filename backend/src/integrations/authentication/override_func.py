from datetime import datetime, timezone
from typing import Any, Coroutine, Dict, List

from supertokens_python.recipe.emailpassword.constants import FORM_FIELD_EMAIL_ID
from supertokens_python.recipe.emailpassword.interfaces import (
    APIInterface,
    APIOptions,
    EmailAlreadyExistsError,
    GeneralErrorResponse,
    SignUpPostNotAllowedResponse,
    SignUpPostOkResult,
)
from supertokens_python.recipe.emailpassword.types import FormField
from supertokens_python.recipe.session.interfaces import SessionContainer
from supertokens_python.utils import find_first_occurrence_in_list

from core import Team, User
from integrations.authorization.authz_services import authz_role_assignment_assign
from integrations.email_sender.verification_email import send_signup_attempt_email
from scripts.setup_database import config_db
from services.team_services.team_services import create_team
from services.user_services.user_sign_up import create_user
from utils.constants import SUPPORTED_LANGUAGES_LIST


def override_emailpassword_apis(original_implementation: APIInterface):
    original_sign_up_post = original_implementation.sign_up_post

    # pylint: disable=too-many-arguments
    async def sign_up_post(
        form_fields: List[FormField],
        tenant_id: str,
        session: SessionContainer | None,
        should_try_linking_with_session_user: bool | None,
        api_options: APIOptions,
        user_context: Dict[str, Any],
    ) -> Coroutine[
        Any,
        Any,
        SignUpPostOkResult
        | EmailAlreadyExistsError
        | SignUpPostNotAllowedResponse
        | GeneralErrorResponse,
    ]:
        # async def sign_up_post(
        #     form_fields: List[FormField],
        #     tenant_id: str,
        #     session: SessionContainer,
        #     user_context: Dict[str, Any],
        # ) -> Coroutine[
        #     Any,
        #     Any,
        #     SignUpPostOkResult
        #     | EmailAlreadyExistsError
        #     | SignUpPostNotAllowedResponse
        #     | GeneralErrorResponse,
        # ]:
        email_form_field = find_first_occurrence_in_list(
            lambda x: x.id == FORM_FIELD_EMAIL_ID, form_fields
        )
        if email_form_field is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Should never come here")
        email = email_form_field.value
        language_form_field = find_first_occurrence_in_list(
            lambda x: x.id == "language", form_fields
        )
        if language_form_field is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Should never come here")
        language = language_form_field.value
        if language not in SUPPORTED_LANGUAGES_LIST:
            # pylint: disable=broad-exception-raised
            raise Exception(f"Language {language} not supported")
        config = config_db.get_config()
        if config is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Config not found in database")
        if config.signup_emails_whitelist_enabled:
            if email not in config.signup_emails_whitelist:
                if email not in config.signup_emails_attempt:
                    config = config_db.add_signup_email_attempt(email)
                    send_signup_attempt_email(email)
                print("SENDING CUSTOM RESPONSE")
                api_options.response.set_status_code(200)
                # json_dict = {'detail': 'email_not_on_whitelist'}
                json_dict = {
                    "status": "SIGN_UP_NOT_ALLOWED",
                    "reason": "EMAIL_NOT_IN_WHITELIST",
                    "fetchResponse": None,
                }
                api_options.response.set_json_content(json_dict)
                return GeneralErrorResponse("email_not_on_whitelist")  # type: ignore

        # result = await original_sign_up_post(
        #     form_fields, tenant_id, api_options, user_context
        # )
        result = await original_sign_up_post(
            form_fields,
            tenant_id,
            session,
            should_try_linking_with_session_user,
            api_options,
            user_context,
        )

        # Post sign in/up response, we check if it was successful
        # if isinstance(result, SignUpPostOkResult):
        if (
            isinstance(result, SignUpPostOkResult)
            and len(result.user.login_methods) == 1
            and session is None
        ):
            user_id = result.user.id
            email = result.user.emails[0]
            if result.user:
                print("creating user and team in mongodb:", email)
                await create_user(
                    User(
                        id=user_id,
                        email=email,
                        first_name="",
                        last_name="",
                        workers=[],
                        language=language,  # type: ignore
                        sign_up_at=datetime.now(timezone.utc),
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

    original_implementation.sign_up_post = sign_up_post  # type: ignore
    return original_implementation


# from supertokens_python import init, InputAppInfo
# from supertokens_python.recipe import emailpassword
# from supertokens_python.recipe.emailpassword.interfaces import (
#     APIInterface,
#     APIOptions,
#     SignUpPostOkResult,
# )
# from supertokens_python.recipe.emailpassword.types import FormField
# from typing import Dict, Any, List, Union
# from supertokens_python.recipe.session.interfaces import SessionContainer


# def override_email_password_apis(original_implementation: APIInterface):
#     original_sign_up_post = original_implementation.sign_up_post

#     async def sign_up_post(
#         form_fields: List[FormField],
#         tenant_id: str,
#         session: Union[SessionContainer, None],
#         should_try_linking_with_session_user: Union[bool, None],
#         api_options: APIOptions,
#         user_context: Dict[str, Any],
#     ):
#         # First we call the original implementation of sign_up_post.
#         response = await original_sign_up_post(
#             form_fields,
#             tenant_id,
#             session,
#             should_try_linking_with_session_user,
#             api_options,
#             user_context,
#         )

#         # Post sign up response, we check if it was successful
#         if (
#             isinstance(response, SignUpPostOkResult)
#             and len(response.user.login_methods) == 1
#             and session is None
#         ):
#             _id = response.user.id
#             emails = response.user.emails
#             print(_id)
#             print(emails)

#             name = ""

#             for field in form_fields:
#                 if field.id == "name":
#                     name = field.value

#             print(name)

#         return response

#     original_implementation.sign_up_post = sign_up_post
#     return original_implementation


# init(
#     app_info=InputAppInfo(api_domain="...", app_name="...", website_domain="..."),
#     framework="...",
#     recipe_list=[
#         emailpassword.init(
#             override=emailpassword.InputOverrideConfig(
#                 apis=override_email_password_apis
#             )
#         )
#     ],
# )
