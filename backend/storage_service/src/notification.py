# import requests
# from shared.schemas import EngineOutputsAugmented

# from config import config


# def notify_api_gateway(eo_augmented: EngineOutputsAugmented) -> None:
#     url = (
#         f"{config.api_gateway_url}/schedules/{eo_augmented.schedule.id}"
#         + f"/notifify-solved/teams/{eo_augmented.schedule.team_id}"
#     )
#     payload = {"eo_augmented": eo_augmented.to_dict()}
#     try:
#         response = requests.post(url, json=payload, timeout=10)
#         response.raise_for_status()
#     except requests.RequestException as e:
#         # Handle/log the error
#         raise RuntimeError(f"Failed to notify API Gateway: {e}") from e
