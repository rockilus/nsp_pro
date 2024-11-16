from typing import Dict, List

import requests

from utils.env_config import ST_API_KEY, ST_CONNECTION_URI

# Supertokens API doc:
# https://app.swaggerhub.com/apis/supertokens/CDI/4.0.2#/Core/getUsers


def authn_get_all_users() -> List[Dict]:
    users = []
    pagination_token = None

    try:
        while True:
            params = {
                "limit": 100,
            }
            if pagination_token:
                params["paginationToken"] = pagination_token

            response = requests.get(
                f"{ST_CONNECTION_URI}/users",
                headers={"api-key": ST_API_KEY},
                params=params,
                timeout=10,
            )
            response.raise_for_status()  # Raise an exception for HTTP errors
            data = response.json()

            users.extend(data["users"])

            # Check if there's another page of results
            if "nextPaginationToken" in data:
                pagination_token = data["nextPaginationToken"]
            else:
                break

    except requests.exceptions.RequestException as e:
        print(f"Error fetching users: {e}")
        return []

    return users
