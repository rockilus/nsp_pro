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
from supertokens_python.recipe.emailverification.types import (
    EmailDeliveryOverrideInput as EVEmailDeliveryOverrideInput,
)
from supertokens_python.recipe.emailverification.types import (
    EmailTemplateVars as EVEmailTemplateVars,
)

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
