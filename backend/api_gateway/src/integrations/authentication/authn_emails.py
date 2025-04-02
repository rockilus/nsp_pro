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

from src.integrations.email_sender.verification_email import (
    send_reset_password_email,
    send_verification_email,
)
from src.scripts.setup_database import user_db


def custom_email_deliver(
    original_implementation: EmailDeliveryOverrideInput,
) -> EmailDeliveryOverrideInput:
    # original_send_email = original_implementation.send_email

    # pylint: disable=unused-argument
    async def send_email(
        template_vars: EmailTemplateVars, user_context: Dict[str, Any]
    ) -> None:
        user = user_db.get_user_by_id(template_vars.user.id)
        if user is None:
            raise UserNotFoundError(f"User with id {template_vars.user.id} not found")
        send_reset_password_email(
            user=user,
            reset_password_link=template_vars.password_reset_link,
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
        user = user_db.get_user_by_id(template_vars.user.id)
        if user is None:
            raise UserNotFoundError(f"User with id {template_vars.user.id} not found")
        send_verification_email(
            user=user,
            email_verify_link=template_vars.email_verify_link,
        )

    original_implementation.send_email = send_email  # type: ignore
    return original_implementation
