<div align="center">
  <img src="docs/rockilus_logo_blue.jpg" alt="Rockilus" width="400" />
</div>

<br>

<p align="center">
  <a href="https://rockilus.com">
    <img src="https://img.shields.io/badge/Website-rockilus.com-blue?style=flat-square" alt="Website">
  </a>
</p>

<br>


Rockilus is a multi-tenant SaaS that lets healthcare managers define team members, shifts, and constraints, then auto-generate optimal schedules using Google OR-Tools.

<br>

## ⚡️ Highlights
* **Decoupled Heavy Compute Architecture:** Offloads resource-intensive constraint satisfaction algorithms from the user-facing API gateway to a stateless compute service via AWS SQS, maintaining a `<50ms` API ingestion latency.
* **Strict Cross-Service Typing (Contract-First):** Enforces a zero-drift network payload contract between Python/FastAPI microservices and Next.js clients using a unified Pydantic DTO shared library.
* **Enterprise Role-Based Access Control (RBAC):** Decoupled authentication identity (AWS Cognito) from fine-grained authorization policies by implementing an isolated Cerbos PDP container sidecar model.
* **Zero-Server Frontend Scale:** Configured Next.js App Router for strict static export serialization (`output: 'export'`), achieving infinite client-side scaling and negligible infrastructure overhead via AWS S3 and CloudFront CDNs.
* **Deterministic Timezone Engineering:** Abstracted volatile Javascript/Python localization bounds by normalizing all schedule metrics into minutes-based integers before solver matrix evaluation.

## 🧑‍💻 Core Engineering Challenges & Deep Dives
### 🧮 Algorithmic Constraint Optimization (Google OR-Tools CP-SAT)
Medical scheduling contains volatile, multi-variable constraints governed by labor laws, staff availability, and operational fairness. 
* **The Formulation:** Modeled shift distributions as a constraint programming problem using Google OR-Tools CP-SAT. The engine ingests scheduling horizons as discrete date matrices `List[List[date]]` and returns deterministic evaluation arrays matching the `(worker_id, date_iso, shift_id)` payload structure.
* **Dynamic DSL Constraint Parsing:** Engineered an abstraction layer that maps complex, string-based user constraints (e.g., *"Logan and Shiv should not exceed two consultation shifts weekly"*) into mathematical integer matrices bound by boolean constraints inside the CP model solver.

### 🛡️ Low-Latency Edge Authorization (Cerbos PDP Sidecar)
[cite_start]To securely isolate multi-tenant data structures without adding database query degradation, authorization logic is decoupled from the web application layer [cite: 130-131].
* [cite_start]**The Pattern:** Integrated an asynchronous Cerbos Policy Decision Point (PDP) running as an ECS task sidecar container[cite: 119, 133].
* [cite_start]**Enforcement:** Every inbound service mutation passes through a centralized `CerbosAuthzService.check(user_id, action, resource_kind, resource_id)` dependency injection interceptor, executing contextual policy schema lookups via gRPC on port 3592 in under `<2ms` [cite: 134-136].

### 🌐 Strict Localized Frontend Engineering (Trilingual Zero-Server Hydration)
[cite_start]The frontend UI natively scales across English, French, and Spanish without relying on server runtime checks[cite: 12].
* [cite_start]**The Constraint:** Under `output: 'export'` conditions, Next.js cannot run server middleware or dynamic edge routing[cite: 38].
* [cite_start]**The Solution:** Implemented client-side i18n hydration using `i18next` localized json dictionary maps[cite: 33, 44, 177]. [cite_start]Visual styling leverages responsive Tailwind CSS utilities and shadcn/ui primitives using core CSS tokens configured for automatic light/dark `.dark` theme toggles [cite: 8, 33, 45-47].



- Algorithmic Constraint Solving — Formulating shift assignments as a CP-SAT problem with worker availability, skill requirements, fairness constraints, and French labor law compliance. The solver processes periods as List[List[date]] and outputs (worker_id, date_iso, shift_id) tuples.
- Calibrate model
- Convert string based constraint into Google OR-Tools CP Model constraints for complex and flexible requirements
- Multi-Tenant RBAC Authorization — AWS Cognito handles authentication; Cerbos enforces authorization with derived roles (self_owner) and resource policies (admin, team, user). Every API call passes through CerbosAuthzService.check(user_id, action, resource_kind, resource_id).
- Trilingual i18n — Every UI string flows through i18next with locales in English, French, and Spanish. No hardcoded text. Date/time handling is timezone-explicit throughout the scheduling engine.
- Static Export Architecture — Both Next.js apps use output: 'export' (no SSR, no API routes). All data fetching is client-side or build-time. Hosted on S3 + CloudFront for zero-server frontend scaling.
- Async Message-Driven Pipeline — The API Gateway enqueues schedule generation tasks to SQS. The solve service consumes them asynchronously, runs OR-Tools, and writes results to DocumentDB. Dead-letter queues handle failures.
- Production-Grade Security — OWASP Top 10 awareness, input validation at all boundaries, no secrets in code, least-privilege IAM roles via Terraform, OWASP ZAP scans in CI.

## 📐 System Architecture & Data Flows
<p align="center">
  <img src="docs/aws_architecture.svg" alt="Rockilus System Architecture" width="100%" />
</p>

* **Infrastructure-as-Code (IaC):** 100% of the network infrastructure, AWS DocumentDB databases, SQS queues, IAM boundary permissions, and ECS Task Definitions are provisioned deterministically via declarative Terraform scripts.
* **Asynchronous Lifecycles:** $$\text{Client Request} \longrightarrow \text{API Gateway (FastAPI Fast ACK)} \longrightarrow \text{AWS SQS Ingestion} \longrightarrow \text{Solver Compute Service (OR-Tools)} \longrightarrow \text{DocumentDB Persistence}$$


## 🛠️ Tech Stack & Production Constraints
| Layer	| Technology |
| :---  | :--- |
| Frontend |	Next.js 16 (App Router), React 19, TypeScript, shadcn/ui + Tailwind CSS, TanStack Query, Zustand, i18next (en/fr/es) |
| API Gateway |	Python, FastAPI, pymongo, SQS producer
| Solver Engine |	Python, Google OR-Tools (CP-SAT), SQS consumer|
| Authentication / Authorization |	AWS Cognito (AuthN), Cerbos PDP — gRPC sidecar, resource-level RBAC |
| Database | AWS DocumentDB |
| Infrastructure |	Terraform |
|CI/CD |	GitHub Actions (6 pipelines: lint, test, build, E2E, security scan) |
| Testing |	Playwright (E2E), Vitest + Testing Library (frontend), pytest (backend), OWASP ZAP (security) |


| Layer | Technology | Operational Constraint / Implementation Pattern |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16, React 19, TS, Tailwind CSS, shadcn/ui | **Strict Static Export:** Zero Server Actions or Server Components; client-side asynchronous data fetching. |
| **API Gateway** | Python, FastAPI, Pydantic Core, `uv` | Asynchronous asynchronous task ingestion; handles payload marshalling against canonical schema contracts. |
| **Solver Engine** | Python, Google OR-Tools CP-SAT | Decoupled background SQS consumer optimizing multidimensional constraint matrices. |
| **Identity & AuthZ** | AWS Cognito, Cerbos PDP (gRPC) | Decentralized authorization mapping roles derived from localized Pydantic data schemas. |
| **Data Layer** | AWS DocumentDB (MongoDB compatible) | Document storage tracking historical assignment evaluations, team telemetry, and availability maps. |
| **Infrastructure** | Terraform, Docker Compose, `just` | Environment parity guarantees between local container stacks and private AWS VPC subnets. |

## 🚦 Local Development & Automated Quality Gates

The project utilizes automated task runner configurations (`justfiles`) to eliminate local dependency issues and validate type interfaces before code review gates.

### Deterministic Multi-Container Dev Spin-Up
To initiate a full-fidelity replica of the production system including message brokers and policy sidecars locally:
```bash
docker-compose -f docker-compose.yml up --build
```

### Targeted Quality Verification

Individual services enforce mandatory testing, static analysis linting, and type checking pipelines before passing environmental quality gates:

```bash
# Verify shared schema contracts across boundary systems
cd backend/shared && just all

# Validate FastAPI API Gateway routes via pytest
cd backend/api_gateway && just all

# Execute unit and constraint verification on the optimization service 
cd backend/solve_service && just all
```

## 🚀 Product Capabilities
- Self setup: create your account, configure your team and generate your first schedule in minutes
- Handle team members preferences: ask for team members work and leave request before you build your next schedule
- Create complex constraints: "Logan and Shiv should not work more than two consultation shifts per week", "If on duty on saturday, then off following monday if possible"
- Legal constraints built: post duty recuperation time automatically
- One click schedule generation: generate team's schedule in seconds, and review the output with clear constraint breach display and instant work time stats access
- Share and manage: mobile version to share schedule with the team, swap and replacement feature to manage changes on the go
- Rockilus is available in French, English and Spanish

## ☝️ Improvements
- Security: fix vulnerabilities already identified in the code, review aws services configuration.
- Solver cost efficiency: currently, the solver is running 24/7 in an ECS service, and can run solve request one by one. Study the option to migrate to event based service (e.g. lambda) that would bun spun up on demand, reducing costs and allowing to run several solve requests in parallel.
- Interface with healthcare IT: allow import of user to facilitate onboarding (LDAP for example), and export of planning to HR platforms (excel export already in place, unified API aggregator)
- Multi-team management: currently our data system handles only one level of aggregation at the team level (service or department in healthcare). Implement 