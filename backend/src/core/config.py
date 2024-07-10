from dataclasses import dataclass
from typing import List


@dataclass
class Config:
    id: str
    signup_emails_whitelist_enabled: bool
    signup_emails_whitelist: List[str]
    signup_emails_attempt: List[str]
