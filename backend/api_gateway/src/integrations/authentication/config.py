from supertokens_python import InputAppInfo, SupertokensConfig
from supertokens_python.ingredients.emaildelivery.types import (
    EmailDeliveryConfig,
)
from supertokens_python.recipe import (
    dashboard,
    emailpassword,
    emailverification,
    session,
)
from supertokens_python.recipe.emailpassword import InputFormField

from src.config import config
from src.integrations.authentication.authn_emails import (
    custom_email_deliver,
    custom_email_verification_delivery,
)
from src.integrations.authentication.override_func import (
    override_emailpassword_apis,
)

# this is the location of the SuperTokens core.
supertokens_config = SupertokensConfig(
    connection_uri=config.st_connection_uri,
    api_key=config.st_api_key,
)

app_info = InputAppInfo(
    app_name="Supertokens",
    api_domain=config.api_url,
    website_domain=config.client_url,
)

framework = "fastapi"

recipe_list = [
    emailverification.init(
        mode="REQUIRED",
        email_delivery=EmailDeliveryConfig(override=custom_email_verification_delivery),
    ),
    session.init(cookie_domain=config.st_cookie_domain),
    emailpassword.init(
        override=emailpassword.InputOverrideConfig(
            apis=override_emailpassword_apis,
        ),
        email_delivery=EmailDeliveryConfig(override=custom_email_deliver),
        sign_up_feature=emailpassword.InputSignUpFeature(
            form_fields=[
                InputFormField(id="language"),
                InputFormField(id="firstName"),
                InputFormField(id="lastName"),
            ]
        ),
    ),
    dashboard.init(
        admins=config.st_dashboard_admins,
    ),
]
