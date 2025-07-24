
# GitHub Copilot Instructions for NSP Pro

## Project Overview

NSP Pro is a SaaS web application for healthcare scheduling. It allows healthcare organizations to:

- Create and manage teams
- Define shifts and staffing requirements
- Set scheduling constraints
- Generate schedules either manually or automatically using an optimization solver
- Visualize and adjust schedules in a calendar interface

As a healthcare application, reliability, security, and intuitive user experience are critical priorities.

## Architecture


### Frontend

- **Framework**: Next.js (app directory) with React and TypeScript
- **UI Libraries**: Material UI components with Tailwind CSS for styling
- **Authentication**: AWS Cognito
- **State Management**: React Context API
- **Static Deployment**: The frontend must be implemented to support static export and deployment to Amazon S3. All routing, asset handling, and build configuration should be compatible with static hosting environments (e.g., using `next export` and avoiding server-only features).
- **Key directories**:
  - `frontend/src/app` - Next.js pages and routes
  - `frontend/src/components` - Reusable React components
  - `frontend/src/types` - TypeScript type definitions
  - `frontend/src/app/lib` - API clients and utilities

### Backend

Microservice architecture with three main components:

1. **API Gateway** (`backend/api_gateway`)
   - FastAPI server
   - AWS Cognito for authentication (authentication is handled by AWS API Gateway)
   - Permit.io for authorization
   - Celery for task queue management
   - MongoDB for data storage

2. **Solver Service** (`backend/solve_service`)
   - Listens to Celery queue for scheduling tasks
   - Uses Google OR-Tools for constraint-based optimization
   - Processes schedules according to rules and constraints

3. **Shared Library** (`backend/shared`)
   - Common code shared between services
   - Database schemas and models
   - Logging utilities (using Loguru)
   - MongoDB connection management (using PyMongo)

4. **Redis** for task queue and messaging between services

## Key Concepts

### Teams and Workers

- Teams are the top-level organizational unit
- Workers belong to teams and have specific roles/specialties
- Team members have different access levels (owner, member)

### Schedules and Campaigns

- A schedule represents a specific time period (e.g., a month)
- Schedules can be in different states (CAMPAIGN, VALIDATED)
- Campaigns are schedules being actively worked on

### Shifts and Assignments

- Shifts define work periods (e.g., morning shift, night shift)
- Assignments connect workers to shifts on specific dates
- Shifts can have staffing requirements and specialties

### Solver

- The solver uses constraint programming to generate optimal schedules
- Constraints can be "hard" (must be satisfied) or "soft" (preferences)
- The solver status can be tracked (PENDING, STARTED, SUCCESS, etc.)

## Coding Standards

### TypeScript/React

- Use functional components with hooks
- Type all props and state
- Use TypeScript interfaces for complex objects
- Follow Material UI patterns for component styling
- Use Tailwind for custom styling needs

### Python

- Follow PEP 8 style guidelines
- Use type hints
- Use async/await for asynchronous operations
- Document functions and modules with docstrings

## Common Patterns

### Frontend

- Page components in `/frontend/src/app/[lng]/plan/...`
- Shared components in `frontend/src/components`
- API clients in `frontend/src/app/lib`
- Type definitions in `frontend/src/types`

### Backend

- API routes in `backend/api_gateway/src/routes`
- Services in `backend/api_gateway/src/services`
- Database models in `/backend/shared/schemas/`

## Key Features

### Schedule Management

- Creating and updating schedules
- Managing assignments
- Handling recurrences for repeated assignments

### Solver Integration

- Solving schedules with constraints
- Tracking solver progress
- Handling breaches and optimization results

### Demand and Staffing

- Setting staffing requirements
- Quick staffing adjustments
- Handling staffing demands by day and shift

## Testing and Reliability

- Unit tests for critical functionality
- Error handling and logging for reliability
- Authorization checks for security

## Internationalization


The application supports multiple languages through the `[lng]` parameter in routes.

---

## Cyber Security and Production Best Practices

Cyber security is a top priority for NSP Pro. All code must be written in accordance with industry best practices for production applications, including but not limited to:
- Secure authentication and authorization (AWS Cognito, Permit.io)
- Proper validation and sanitization of all user input
- Protection against common web vulnerabilities (XSS, CSRF, SQL/NoSQL injection, etc.)
- Secure storage and handling of sensitive data
- Least-privilege access for all services and users
- Regular review and updating of dependencies
- Comprehensive error handling and logging without leaking sensitive information

Always follow security guidelines and review code for potential vulnerabilities before merging.

---

When contributing to this project, prioritize:
1. Type safety
2. Error handling
3. Security (authentication, authorization, and cyber security best practices)
4. Production-readiness and adherence to best practices
5. Performance (especially for schedule operations)
6. User experience
