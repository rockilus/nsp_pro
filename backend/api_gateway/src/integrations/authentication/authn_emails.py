from typing import Any, Dict

from shared.schemas.errors import UserNotFoundError

# from supertokens_python import InputAppInfo, init
# from supertokens_python.ingredients.emaildelivery.types import (
#     EmailDeliveryConfig,
# )
# from supertokens_python.recipe import emailpassword, emailverification
from supertokens_python.recipe.emailpassword.types import (
    EmailDeliveryOverrideInput,
    EmailTemplateVars,
)
from supertokens_python.recipe.emailverification.asyncio import (
    create_email_verification_link,
)
from supertokens_python.recipe.emailverification.interfaces import (
    CreateEmailVerificationLinkOkResult,
)
from supertokens_python.recipe.emailverification.types import (
    EmailDeliveryOverrideInput as EVEmailDeliveryOverrideInput,
)
from supertokens_python.recipe.emailverification.types import (
    EmailTemplateVars as EVEmailTemplateVars,
)
from supertokens_python.types import RecipeUserId

from src.db import db_collections
from src.integrations.email_sender import EmailSender


def custom_email_deliver(
    original_implementation: EmailDeliveryOverrideInput,
) -> EmailDeliveryOverrideInput:
    # original_send_email = original_implementation.send_email

    # pylint: disable=unused-argument
    async def send_email(
        template_vars: EmailTemplateVars, user_context: Dict[str, Any]
    ) -> None:
        user = db_collections.user_db.get_user_by_id(template_vars.user.id)
        if user is None:
            raise UserNotFoundError(f"User with id {template_vars.user.id} not found")

        email_sender = EmailSender()
        email_sender.send_template_email(
            to_address=user.email,
            template_name="reset_password_email",
            context={
                "subject": "Your password reset link",
                "recipient_name": f"{user.first_name or ''}".strip()
                + " "
                + f"{user.last_name or ''}".strip(),
                "reset_password_link": template_vars.password_reset_link,
            },
            language=user.language,
        )

    original_implementation.send_email = send_email  # type: ignore
    return original_implementation


def custom_email_verification_delivery(
    original_implementation: EVEmailDeliveryOverrideInput,
) -> EVEmailDeliveryOverrideInput:
    # original_send_email = original_implementation.send_email

    # pylint: disable=unused-argument
    async def send_email(
        template_vars: EVEmailTemplateVars, user_context: Dict[str, Any]
    ) -> None:
        user = db_collections.user_db.get_user_by_id(template_vars.user.id)
        if user is None:
            raise UserNotFoundError(f"User with id {template_vars.user.id} not found")

        # pylint: disable=R0801
        email_sender = EmailSender()
        email_sender.send_template_email(
            to_address=user.email,
            template_name="verification_email",
            context={
                "subject": "Please verify your email address",
                "recipient_name": f"{user.first_name or ''}".strip()
                + " "
                + f"{user.last_name or ''}".strip(),
                "verification_link": template_vars.email_verify_link,
            },
            language=user.language,
        )

    original_implementation.send_email = send_email  # type: ignore
    return original_implementation


async def create_link(user_id: str, email: str) -> str | None:
    # Create an email verification link for the user
    recipe_user_id = RecipeUserId(recipe_user_id=user_id)
    link_res = await create_email_verification_link("public", recipe_user_id, email)

    if isinstance(link_res, CreateEmailVerificationLinkOkResult):
        return link_res.link
    print("user's email is already verified")
    return None
