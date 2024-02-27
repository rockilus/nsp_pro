from supertokens_python import InputAppInfo, SupertokensConfig
from supertokens_python.recipe import dashboard, emailpassword, session

from services.authentication.override_func import override_emailpassword_functions
from utils.constants import Constants

# this is the location of the SuperTokens core.
supertokens_config = SupertokensConfig(
    connection_uri=Constants.ST_CONNECTION_URI,
    api_key=Constants.ST_API_KEY,
)

app_info = InputAppInfo(
    app_name="Supertokens",
    api_domain=Constants.BASE_URL + ":" + str(Constants.API_PORT),
    website_domain=Constants.BASE_URL + ":" + str(Constants.WEBSITE_PORT),
)

framework = "fastapi"

# recipeList contains all the modules that you want to
# use from SuperTokens. See the full list here: https://supertokens.com/docs/guides
recipe_list = [
    session.init(),
    emailpassword.init(
        override=emailpassword.InputOverrideConfig(
            functions=override_emailpassword_functions
        )
    ),
    dashboard.init(
        admins=list(Constants.ST_DASHBOARD_ADMINS),
    ),
]
