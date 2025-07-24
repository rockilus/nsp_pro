from typing import Any, Coroutine, Dict, List

from shared.schemas.core import Language
from supertokens_python.recipe.emailpassword.constants import (
    FORM_FIELD_EMAIL_ID,
)
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

from src.factories import get_database, get_user_service
from src.integrations.authentication.authn_emails import create_link
from src.integrations.email_sender import EmailSender


def override_emailpassword_apis(original_implementation: APIInterface):
    original_sign_up_post = original_implementation.sign_up_post

    # pylint: disable=too-many-arguments, too-many-locals
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
        user_service = get_user_service(request=api_options.request.request)
        db_collections = get_database(request=api_options.request.request)

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
        try:
            language = Language(language)
        except ValueError as exc:
            # pylint: disable=broad-exception-raised
            raise Exception(f"Language {language} not supported") from exc

        first_name_form_field = find_first_occurrence_in_list(
            lambda x: x.id == "firstName", form_fields
        )
        if first_name_form_field is None:
            # pylint: disable=broad-exception-raised
            raise Exception("First name is missing")
        first_name = first_name_form_field.value

        last_name_form_field = find_first_occurrence_in_list(
            lambda x: x.id == "lastName", form_fields
        )
        if last_name_form_field is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Last name is missing")
        last_name = last_name_form_field.value
        config = db_collections.config_db.get_config()
        if config is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Config not found in database")
        email_sender = EmailSender()
        if config.signup_emails_whitelist_enabled:
            if email not in config.signup_emails_whitelist:
                if email not in config.signup_emails_attempt:
                    config = db_collections.config_db.add_signup_email_attempt(email)
                    email_sender.send_email(
                        to_addresses=["felipe.kharaba@rockilus.com"],
                        subject="New signup attempt",
                        html_body=f"""
                        <html>
                            <body>
                                <h1>New signup attempt</h1>
                                <p>Email: {email}</p>
                                <p>First name: {first_name}</p>
                                <p>Last name: {last_name}</p>
                                <p>Language: {language}</p>
                            </body>
                        </html>
                        """,
                        cc_addresses=None,
                    )
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
                user = await user_service.create_user(
                    user_id=user_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                email_verify_link = await create_link(
                    user_id=user.id,
                    email=email,
                )
                if email_verify_link is None:
                    # pylint: disable=broad-exception-raised
                    raise Exception("Email verification link is None")
                # email_sender = EmailSender()
                email_sender.send_template_email(
                    to_address=user.email,
                    template_name="verification_email",
                    context={
                        "subject": "Please verify your email address",
                        "recipient_name": f"{user.first_name or ''}".strip()
                        + " "
                        + f"{user.last_name or ''}".strip(),
                        "verification_link": email_verify_link,
                    },
                    language=user.language,
                )

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
