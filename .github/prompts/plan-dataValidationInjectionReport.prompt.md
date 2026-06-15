# Data Validation & Injection Security Report

**Scope:** `backend/shared/src/shared/schemas/`, `backend/shared/src/shared/database/repositories/base.py`, `backend/api_gateway/src/services/team_service.py`, `backend/api_gateway/src/services/notification_service.py`, `backend/api_gateway/src/routes/sqs_solve_routes.py`

**Date:** 2026-06-15 | **Severity Scale:** CRITICAL / HIGH / MEDIUM / LOW

---

## Vector 1 — NoSQL Injection via Raw `$regex` Operators

---

### Finding NI-1 — Six Unescaped `$regex` Values in `team_service.py`

**Severity:** HIGH

**Location:** `backend/api_gateway/src/services/team_service.py` ~L65, 67, 75, 82, 88, 95

**Finding:**

All six search parameters accepted at the admin teams endpoint are concatenated directly into MongoDB `$regex` operators without any call to `re.escape()` or character-class sanitization. The entire string is treated as a raw regular expression pattern by the MongoDB engine.

```python
# Line 65 — team name
team_query["name"] = {"$regex": search_name, "$options": "i"}

# Line 67 — team id
team_query["_id"] = {"$regex": search_team_id, "$options": "i"}

# Lines 75, 82, 88, 95 — owner fields
user_query["_id"]        = {"$regex": search_owner_id,    "$options": "i"}
user_query["first_name"] = {"$regex": search_owner_name,  "$options": "i"}
user_query["last_name"]  = {"$regex": search_owner_name,  "$options": "i"}
user_query["email"]      = {"$regex": search_owner_email, "$options": "i"}
```

A `re.escape` call is found only in a test file (`backend/shared/src/shared/database/tests/database_test.py` L134) — confirming it is not applied in production paths.

**Exploitation Scenario — ReDoS:**
An admin-role attacker (or a compromised admin session) sends `search_name=^(a+)+$`. The MongoDB engine evaluates a catastrophically backtracking regex against every team name document. With a large tenant dataset this stalls the primary thread, causing a denial of service for all users.

**Exploitation Scenario — Targeted Data Extraction:**
An attacker sends `search_owner_email=admin@` — this matches every admin-email-containing account without knowing exact addresses, effectively enumerating the user table via a regex probe. Combined with binary-search style payloads (`^a`, `^b`, …) an attacker can reconstruct opaque field values character-by-character across the `users` collection.

**Remediation:**

```python
import re
from fastapi import Query

# Route layer — enforce length before the value reaches the service
async def get_all_teams(
    search_name: str | None = Query(default=None, max_length=100),
    search_owner_name: str | None = Query(default=None, max_length=100),
    search_owner_email: str | None = Query(default=None, max_length=200),
    search_team_id: str | None = Query(default=None, max_length=24),
    search_owner_id: str | None = Query(default=None, max_length=24),
    ...
)

# Service layer — escape before building the query dict
if search_name:
    team_query["name"] = {"$regex": re.escape(search_name), "$options": "i"}
if search_team_id:
    team_query["_id"] = {"$regex": re.escape(search_team_id), "$options": "i"}
if search_owner_id:
    user_query["_id"] = {"$regex": re.escape(search_owner_id), "$options": "i"}
if search_owner_name:
    escaped = re.escape(search_owner_name)
    user_query["$or"] = [
        {"first_name": {"$regex": escaped, "$options": "i"}},
        {"last_name":  {"$regex": escaped, "$options": "i"}},
    ]
if search_owner_email:
    user_query["email"] = {"$regex": re.escape(search_owner_email), "$options": "i"}
```

`re.escape()` converts all regex metacharacters (`.`, `*`, `+`, `^`, `$`, `(`, `)`, …) to their literal escaped forms, rendering the user input a safe literal-substring search while preserving the case-insensitive `$options: "i"` behavior.

---

### Finding NI-2 — `BaseRepository.find_all()` and `find_one()` Accept Caller-Constructed Filter Dicts Without Validation

**Severity:** MEDIUM

**Location:** `backend/shared/src/shared/database/repositories/base.py` — `find_one` (L83), `find_all` (L90), `count` (L126)

**Finding:**

The base repository exposes three methods that accept an arbitrary `Dict[str, Any]` and pass it directly to `pymongo` without any inspection:

```python
def find_one(self, doc_filter: Optional[Dict[str, Any]] = None) -> Optional[T]:
    doc = self.collection.find_one(doc_filter)          # raw dict → pymongo

def find_all(self, doc_filter: Optional[Dict[str, Any]] = None, ...) -> List[T]:
    cursor = self.collection.find(doc_filter).skip(skip) # raw dict → pymongo

def count(self, doc_filter: Optional[Dict[str, Any]] = None) -> int:
    return self.collection.count_documents(doc_filter)   # raw dict → pymongo
```

Service-layer callers construct these dictionaries by mixing hardcoded keys with values that originate from user-supplied request bodies or query parameters. There is no central enforcement that the values inside the dict are scalar types — any caller can inadvertently (or an attacker via an unconstrained DTO field, see Vector 2) pass a MongoDB operator object as a value.

**Exploitation Scenario:**
If any service builds a filter like `{"user_id": user_supplied_value}` and `user_supplied_value` arrives from a `Dict[str, Any]` field, the attacker can supply `{"$ne": null}` to match every document in the collection rather than their own.

**Remediation:**

This is a defense-in-depth layer. The primary fix is at the DTO boundary (Finding OI-1 through OI-4 below). As a secondary layer, add a shallow operator-key guard to `find_all` / `find_one` / `count`:

```python
import re
_MONGO_OPERATOR_RE = re.compile(r'^\$')

def _assert_no_operators(doc_filter: Dict[str, Any], depth: int = 0) -> None:
    """Raise ValueError if any key in the filter dict starts with '$'."""
    if depth > 5:
        return  # avoid pathological recursion
    for key, value in doc_filter.items():
        if _MONGO_OPERATOR_RE.match(key):
            raise ValueError(f"Prohibited MongoDB operator key in filter: '{key}'")
        if isinstance(value, dict):
            _assert_no_operators(value, depth + 1)

def find_all(self, doc_filter: Optional[Dict[str, Any]] = None, ...) -> List[T]:
    doc_filter = doc_filter or {}
    _assert_no_operators(doc_filter)
    cursor = self.collection.find(doc_filter).skip(skip)
    ...
```

Note: intentional uses of `$in`, `$ne`, etc. in hardcoded service-level queries must be constructed after the user-supplied values are already converted to scalars — they should never originate from a user-controllable field.

---

## Vector 2 — Unconstrained Object Injection via `Dict[str, Any]` Fields

---

### Finding OI-1 — `ImportRecordDTO` / `UpdateImportRequest`: Entire Dataset Arrays Typed as `List[Dict[str, Any]]`

**Severity:** HIGH

**Location:** `backend/shared/src/shared/schemas/dto/import_record.py` — lines 18–21, 47, 55–58

**Finding:**

```python
class ImportRecordDTO(BaseModel):
    members:     List[Dict[str, Any]] = []  # line 18
    shifts:      List[Dict[str, Any]] = []  # line 19
    requests:    List[Dict[str, Any]] = []  # line 20
    assignments: List[Dict[str, Any]] = []  # line 21

class CreateImportRequest(BaseModel):
    previewData: Dict[str, Any]             # line 47 — entire ImportPreviewDTO

class UpdateImportRequest(BaseModel):
    members:     Optional[List[Dict[str, Any]]] = None  # line 55
    shifts:      Optional[List[Dict[str, Any]]] = None  # line 56
    requests:    Optional[List[Dict[str, Any]]] = None  # line 57
    assignments: Optional[List[Dict[str, Any]]] = None  # line 58
```

These four arrays represent the complete data payload for a schedule import. Each element is an unconstrained dictionary — Pydantic applies no structural validation. An attacker who can call the import create/update endpoints can inject arbitrary key-value pairs including MongoDB operator keys (e.g., `{"$where": "sleep(3000)"}`, `{"$ne": null}`) into the data that gets persisted to and later re-read from DocumentDB.

The `previewData: Dict[str, Any]` on `CreateImportRequest` is the highest-risk field: it accepts the entire serialized `ImportPreviewDTO` as a raw blob with zero field-level validation.

**Exploitation Scenario:**
1. Attacker submits `PUT /import-records/{id}` with `members: [{"$where": "sleep(5000)"}]`.
2. The record is persisted as-is by the import repository.
3. Any future read that hydrates these members back into a MongoDB aggregation pipeline or sub-query has operator injection already embedded in the stored document.
4. At minimum, crafted `previewData` values containing multi-megabyte repeated structures cause document-size limit violations, producing opaque 500 errors with no user-visible feedback.

**Remediation:**

Define concrete Pydantic models for each import entity instead of raw dicts:

```python
# Use the existing ImportPreviewDTO, ImportMemberPreviewDTO, etc. from
# backend/shared/src/shared/schemas/dto/import_preview.py

from shared.schemas.dto.import_preview import (
    ImportMemberPreviewDTO,
    ImportShiftPreviewDTO,
    ImportRequestPreviewDTO,
    ImportAssignmentPreviewDTO,
    ImportPreviewDTO,
)

class ImportRecordDTO(BaseModel):
    members:     List[ImportMemberPreviewDTO]     = []
    shifts:      List[ImportShiftPreviewDTO]      = []
    requests:    List[ImportRequestPreviewDTO]    = []
    assignments: List[ImportAssignmentPreviewDTO] = []

class CreateImportRequest(BaseModel):
    previewData: ImportPreviewDTO       # typed — not raw dict

class UpdateImportRequest(BaseModel):
    members:     Optional[List[ImportMemberPreviewDTO]]     = None
    shifts:      Optional[List[ImportShiftPreviewDTO]]      = None
    requests:    Optional[List[ImportRequestPreviewDTO]]    = None
    assignments: Optional[List[ImportAssignmentPreviewDTO]] = None
```

If the preview DTOs genuinely contain dynamic keys that cannot be modelled statically, add a `@field_validator` that rejects any key starting with `$` and enforces a maximum element count:

```python
from pydantic import field_validator

@field_validator("members", "shifts", "requests", "assignments", mode="before")
@classmethod
def reject_operator_keys(cls, v: list) -> list:
    if len(v) > 10_000:
        raise ValueError("Import list exceeds maximum element count")
    for item in v:
        if isinstance(item, dict):
            _reject_mongo_operators(item)  # recursive check defined below
    return v

def _reject_mongo_operators(d: dict, depth: int = 0) -> None:
    if depth > 10:
        return
    for key, value in d.items():
        if str(key).startswith("$"):
            raise ValueError(f"Prohibited key '{key}' in import data")
        if isinstance(value, dict):
            _reject_mongo_operators(value, depth + 1)
```

---

### Finding OI-2 — `Notification.event_data` and `NotificationDTO.event_data`: Untyped Payload Stored and Returned to Clients

**Severity:** MEDIUM

**Location:** `backend/shared/src/shared/schemas/core/notification.py` — line 51 (core dataclass), line 96 (NotificationEvent), line 106 (NotificationDTO)

**Finding:**

```python
@dataclass
class Notification:
    event_data: Dict[str, Any]      # line 51 — persisted to DB

@dataclass
class NotificationEvent:
    event_data: Dict[str, Any]      # line 96 — transient dispatch carrier

class NotificationDTO(BaseModel):
    event_data: Dict[str, Any] = Field(..., alias="eventData")  # line 106 — returned to clients
```

`event_data` is the notification payload that gets stored to MongoDB and subsequently served back to the frontend. While `event_data` is populated internally by builder functions (in `notification_builders.py`) rather than directly from client input, **the `NotificationDTO` returns this field to any authenticated caller** of the notification endpoints with zero type constraints.

Two risks compound:
1. A future developer adding a new notification builder could accidentally include unsanitized user-controlled text (e.g., a swap `comment` or worker `name`) in `event_data` — there is no schema enforcement to prevent operator keys from surviving the round-trip.
2. If an import or solve task embeds MongoDB operator keys in a linked document, and those keys are later referenced when building a notification's `event_data`, the operators ride through into the persisted notification document.

**Remediation:**

Create a `NotificationEventData` union type or a per-`NotificationType` discriminated model. At minimum, add the same `$`-key rejection validator to `NotificationDTO.event_data`:

```python
from pydantic import field_validator

class NotificationDTO(BaseModel):
    event_data: Dict[str, Any] = Field(..., alias="eventData")

    @field_validator("event_data", mode="before")
    @classmethod
    def reject_operator_keys(cls, v: dict) -> dict:
        _reject_mongo_operators(v)   # shared utility — see OI-1
        return v
```

Long-term, type `event_data` as a discriminated union keyed on `NotificationType` so each notification kind has a typed, validated payload contract.

---

### Finding OI-3 — `SwapRequestDTO.bids` and `SwapRequestDTO.auditData`: `List[Dict]` Without Generic Parameter

**Severity:** MEDIUM

**Location:** `backend/shared/src/shared/schemas/dto/swap.py` — lines 43 and 49

**Finding:**

```python
class SwapRequestDTO(BaseModel):
    bids:      List[Dict]   # line 43 — no type parameter, equivalent to List[Dict[Any, Any]]
    auditData: List[Dict]   # line 49 — same issue
```

`List[Dict]` with no generic parameters is equivalent to `List[Dict[Any, Any]]` — Pydantic v2 accepts any key type and any value type without validation. The `bids` array contains `SwapBidDTO` instances serialized as raw dicts at the core layer; the DTO receives them back as opaque blobs. An attacker who controls a swap bid (which they author themselves) can inject operator-keyed dicts into the `bids` array of a `SwapRequestDTO` that is persisted and re-read.

Additionally, `comment: str` on `CreateSwapRequestDTO` (line 20) has no `max_length` constraint — a 50 MB comment string is accepted and stored.

**Remediation:**

```python
class SwapRequestDTO(BaseModel):
    bids:      List[SwapBidDTO]      # typed — reuse the existing SwapBidDTO
    auditData: List[SwapAuditDataDTO]  # define a typed DTO for SwapAuditData

class CreateSwapRequestDTO(BaseModel):
    swapType:                str
    offeredAssignmentIds:    List[str] = Field(min_length=1, max_length=50)
    requestedAssignmentIds:  List[str] | None = Field(default=None, max_length=50)
    targetWorkerId:          str | None = None
    comment:                 str = Field(default="", max_length=500)  # bound it
```

---

### Finding OI-4 — `Breach.meta` and `EmailMessage.context`: Opaque Pass-Through Blobs

**Severity:** LOW

**Location:**
- `backend/shared/src/shared/schemas/core/breach.py` — `meta: Dict[str, Any] | None = None`
- `backend/shared/src/shared/schemas/core/email.py` — `context: Dict[str, Any]`

**Finding:**

`Breach.meta` is populated by the solver at write-time and never accepted from a client API call, making it lower risk for injection. However it is stored in MongoDB and read back without shape validation — a solver bug or a crafted SQS message could place operator-keyed data into `meta` that persists silently.

`EmailMessage.context` holds Jinja-style template variables passed to the email rendering service. If any value inside `context` is user-derived (e.g., a worker name or a swap comment), a template-injection attack (`{{config}}`, `{{self.__class__.__mro__}}`) is theoretically possible if the email template engine evaluates Python expressions.

**Remediation:**

For `Breach.meta`: add `max_properties` enforcement and `$`-key rejection at the schema level:

```python
# Breach is a dataclass — add a post-init guard:
def __post_init__(self):
    if self.meta is not None and len(self.meta) > 50:
        raise ValueError("Breach meta exceeds maximum key count")
```

For `EmailMessage.context`: confirm the templating engine is configured in sandbox mode (auto-escaping enabled, no Python expression evaluation). Add a `max_length` to each string value in the context dict, or validate that only known keys are present per `EmailType`.

---

## Vector 3 — Log Injection Vectors

---

### Finding LI-1 — f-String Interpolation of User-Derived Values in `sqs_solve_routes.py`

**Severity:** MEDIUM

**Location:** `backend/api_gateway/src/routes/sqs_solve_routes.py` — lines 79, 87, 95, 134, 150

**Finding:**

```python
# Line 79 — schedule_id comes from request body (SolveRequest.schedule_id)
logger.info(
    f"SQS solve request submitted for schedule {schedule_id} "
    f"by user {user_context.effective_user_id}"
)

# Line 87 — ve is a ValueError whose message may echo back the raw schedule_id
logger.warning(f"Invalid solve request: {ve}")

# Line 95
logger.error(f"Failed to submit solve request: {e}")

# Lines 134, 150 — solve_id / schedule_id are path parameters from the URL
logger.warning(f"Invalid solve status request: {ve}")
logger.warning(f"Invalid latest solve status request: {ve}")
```

`schedule_id` is a caller-supplied string from the request body. `SolveRequest` currently only applies Pydantic's default `str` coercion — no `max_length`, no pattern enforcement, no sanitization before the value is interpolated into the log line.

A malicious client can supply a `schedule_id` containing CRLF sequences:

```
schedule_id = "abc\r\n2026-06-15 12:00:00 | INFO | Fake log entry injected by attacker"
```

When loguru writes this line using its default plaintext formatter, the embedded `\r\n` causes the forged text to appear as a separate, legitimate-looking log entry in any log shipping system that splits on newlines (CloudWatch Logs, Datadog, Splunk). Upstream SIEMs or alerting rules that pattern-match on log content can be deceived.

The `ValueError` echo in `logger.warning(f"Invalid solve request: {ve}")` compounds this: the `ve` message itself may contain the attacker's injected string verbatim if Pydantic's error formatting reflects the raw input value.

**Exploitation Scenario:**
```http
POST /sqs-solve/start
{
  "schedule_id": "legit123\r\n2026-06-15T12:00:00 | INFO | User admin logged in from 1.2.3.4",
  "team_id": "aaaabbbbccccddddeeee1111"
}
```
Resulting injected log line visible in CloudWatch:
```
2026-06-15T12:00:00 | INFO | User admin logged in from 1.2.3.4
```

**Remediation:**

Add a `sanitize_for_log` utility in `backend/shared/src/shared/utils/log_sanitizer.py`:

```python
import re

_UNSAFE_LOG_CHARS = re.compile(r'[\r\n\x1b\x00-\x08\x0b\x0c\x0e-\x1f]')

def sanitize_for_log(value: str, max_length: int = 200) -> str:
    """Strip CRLF, ANSI escape sequences, and control characters from user input
    before interpolating into log messages. Truncate to max_length."""
    sanitized = _UNSAFE_LOG_CHARS.sub('', str(value))
    return sanitized[:max_length]
```

Apply at every log call site that interpolates user-controlled values:

```python
# sqs_solve_routes.py
logger.info(
    "SQS solve request submitted for schedule {} by user {}",
    sanitize_for_log(schedule_id),
    sanitize_for_log(user_context.effective_user_id),
)
logger.warning("Invalid solve request: {}", sanitize_for_log(str(ve)))
```

Use loguru's lazy `{}` placeholder style (not f-strings) — this ensures the sanitized value is formatted by loguru after the record is fully constructed, and avoids double-interpolation bugs.

---

### Finding LI-2 — f-String Interpolation of `NotificationType` and `user_id` in `notification_service.py`

**Severity:** LOW

**Location:** `backend/api_gateway/src/services/notification_service.py` — lines 227–234, 250, 299, 347

**Finding:**

```python
# Line 227 — event.notification_type derives from an internal enum; low risk
logger.debug(
    f"Skipping {event.notification_type} notification "
    f"for user {user_id}: inApp preference is disabled"
)

# Line 233 — pref_exc may contain user-derived error context
logger.warning(
    f"Could not fetch preferences for user {user_id}, "
    f"defaulting to send: {pref_exc}"
)

# Line 250 — e (exception) may echo user input from notification_type or event_data
logger.error(
    f"Failed to dispatch {event.notification_type} notification "
    f"to user {user_id}: {e}"
)
```

`event.notification_type` is an internal `NotificationType` enum and is not attacker-controllable at this layer. However `pref_exc` and `e` are exception objects whose string representations may reflect upstream user-controlled values (e.g., a worker name, swap comment, or email address that appeared in a DB query that raised).

The `user_id` originates from a verified Cognito JWT claim and is low risk for injection, but it is still a string that flows from an external system and should be treated as untrusted for log formatting purposes.

**Remediation:**

```python
# Use loguru placeholder style and sanitize exception context
logger.warning(
    "Could not fetch preferences for user {}, defaulting to send: {}",
    sanitize_for_log(user_id),
    sanitize_for_log(str(pref_exc)),
)
logger.error(
    "Failed to dispatch {} notification to user {}: {}",
    event.notification_type.value,   # enum .value is safe (no user input)
    sanitize_for_log(user_id),
    sanitize_for_log(str(e)),
)
```

---

## Summary Table

| ID | Location | Severity | Category | Root Cause |
|---|---|---|---|---|
| NI-1 | `team_service.py` L65–95 | HIGH | ReDoS + data extraction via `$regex` | 6 unescaped user strings passed directly as regex patterns |
| NI-2 | `base.py` L83–130 | MEDIUM | NoSQL operator injection via raw filter dicts | `find_all`/`find_one`/`count` accept `Dict[str, Any]` without operator-key rejection |
| OI-1 | `import_record.py` L18–58 | HIGH | MongoDB operator injection + unbounded payload | 4 arrays + 1 blob typed `List[Dict[str, Any]]` / `Dict[str, Any]` with no validation |
| OI-2 | `notification.py` L51, 96, 106 | MEDIUM | Operator injection via persisted event payload | `event_data: Dict[str, Any]` stored and returned with no `$`-key rejection |
| OI-3 | `swap.py` L43, 49, 20 | MEDIUM | Operator injection + unbounded string | `bids`/`auditData` as `List[Dict]`; `comment` has no `max_length` |
| OI-4 | `breach.py` + `email.py` | LOW | Operator injection + template injection surface | `meta` and `context` are opaque blobs with no shape validation |
| LI-1 | `sqs_solve_routes.py` L79, 87, 95 | MEDIUM | Log forgery / SIEM poisoning | `schedule_id` (user body) interpolated via f-string with no CRLF stripping |
| LI-2 | `notification_service.py` L227–250 | LOW | Log forgery via exception echoing | Exception strings may echo user-derived values with no sanitization |

---

## Recommended Priority Order for Remediation

1. **NI-1** — `re.escape()` + `Query(max_length=...)` on all six `$regex` sites. One-line fix per site. Highest blast radius (ReDoS + data extraction against the users collection).
2. **OI-1** — Replace `List[Dict[str, Any]]` with typed preview DTOs in `import_record.py`. Pre-existing typed DTOs exist in `import_preview.py` — this is a type substitution, not new work.
3. **LI-1** — Introduce `sanitize_for_log()` utility and apply to `sqs_solve_routes.py`. Shared utility usable across all future log sites.
4. **NI-2** — Add operator-key guard to `BaseRepository` methods as defense-in-depth layer.
5. **OI-2 / OI-3** — Add `@field_validator` with `$`-key rejection to `NotificationDTO.event_data`, `SwapRequestDTO.bids`, and bound `CreateSwapRequestDTO.comment`.
6. **OI-4 / LI-2** — Low-severity hardening; address in a follow-up pass.
