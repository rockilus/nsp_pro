from typing import List

from supertokens_python import get_all_cors_headers, init
from supertokens_python.framework.fastapi import get_middleware
from supertokens_python.recipe.session.framework.fastapi import verify_session

from services.authentication import config

init(
    supertokens_config=config.supertokens_config,
    app_info=config.app_info,
    framework=config.framework,  # type: ignore
    recipe_list=config.recipe_list,
    mode="asgi",
)


def authn_get_middleware():
    return get_middleware()


def authn_get_cors_headers() -> List[str]:
    return get_all_cors_headers()


def authn_verify_session():
    return verify_session()
