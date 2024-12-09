import requests
from shared.schemas import EngineOutputs

from config import config


def notify_api_gateway(engine_outputs: EngineOutputs) -> None:
    url = (
        f"{config.api_gateway_url}/schedules/{engine_outputs.schedule.id}"
        + f"/notifify-solved/teams/{engine_outputs.schedule.team_id}"
    )
    payload = {"engine_outputs": engine_outputs.to_dict()}
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        # Handle/log the error
        raise RuntimeError(f"Failed to notify API Gateway: {e}") from e
