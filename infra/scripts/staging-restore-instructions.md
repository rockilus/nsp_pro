# Staging restore instructions

The following operations are recommended to restore the staging environment after teardown:

- Re-create resources by running Terraform apply in `infra/environments/staging`.
- Push container images to ECR repositories (main and solve services).
- Verify ECS service desired counts and scaling.

