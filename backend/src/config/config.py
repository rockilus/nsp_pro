from supertokens_python.recipe import emailpassword, session, dashboard
from supertokens_python import (
    InputAppInfo,
    SupertokensConfig,
)
from utils.constants import Constants

# this is the location of the SuperTokens core.
supertokens_config = SupertokensConfig(
    connection_uri="https://try.supertokens.com"
)

app_info = InputAppInfo(
    app_name="Supertokens",
    api_domain=Constants.BASE_URL + ":" + str(Constants.API_PORT),
    website_domain=Constants.BASE_URL + ":" + str(Constants.WEBSITE_PORT),
)

framework = "fastapi"

# recipeList contains all the modules that you want to
# use from SuperTokens. See the full list here: https://supertokens.com/docs/guides
recipe_list = [session.init(), emailpassword.init(), dashboard.init()]
