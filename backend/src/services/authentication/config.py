from services.authentication.override_func import (
    override_emailpassword_functions,
)
from supertokens_python import InputAppInfo, SupertokensConfig
from supertokens_python.recipe import dashboard, emailpassword, session
from utils.env_config import (
    API_PORT,
    API_URL,
    CLIENT_PORT,
    CLIENT_URL,
    ST_API_KEY,
    ST_CONNECTION_URI,
    ST_DASHBOARD_ADMINS,
)

# this is the location of the SuperTokens core.
supertokens_config = SupertokensConfig(
    connection_uri=ST_CONNECTION_URI,
    api_key=ST_API_KEY,
)

app_info = InputAppInfo(
    app_name="Supertokens",
    api_domain=API_URL + ":" + str(API_PORT),
    website_domain=CLIENT_URL + ":" + str(CLIENT_PORT),
)

framework = "fastapi"

recipe_list = [
    session.init(),
    emailpassword.init(
        override=emailpassword.InputOverrideConfig(
            functions=override_emailpassword_functions
        )
    ),
    dashboard.init(
        admins=list(ST_DASHBOARD_ADMINS),
    ),
]
