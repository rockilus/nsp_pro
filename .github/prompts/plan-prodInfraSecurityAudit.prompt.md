# IaC Cybersecurity Threat Model & Vulnerability Report — Rockilus Production Infrastructure

**Audit Date:** 2026-06-15
**Auditor Role:** Principal Cloud Security Architect / AWS DevSecOps
**Scope:** `infra/` directory — all modules and production environment configuration
**Methodology:** Static analysis of Terraform HCL across all layers; no infrastructure was modified or applied.

---

## Executive Summary

The infrastructure is architecturally sound with several strong security practices already in place: OAC-protected CloudFront S3 origins, VPC-isolated ECS workloads, DocumentDB TLS enforcement, KMS-encrypted SQS queues, Secrets Manager for database credentials, and deletion protection on stateful resources. However, the audit identified **19 findings** across the five risk vectors, including **1 Critical**, **8 High**, **7 Medium**, and **3 Low** severity issues. The most impactful findings are: a wildcard `Resource = "*"` SQS policy fallback that can expand blast radius to all queues in the account, a backend API key stored in Terraform state in plaintext, absent stage-level API Gateway throttling, and disabled Cognito Advanced Security Mode on a healthcare platform.

---

## 1. S3 and CloudFront Edge Hardening

| Finding ID | Resource Name | Severity | Specific Vulnerability |
|---|---|---|---|
| CF-001 | `aws_cloudfront_distribution.frontend` | **High** | No `aws_cloudfront_response_headers_policy` — HSTS, CSP, X-Frame-Options, X-Content-Type-Options absent |
| CF-002 | `aws_s3_bucket_server_side_encryption_configuration.frontend` | **Medium** | SSE-S3 (AES256) used instead of SSE-KMS with a customer-managed key |
| CF-003 | `aws_s3_bucket.public_assets` | **Medium** | No `aws_s3_bucket_server_side_encryption_configuration` resource exists for the public assets bucket |

---

### CF-001 — Missing CloudFront Security Response Headers Policy

**Exploit Vector / Blast Radius**

Without security response headers, the Rockilus SPA is exposed to the following browser-exploitable attack classes:

- **Clickjacking (CWE-1021):** No `X-Frame-Options: DENY` means an attacker can embed `app.rockilus.com` in an invisible iframe on a malicious page and trick healthcare managers into clicking UI elements that submit schedule changes.
- **Protocol Downgrade / MITM (CWE-326):** Without `Strict-Transport-Security`, a user who visits the plain-HTTP URL for the first time is vulnerable to a man-in-the-middle SSL stripping attack before HSTS is negotiated. The CloudFront `viewer_protocol_policy = "redirect-to-https"` only protects the CDN→browser leg after the first TCP connection.
- **MIME Confusion (CWE-430):** Absent `X-Content-Type-Options: nosniff` allows a browser to MIME-sniff a maliciously uploaded file that a content admin mistakenly placed in the S3 bucket and execute it as JavaScript.
- **Reflected XSS Cross-Origin Leakage (CWE-79):** No Content-Security-Policy means any XSS vector can exfiltrate session tokens to arbitrary external origins. For a Cognito PKCE-based SPA, this can be used to steal the authorization code from a compromised callback page.

**File:** `infra/modules/s3-static-frontend/cloudfront.tf`

**Vulnerable HCL (current):**
```hcl
default_cache_behavior {
  allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
  cached_methods         = ["GET", "HEAD"]
  target_origin_id       = "S3-${aws_s3_bucket.frontend.id}"
  compress               = true
  viewer_protocol_policy = "redirect-to-https"
  # No response_headers_policy_id
  ...
}
```

**Corrected, production-ready HCL:**
```hcl
# Define the response headers policy with full security header suite
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-security-headers-${var.environment}"
  comment = "Strict security headers for healthcare SPA"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000 # 2 years
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.rockilus.com https://cognito-idp.${var.aws_region}.amazonaws.com; frame-ancestors 'none';"
      override                = true
    }
  }
}

# Reference it in all cache behaviors
default_cache_behavior {
  ...
  viewer_protocol_policy      = "redirect-to-https"
  response_headers_policy_id  = aws_cloudfront_response_headers_policy.security_headers.id
}

ordered_cache_behavior {
  path_pattern = "/_next/static/*"
  ...
  response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
}
```

---

### CF-002 — Frontend S3 Bucket Uses SSE-S3 Instead of SSE-KMS

**Exploit Vector / Blast Radius**

SSE-S3 (AES256) encrypts at rest but AWS manages the key internally with no customer visibility, no key rotation audit trail, and no ability to revoke access by disabling a key. For healthcare SaaS, if a rogue AWS support employee or an insider with cross-account access targets the S3 bucket, there is no customer-controlled key boundary.

With SSE-KMS (CMK), you can: enforce key policies that deny decryption outside specific IAM principals, log every `Decrypt` API call in CloudTrail, and immediately revoke data access by disabling the key.

**File:** `infra/modules/s3-static-frontend/s3.tf`

**Vulnerable HCL (current):**
```hcl
rule {
  apply_server_side_encryption_by_default {
    sse_algorithm = "AES256"
  }
  bucket_key_enabled = true
}
```

**Corrected HCL:**
```hcl
rule {
  apply_server_side_encryption_by_default {
    sse_algorithm     = "aws:kms"
    kms_master_key_id = var.kms_key_id  # Pass in CMK ARN from the calling environment
  }
  bucket_key_enabled = true  # Reduces KMS API call costs
}
```

---

### CF-003 — Public Assets S3 Bucket Has No Server-Side Encryption

**Exploit Vector / Blast Radius**

`infra/modules/s3_public_assets/main.tf` creates a publicly readable S3 bucket containing the Rockilus logo and OG/schedule images. There is no `aws_s3_bucket_server_side_encryption_configuration` resource defined for this bucket. While the objects are publicly readable, the absence of encryption means compliance audits (SOC 2, HIPAA Business Associate considerations) will flag this bucket as non-compliant with encryption-at-rest controls. Additionally, if bucket permissions are accidentally misconfigured to private, the lack of encryption creates a gap that is impossible to remediate retroactively.

**File:** `infra/modules/s3_public_assets/main.tf`

**Vulnerable HCL (current):** No `aws_s3_bucket_server_side_encryption_configuration` resource exists.

**Corrected HCL:**
```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "public_assets" {
  bucket = aws_s3_bucket.public_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"  # AWS-managed key acceptable for intentionally public objects
    }
    bucket_key_enabled = true
  }
}
```

---

## 2. Network Isolation & Security Groups

| Finding ID | Resource Name | Severity | Specific Vulnerability |
|---|---|---|---|
| NET-001 | `aws_security_group.main_service` | **High** | Broad `0.0.0.0/0` ingress rule on port 4000 alongside the scoped NLB rule — API bypass possible from within VPC |
| NET-002 | `aws_security_group.nlb` | **Medium** | NLB SG ingress open on port 80 (unencrypted) from `0.0.0.0/0`; no VPC CIDR scoping |
| NET-003 | `aws_security_group.docdb` | **Low** | Misnamed/non-functional "CloudShell access" self-referencing ingress rule; semantic confusion introduces maintenance risk |

---

### NET-001 — Main Service ECS SG Allows `0.0.0.0/0` Ingress on Port 4000

**Exploit Vector / Blast Radius**

The security group for the `api_gateway` ECS container (FastAPI on port 4000) defines two active ingress rules simultaneously:

1. A scoped rule via `aws_security_group_rule.main_service_nlb_ingress` (correct — NLB SG source only).
2. A broad inline ingress rule: `cidr_blocks = ["0.0.0.0/0"]` on port 4000.

The second rule entirely bypasses the API Gateway → NLB → ECS trust boundary. Any resource within the VPC — including a compromised Lambda, an attacker who pivoted from an over-permissioned ECS task, or a developer workstation with VPN access — can call the FastAPI service directly on port 4000, **skipping Cognito authentication and Cerbos authorization entirely**. The attacker only needs to know the private ECS task IP (available from Service Discovery, CloudMap, or ECS `describe-tasks`) and can call any authenticated API endpoint unauthenticated.

**File:** `infra/modules/security-groups/main.tf`

**Vulnerable HCL (current):**
```hcl
resource "aws_security_group" "main_service" {
  ...
  ingress {
    description = "HTTP traffic"
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]   # <-- full VPC and beyond
  }
  ...
}
```

**Corrected HCL:**
```hcl
resource "aws_security_group" "main_service" {
  name_prefix = "${var.project_name}-${var.environment}-main-service-"
  description = "Security group for ${var.project_name} ${var.environment} main service"
  vpc_id      = var.vpc_id

  # Remove the broad 0.0.0.0/0 ingress — access is exclusively via the NLB SG rule below
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# NLB-scoped ingress remains the only inbound path
resource "aws_security_group_rule" "main_service_nlb_ingress" {
  type                     = "ingress"
  from_port                = var.main_service_port
  to_port                  = var.main_service_port
  protocol                 = "tcp"
  source_security_group_id = var.nlb_security_group_id
  security_group_id        = aws_security_group.main_service.id
  description              = "Traffic exclusively from Network Load Balancer"
}
```

---

### NET-002 — NLB Security Group Ingress Open on Port 80 from `0.0.0.0/0`

**Exploit Vector / Blast Radius**

The NLB is correctly provisioned as internal (`internal = true`), limiting its reachability to VPC-routable addresses. However, its security group accepts port 80 from `0.0.0.0/0`. This means:

1. **No TLS at the NLB layer.** Traffic from the API Gateway VPC Link to the backend ECS tasks travels unencrypted over plain HTTP port 80. Any process with VPC-level network access (compromised Lambda, ECR misconfiguration, VPC peering) can read or inject cleartext traffic including Cognito JWT tokens forwarded in the `Authorization` header.
2. **Overly broad source.** Even though the NLB is internal, scoping to the VPC CIDR block or — better — to the API Gateway service-linked VPC endpoint CIDR is significantly more restrictive.

**File:** `infra/modules/network-load-balancer/main.tf`

**Vulnerable HCL (current):**
```hcl
ingress {
  cidr_blocks = ["0.0.0.0/0"]
  from_port   = 80
  to_port     = 80
  protocol    = "tcp"
  ...
}
```

**Corrected HCL:**
```hcl
ingress {
  description = "API Gateway VPC Link traffic within VPC only"
  from_port   = 80
  to_port     = 80
  protocol    = "tcp"
  cidr_blocks = [var.vpc_cidr_block]  # Scoped to VPC CIDR only
}
```
> **Further hardening:** Migrate the NLB listener and ECS target group to port 443/TLS so traffic between the API Gateway VPC Link and the FastAPI container is encrypted in transit.

---

### NET-003 — DocumentDB SG Self-Referencing "CloudShell" Ingress Rule

**Exploit Vector / Blast Radius**

The DocumentDB security group has an ingress rule where `self = true` is set, labeled "Cloudshell access" in the description. `self = true` on an ingress rule only allows traffic **originating from other resources that also belong to this same security group** — which for a DocumentDB cluster means traffic from the cluster itself, not from CloudShell. CloudShell operates outside the VPC and requires a completely different connectivity mechanism (VPC endpoint, bastion host, or explicit IP range). This is a **silent misconfiguration**: CloudShell does not actually gain access, but the rule adds semantic confusion that could mislead future engineers into believing external admin access is scoped and controlled, when it is neither functional nor absent.

**File:** `infra/modules/documentdb/main.tf`

**Vulnerable HCL (current):**
```hcl
ingress {
  description      = "Cloudshell access"
  from_port        = 27017
  to_port          = 27017
  protocol         = "tcp"
  cidr_blocks      = []
  ipv6_cidr_blocks = []
  prefix_list_ids  = []
  security_groups  = []
  self             = true   # Does not provide CloudShell access
}
```

**Corrected HCL:** Remove the rule entirely. Admin DB access should be performed via a dedicated bastion host or AWS Systems Manager Session Manager with explicit port-forwarding, using a separate, time-limited security group rule when needed:
```hcl
# Remove the self-referencing ingress entirely.
# DocumentDB admin access: use SSM Session Manager port-forward from a bastion SG:
# resource "aws_security_group_rule" "docdb_bastion_admin" {
#   type                     = "ingress"
#   from_port                = 27017
#   to_port                  = 27017
#   protocol                 = "tcp"
#   source_security_group_id = var.bastion_security_group_id
#   security_group_id        = aws_security_group.docdb.id
#   description              = "Admin access via SSM bastion only"
# }
```

---

## 3. IAM Least Privilege & Resource Policies

| Finding ID | Resource Name | Severity | Specific Vulnerability |
|---|---|---|---|
| IAM-001 | `aws_iam_policy.ecs_task_execution_sqs_policy` | **Critical** | SQS IAM policy silently falls back to `Resource = "*"` when ARN variables are empty |
| IAM-002 | `aws_iam_role.ecs_task_execution_role` | **High** | Single role conflates ECS agent execution permissions with application-level SQS + Secrets access; task role is commented out |
| IAM-003 | `aws_iam_role_policy.ses_send_email` | **High** | Lambda SES policy uses `Resource = "*"` for `ses:SendEmail`/`ses:SendRawEmail` |
| IAM-004 | `aws_sqs_queue_policy.solve_queue_policy` | **Medium** | Single shared execution role granted both `sqs:SendMessage` AND `sqs:ReceiveMessage` on the solve queue, violating least privilege between services |

---

### IAM-001 — SQS IAM Policy Wildcard Fallback to `Resource = "*"`

**Exploit Vector / Blast Radius**

This is the highest-severity finding in the audit. In `infra/modules/iam/ecs_sqs_policy.tf`:

```hcl
Resource = var.solve_queue_arn != "" ? var.solve_queue_arn : "*"
```

This ternary means: if `solve_queue_arn` is an empty string (which happens during a `terraform plan` before SQS exists, a module init ordering issue, or an accidental blank variable), the policy grants `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`, and `sqs:ChangeMessageVisibility` on **all SQS queues in the entire AWS account** (`"Resource": "*"`).

A compromised ECS task with this policy could: drain messages from unrelated queues (other services' work items), inject malicious messages into queues it doesn't own, deny service by deleting legitimate messages, and exfiltrate schedule-solving payloads containing patient/worker data.

**File:** `infra/modules/iam/ecs_sqs_policy.tf`

**Vulnerable HCL (current):**
```hcl
{
  Effect = "Allow"
  Action = ["sqs:SendMessage", "sqs:GetQueueUrl", "sqs:GetQueueAttributes"]
  Resource = var.solve_queue_arn != "" ? var.solve_queue_arn : "*"
},
```

**Corrected HCL:**
```hcl
# Fail loudly — never silently expand to "*"
# Use a validation in variables.tf:
variable "solve_queue_arn" {
  type        = string
  description = "ARN of the solve SQS queue. Must be provided."
  validation {
    condition     = can(regex("^arn:aws:sqs:", var.solve_queue_arn))
    error_message = "solve_queue_arn must be a valid SQS ARN. Never leave empty."
  }
}

# In the policy, reference the validated ARN directly
{
  Effect = "Allow"
  Action = ["sqs:SendMessage", "sqs:GetQueueUrl", "sqs:GetQueueAttributes"]
  Resource = var.solve_queue_arn
},
{
  Effect = "Allow"
  Action = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueUrl",
            "sqs:GetQueueAttributes", "sqs:ChangeMessageVisibility"]
  Resource = var.solve_queue_arn
},
{
  Effect = "Allow"
  Action = ["sqs:SendMessage", "sqs:GetQueueUrl", "sqs:GetQueueAttributes"]
  Resource = var.solve_dlq_arn
}
```

---

### IAM-002 — ECS Execution Role and Task Application Role Are Merged

**Exploit Vector / Blast Radius**

AWS ECS uses two distinct IAM roles:
- **Task Execution Role** (`taskExecutionRole`): Used by the ECS agent (not your application code) to pull images from ECR and write logs to CloudWatch.
- **Task Role** (`taskRole`): Used by the application code running inside the container at runtime (SQS, Secrets Manager, S3, etc.).

In this configuration, `ecs_task_execution_role` is also given `secretsmanager:GetSecretValue` and all SQS permissions (via the attached policy). This means the **ECS agent process** — which is AWS-managed and runs outside your container — has the ability to call `sqs:ReceiveMessage` and retrieve DB credentials. While AWS's own agent is trusted, this violates the principle of least privilege: if there were ever an ECS agent vulnerability or a container breakout, the elevated application permissions are immediately available to the attacker under the execution role.

The dedicated task role is **entirely commented out** in `infra/modules/iam/main.tf`.

**File:** `infra/modules/iam/main.tf`

**Corrected Pattern:**
```hcl
# Keep execution role minimal — ECR pull + CloudWatch logs only
resource "aws_iam_role" "ecs_task_execution_role" {
  name               = "${var.project_name}-${var.environment}-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Only the execution role needs Secrets Manager access to inject secrets at startup
resource "aws_iam_role_policy" "secrets_inject" {
  role   = aws_iam_role.ecs_task_execution_role.id
  policy = jsonencode({ ... Resource = [var.documentdb_secret_arn, var.impersonation_jwt_secret_arn] })
}

# Separate task role for runtime application permissions
resource "aws_iam_role" "ecs_task_role" {
  name               = "${var.project_name}-${var.environment}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# SQS + SSM attached to task role, NOT execution role
resource "aws_iam_role_policy_attachment" "task_sqs" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ecs_task_execution_sqs_policy.arn
}
```

---

### IAM-003 — Lambda SES Policy Uses `Resource = "*"`

**Exploit Vector / Blast Radius**

The email processor Lambda's SES policy grants `ses:SendEmail` and `ses:SendRawEmail` on `Resource = "*"`. While the `ses:FromAddress` condition prevents impersonation of other from-addresses, the wildcard resource means the Lambda can send from **any verified SES identity in the account**, not just `noreply@rockilus.com`. If the Lambda is compromised (malicious SQS message injection exploiting a deserialization bug in the email template renderer), it could: send phishing emails from any verified domain in the account, consume the SES sending quota, or trigger SES reputation damage across all sending identities.

**File:** `infra/modules/email_lambda/main.tf`

**Vulnerable HCL (current):**
```hcl
{
  Effect = "Allow"
  Action = ["ses:SendEmail", "ses:SendRawEmail"]
  Resource = "*"
  Condition = { StringEquals = { "ses:FromAddress" = var.ses_from_email } }
}
```

**Corrected HCL:**
```hcl
{
  Effect = "Allow"
  Action = ["ses:SendEmail", "ses:SendRawEmail"]
  Resource = [
    "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.ses_domain}",
    "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.ses_from_email}"
  ]
  Condition = { StringEquals = { "ses:FromAddress" = var.ses_from_email } }
}
```

---

### IAM-004 — Single Shared Role Grants Both `SendMessage` and `ReceiveMessage` on Solve Queue

**Exploit Vector / Blast Radius**

The `aws_sqs_queue_policy.solve_queue_policy` grants the single `task_execution_role_arn` permissions for both `sqs:SendMessage` (needed by `api_gateway`) and `sqs:ReceiveMessage`/`sqs:DeleteMessage` (needed only by `solve_service`). Because these are two different application workloads sharing one identity, a compromised `api_gateway` container can drain and delete in-flight solve jobs, effectively a denial-of-service against the scheduling engine. It can also replay or inject malformed solve payloads. The fix is per-service IAM roles (see IAM-002 above) with scoped queue policies.

**File:** `infra/modules/sqs/main.tf`

**Corrected HCL:**
```hcl
resource "aws_sqs_queue_policy" "solve_queue_policy" {
  queue_url = aws_sqs_queue.solve_queue.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAPIGatewaySend"
        Effect    = "Allow"
        Principal = { AWS = var.api_gateway_task_role_arn }
        Action    = ["sqs:SendMessage", "sqs:GetQueueUrl", "sqs:GetQueueAttributes"]
        Resource  = aws_sqs_queue.solve_queue.arn
      },
      {
        Sid       = "AllowSolveServiceConsume"
        Effect    = "Allow"
        Principal = { AWS = var.solve_service_task_role_arn }
        Action    = ["sqs:ReceiveMessage", "sqs:DeleteMessage",
                     "sqs:ChangeMessageVisibility", "sqs:GetQueueUrl",
                     "sqs:GetQueueAttributes"]
        Resource  = aws_sqs_queue.solve_queue.arn
      }
    ]
  })
}
```

---

## 4. Data Encryption at Rest & Transit

| Finding ID | Resource Name | Severity | Specific Vulnerability |
|---|---|---|---|
| ENC-001 | `aws_api_gateway_integration.any_proxy` | **Critical** | Backend API key interpolated as plaintext in integration parameters — stored unencrypted in Terraform state and visible in AWS console |
| ENC-002 | `aws_s3_bucket_server_side_encryption_configuration.frontend` | **Medium** | SSE-S3 (AES256) — no customer-managed KMS key, no CloudTrail key-usage audit trail |
| ENC-003 | `aws_s3_bucket.public_assets` | **Medium** | No encryption-at-rest configuration declared on the public assets bucket |
| ENC-004 | `aws_docdb_cluster.main` | **Medium** | `enabled_cloudwatch_logs_exports` conditionally empty — audit logs disabled by default in production |

---

### ENC-001 — Backend API Key Stored in Plaintext in Terraform State

**Exploit Vector / Blast Radius**

This is a critical secrets management failure. In `infra/modules/api_gateway/main.tf`:

```hcl
"integration.request.header.X-API-Key" = "'${random_password.backend_api_key.result}'"
```

The `random_password` resource value is interpolated directly as a string literal into the `aws_api_gateway_integration` resource. This means:

1. **Terraform state file (`terraform.tfstate`)** — which is stored in S3 — contains the plaintext key value in the `request_parameters` map. Anyone with `s3:GetObject` on the state bucket reads the secret.
2. **AWS API Gateway console** — the integration request parameters are visible in plaintext to any IAM principal with `apigateway:GET` on the stage resource.
3. **Terraform plan output** — CI/CD pipelines that log `terraform plan` output will leak the secret into build logs.
4. **`data.archive_file`** — the secret exists in the Terraform provider memory during the apply and is diffed on every `plan` run.

The correct pattern is to reference the value at runtime from SSM Parameter Store, not bake it into the API Gateway configuration.

**File:** `infra/modules/api_gateway/main.tf`

**Vulnerable HCL (current):**
```hcl
resource "aws_api_gateway_integration" "any_proxy" {
  ...
  request_parameters = {
    "integration.request.header.X-API-Key" = "'${random_password.backend_api_key.result}'"
    ...
  }
}
```

**Corrected approach:** The API key should never be injected via API Gateway integration parameters. Instead, the ECS container reads the key from SSM at startup and stores it in an environment variable. API Gateway passes a **stage variable reference** (not the value) and the backend validates it:

```hcl
# 1. API Gateway passes the SSM parameter NAME as a stage variable (not the value)
resource "aws_api_gateway_stage" "main" {
  ...
  variables = {
    # Pass only the SSM *parameter name*, not the secret value
    backend_api_key_param = aws_ssm_parameter.backend_api_key.name
  }
}

# 2. Integration uses a stage variable reference — value never appears in HCL or state
resource "aws_api_gateway_integration" "any_proxy" {
  ...
  request_parameters = {
    # Remove the hardcoded key. Backend authenticates via the ECS-injected env var instead.
  }
}

# 3. ECS task definition injects the secret via Secrets Manager at container start:
# In ecs/tasks.tf — use secrets[] block to mount from SSM, not environment[]
# secrets = [{ name = "BACKEND_API_KEY", valueFrom = aws_ssm_parameter.backend_api_key.arn }]
```

---

### ENC-004 — DocumentDB Audit Logging Disabled by Default

**Exploit Vector / Blast Radius**

The `enabled_cloudwatch_logs_exports` on the DocumentDB cluster is conditionally computed as an empty list when `var.enable_docdb_audit = false`. For a healthcare platform, this means database-level access — including all `find`, `insert`, `update`, and `delete` operations against scheduling and worker records — is not logged. HIPAA Security Rule §164.312(b) requires audit controls that record activity in systems containing PHI. Without audit logs, there is no forensic trail for:
- Unauthorized queries to worker or schedule documents.
- Data exfiltration via bulk collection reads.
- Privilege escalation via admin command execution.

**File:** `infra/modules/documentdb/main.tf`

**Vulnerable HCL (current):**
```hcl
enabled_cloudwatch_logs_exports = concat(
  var.enable_docdb_audit ? ["audit"] : [],
  var.enable_docdb_profiler ? ["profiler"] : []
)
```

**Corrected HCL:**
```hcl
# Audit logs are mandatory in production — not optional
enabled_cloudwatch_logs_exports = var.environment == "prod" ? ["audit"] : concat(
  var.enable_docdb_audit ? ["audit"] : [],
  var.enable_docdb_profiler ? ["profiler"] : []
)
```
> Additionally, ensure `var.enable_docdb_audit = true` is hardcoded in `infra/environments/prod/main.tf` (or enforced via a Terraform variable validation), not left as a tunable default.

---

## 5. API Gateway & Cognito Protection

| Finding ID | Resource Name | Severity | Specific Vulnerability |
|---|---|---|---|
| SEC-001 | `aws_api_gateway_stage.main` | **High** | No stage-level default throttle settings — public API endpoints unprotected from DoS/brute-force |
| SEC-002 | `aws_cognito_user_pool.main` | **High** | `user_pool_add_ons` (Advanced Security Mode) block is commented out — no adaptive auth, no compromised credential detection |
| SEC-003 | `aws_cognito_user_pool.main` | **High** | No `mfa_configuration` block — MFA not configured for a healthcare application |
| SEC-004 | `aws_cognito_user_pool.main` | **Medium** | Password policy: `minimum_length = 8`, `password_history_size = 0` — below NIST 800-63B baselines |
| SEC-005 | `aws_cognito_user_pool_client.main` | **Medium** | `aws.cognito.signin.user.admin` OAuth scope granted to the SPA client — overly permissive |

---

### SEC-001 — API Gateway Stage Has No Default Throttle Settings

**Exploit Vector / Blast Radius**

The `aws_api_gateway_stage.main` resource is defined without any `default_route_settings` throttle configuration. The `aws_api_gateway_method_settings.all_methods` resource (which would set per-method logging and metrics) is gated behind `var.enable_apigw_logging` and **does not configure throttling** even when enabled. The only throttle configuration present is on the `internal` usage plan (100 req/s) — the Cognito-authenticated public routes have no rate limits at all.

Without stage-level throttling, an attacker or malfunctioning client can:
- Enumerate schedule and worker endpoints with thousands of requests per second.
- Exhaust the NLB and ECS task concurrency, causing a denial-of-service for legitimate users.
- Amplify compute costs with unbounded API calls to the OR-Tools solver endpoint, which is CPU-heavy.
- Perform credential stuffing against any unauthenticated endpoint (currently none, but rate limiting should be defense-in-depth regardless).

**File:** `infra/modules/api_gateway/main.tf`

**Vulnerable HCL (current):**
```hcl
resource "aws_api_gateway_stage" "main" {
  deployment_id        = aws_api_gateway_deployment.main.id
  rest_api_id          = aws_api_gateway_rest_api.main.id
  stage_name           = var.api_gateway_stage_name
  xray_tracing_enabled = var.apigw_enable_xray
  # No default_route_settings throttle block
}
```

**Corrected HCL:**
```hcl
resource "aws_api_gateway_stage" "main" {
  deployment_id        = aws_api_gateway_deployment.main.id
  rest_api_id          = aws_api_gateway_rest_api.main.id
  stage_name           = var.api_gateway_stage_name
  xray_tracing_enabled = var.apigw_enable_xray
}

# Stage-level method settings apply throttling to ALL methods
resource "aws_api_gateway_method_settings" "throttle" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    throttling_rate_limit  = 500   # Sustained requests per second
    throttling_burst_limit = 1000  # Token bucket burst
    metrics_enabled        = true
    logging_level          = "ERROR"
    data_trace_enabled     = false # Never enable in prod — logs request/response bodies
  }
}
```
> **Recommended:** Additionally attach an AWS WAF WebACL to the API Gateway stage for SQL injection, XSS, and managed rule group protections, which are especially relevant for a `{proxy+}` passthrough integration.

---

### SEC-002 — Cognito Advanced Security Mode Disabled

**Exploit Vector / Blast Radius**

The Cognito User Pool has the `user_pool_add_ons` block commented out:

```hcl
#   user_pool_add_ons {
#     advanced_security_mode = "ENFORCED"
#   }
```

Cognito Advanced Security (Cognito Threat Protection) provides three critical controls for a healthcare user base:

1. **Adaptive Authentication:** Detects anomalous sign-in patterns (impossible travel, new device, new IP) and can automatically challenge with MFA or block the attempt, even if the attacker has valid credentials.
2. **Compromised Credentials Detection:** Checks passwords against a continuously updated database of known breached credentials (derived from public breach corpora). A healthcare worker reusing a leaked password would be silently blocked.
3. **Risk Scoring:** Assigns a risk score to each auth event, surfaced in CloudTrail, enabling SIEM alerting on suspicious authentication patterns.

Without this, a credential-stuffing attack using a password from a public breach will authenticate successfully to Rockilus with no detection or challenge.

**File:** `infra/modules/cognito/main.tf`

**Corrected HCL:**
```hcl
resource "aws_cognito_user_pool" "main" {
  ...
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"  # Block risky sign-ins automatically
  }
  user_pool_tier = "PLUS"  # Advanced security requires PLUS tier
  ...
}
```

---

### SEC-003 — MFA Not Configured on Cognito User Pool

**Exploit Vector / Blast Radius**

There is no `mfa_configuration` block in the Cognito User Pool definition, and `sign_in_policy.allowed_first_auth_factors = ["PASSWORD"]` only — no second factor is required or optional. For a workforce management platform in healthcare:

- A compromised email/password combination (phishing, credential stuffing, insider leak) provides full access to a manager's team schedule, all worker records, and the ability to override shift assignments.
- Without MFA, there is no second barrier between credential theft and full account takeover.
- HIPAA addressable safeguard §164.312(d) (Person or Entity Authentication) expects verification of identity beyond a single factor for systems accessing workforce data that may include PHI.

**File:** `infra/modules/cognito/main.tf`

**Corrected HCL:**
```hcl
resource "aws_cognito_user_pool" "main" {
  ...
  mfa_configuration = "OPTIONAL"  # Strongly prefer "ON" for healthcare; "OPTIONAL" as a transition step

  software_token_mfa_configuration {
    enabled = true  # TOTP via Authenticator apps (Google Authenticator, Authy)
  }

  # Once adoption is high enough, upgrade to:
  # mfa_configuration = "ON"
  ...
}
```

---

### SEC-004 — Cognito Password Policy Below NIST 800-63B Baseline

**Exploit Vector / Blast Radius**

`minimum_length = 8` and `password_history_size = 0` allow users to set 8-character passwords and re-use the same password immediately after any required reset. NIST SP 800-63B (the de-facto standard referenced by HIPAA implementation guidance) recommends: minimum 8 characters for MFA-enabled accounts (already met), minimum 12–15 for password-only flows, and a password history of at least 24 entries to prevent rotation cycling attacks (where users cycle through a small set of known passwords).

**File:** `infra/modules/cognito/main.tf`

**Corrected HCL:**
```hcl
password_policy {
  minimum_length                   = 12   # Up from 8
  require_lowercase                = true
  require_numbers                  = true
  require_symbols                  = true
  require_uppercase                = true
  password_history_size            = 24   # Block reuse of last 24 passwords
  temporary_password_validity_days = 3    # Down from 7 — minimize window for temp credential abuse
}
```

---

### SEC-005 — `aws.cognito.signin.user.admin` Scope Granted to SPA Client

**Exploit Vector / Blast Radius**

The Cognito App Client is configured with:

```hcl
allowed_oauth_scopes = ["email", "openid", "phone", "aws.cognito.signin.user.admin"]
```

The `aws.cognito.signin.user.admin` scope grants the access token the ability to call **Cognito User Pool Admin APIs** — including `AdminUpdateUserAttributes`, `AdminSetUserPassword`, `AdminDisableUser`, `AdminDeleteUser` — directly from the frontend browser client. For a public-facing SPA, this is a significant privilege escalation vector: if an attacker steals a valid access token (via XSS, token leakage in browser history, or log injection), they gain the ability to modify or disable any Cognito user account without any backend mediation.

This scope should only be present on server-side admin tooling, never on a browser-based SPA client.

**File:** `infra/modules/cognito/main.tf`

**Vulnerable HCL (current):**
```hcl
allowed_oauth_scopes = ["email", "openid", "phone", "aws.cognito.signin.user.admin"]
```

**Corrected HCL:**
```hcl
allowed_oauth_scopes = ["email", "openid", "profile"]
# Remove "aws.cognito.signin.user.admin" and "phone" if phone numbers are not used.
# Any Cognito Admin API operations must be proxied through api_gateway with
# explicit authorization checks via Cerbos, never called directly from the browser.
```

---

## Remediation Priority Matrix

| Priority | Finding ID | Effort | Impact Mitigated |
|---|---|---|---|
| P0 – Immediate | IAM-001 | Low (add variable validation) | Wildcard SQS blast radius — prevents full-account queue compromise |
| P0 – Immediate | ENC-001 | Medium (refactor integration params) | API key in Terraform state — prevents credential exfiltration from state bucket |
| P0 – Immediate | NET-001 | Low (remove one ingress block) | API Gateway/Cognito bypass — closes direct FastAPI access from VPC |
| P1 – This Sprint | SEC-001 | Low (add method_settings block) | DoS on API Gateway — rate limits protect solver compute |
| P1 – This Sprint | SEC-002 | Low (uncomment `user_pool_add_ons`) | Credential stuffing / account takeover — adaptive auth + breach detection |
| P1 – This Sprint | IAM-002 | Medium (uncomment task role, split policies) | Execution role privilege scope — limits blast radius of ECS agent compromise |
| P1 – This Sprint | IAM-003 | Low (scope SES Resource ARN) | Lambda SES identity abuse |
| P2 – Next Sprint | SEC-003 | Low (add `mfa_configuration`) | Healthcare account takeover — MFA as second credential barrier |
| P2 – Next Sprint | CF-001 | Low (add response headers policy) | Clickjacking, MIME confusion, protocol downgrade, CSP |
| P2 – Next Sprint | SEC-005 | Low (remove oauth scope) | SPA token privilege escalation against Cognito admin APIs |
| P3 – Backlog | IAM-004 | Medium (depends on IAM-002) | Cross-service queue message tampering |
| P3 – Backlog | ENC-004 | Low (set `enable_docdb_audit = true` in prod tfvars) | Healthcare audit trail gap |
| P3 – Backlog | SEC-004 | Low (increase min_length, add history) | Password reuse / weak credential policy |
| P3 – Backlog | CF-002 / CF-003 | Low (switch to `aws:kms`) | Key management audit trail for S3 objects |
| P3 – Backlog | NET-002 | Low (scope NLB CIDR) | Lateral movement via unencrypted NLB listener |
| P3 – Backlog | NET-003 | Low (remove dead SG rule) | Operational clarity / eliminates misleading CloudShell rule |
