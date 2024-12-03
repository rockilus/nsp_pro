from integrations.authentication.authn_emails import (
    custom_email_deliver,
    custom_emailverification_delivery,
)
from integrations.authentication.override_func import override_emailpassword_apis
from supertokens_python import InputAppInfo, SupertokensConfig
from supertokens_python.ingredients.emaildelivery.types import EmailDeliveryConfig
from supertokens_python.recipe import (
    dashboard,
    emailpassword,
    emailverification,
    session,
)
from supertokens_python.recipe.emailpassword import InputFormField
from utils.env_config import (
    API_URL,
    CLIENT_URL,
    ST_API_KEY,
    ST_CONNECTION_URI,
    ST_COOKIE_DOMAIN,
    ST_DASHBOARD_ADMINS,
)

# this is the location of the SuperTokens core.
supertokens_config = SupertokensConfig(
    connection_uri=ST_CONNECTION_URI,
    api_key=ST_API_KEY,
)

app_info = InputAppInfo(
    app_name="Supertokens",
    api_domain=API_URL,
    website_domain=CLIENT_URL,
)

framework = "fastapi"

recipe_list = [
    emailverification.init(
        mode="REQUIRED",
        email_delivery=EmailDeliveryConfig(override=custom_emailverification_delivery),
    ),
    session.init(cookie_domain=ST_COOKIE_DOMAIN),
    emailpassword.init(
        override=emailpassword.InputOverrideConfig(
            apis=override_emailpassword_apis,
        ),
        email_delivery=EmailDeliveryConfig(override=custom_email_deliver),
        sign_up_feature=emailpassword.InputSignUpFeature(
            form_fields=[InputFormField(id="language")]
        ),
    ),
    dashboard.init(
        admins=list(ST_DASHBOARD_ADMINS),
    ),
]
