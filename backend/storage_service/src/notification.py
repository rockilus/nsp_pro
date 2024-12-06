import requests

from config import config


def notify_api_gateway(schedule_id: str, team_id: str) -> None:
    url = (
        f"{config.api_gateway_url}/schedules/{schedule_id}"
        + f"/notifify-solved/teams/{team_id}"
    )
    payload = {"record_id": "record_id"}
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        # Handle/log the error
        raise RuntimeError(f"Failed to notify API Gateway: {e}") from e
