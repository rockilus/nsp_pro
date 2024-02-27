from typing import List

from supertokens_python import get_all_cors_headers, init
from supertokens_python.framework.fastapi import get_middleware

from services.authentication import config

init(
    supertokens_config=config.supertokens_config,
    app_info=config.app_info,
    framework=config.framework,  # type: ignore
    recipe_list=config.recipe_list,
    mode="asgi",
)


def get_authn_middleware():
    return get_middleware()


def get_authn_cors_headers() -> List[str]:
    return get_all_cors_headers()
