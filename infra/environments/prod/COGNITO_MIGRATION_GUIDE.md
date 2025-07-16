# Cognito Module Migration Guide - Production Environment

## Overview
This guide will help you migrate from manually managed Cognito resources to the new Terraform-managed Cognito module in the production environment.

## ⚠️ Important Pre-Migration Steps

### 1. Verify Backend API Key in SSM
The Lambda function will automatically use the existing backend API key from SSM Parameter Store at:
`/rockilus/prod/backend-api-key`

You can verify it exists with:
```bash
aws ssm get-parameter --name "/rockilus/prod/backend-api-key" --with-decryption --query 'Parameter.Value' --output text
```

**No manual configuration needed** - the Lambda will automatically retrieve and use this key.

### 2. Backup Current Cognito Configuration
Document your current Cognito settings before proceeding:
- User Pool ID: `eu-west-3_9tyN1YsF6`
- Client ID: `real_client_id`
- Any custom configurations

## 🚀 Deployment Steps

### Step 1: Initialize and Plan
```bash
cd /Users/felipekharaba/Code/nsp_pro/infra/environments/prod
terraform init
terraform plan
```

### Step 2: Apply Changes
```bash
terraform apply
```

This will:
- Create a new Cognito User Pool with the specified configuration
- Create a new App Client
- Deploy the post-confirmation Lambda function
- Update the API Gateway to use the new Cognito resources

### Step 3: Update Frontend Configuration
After deployment, you'll need to update your frontend application with the new Cognito configuration:

```typescript
// Update your Cognito configuration with the new values from terraform output
const cognitoConfig = {
  userPoolId: 'new-user-pool-id',      // Get from: terraform output cognito_user_pool_id
  userPoolWebClientId: 'new-client-id', // Get from: terraform output cognito_user_pool_client_id
  region: 'eu-west-3'
};
```

## 🔄 Migration Considerations

### User Migration
Since this creates a new User Pool, existing users will need to:
1. **Option A**: Re-register with the new system
2. **Option B**: Use AWS Cognito User Pool migration triggers (advanced)

### DNS and Endpoints
- The API Gateway will automatically use the new Cognito authorizer
- No changes needed to your API endpoints

### Testing
After deployment:
1. Test user registration flow
2. Verify post-confirmation Lambda is working (check CloudWatch logs)
3. Test user login/authentication
4. Verify API authorization is working

## 📋 Post-Migration Checklist

- [ ] Terraform apply completed successfully
- [ ] New Cognito User Pool created
- [ ] Lambda function deployed and has correct permissions
- [ ] API Gateway updated with new Cognito configuration
- [ ] Frontend updated with new Cognito client configuration
- [ ] User registration flow tested
- [ ] User login flow tested
- [ ] Post-confirmation Lambda tested (check CloudWatch logs)
- [ ] API authorization tested

## 🔧 Terraform Outputs

After deployment, get the new configuration:
```bash
terraform output cognito_user_pool_id
terraform output cognito_user_pool_client_id
terraform output cognito_user_pool_endpoint
```

## 🚨 Rollback Plan

If issues occur, you can rollback by:
1. Commenting out the Cognito module in `main.tf`
2. Uncommenting the old variables in `variables.tf` and `terraform.tfvars`
3. Running `terraform apply`

## 📞 Support

- Check CloudWatch logs for Lambda function issues
- Verify IAM permissions if API calls fail
- Ensure the backend API key is correctly configured

## Security Notes

- The new User Pool has advanced security mode enabled
- Strong password policies are enforced
- User existence errors are prevented
- All resources are properly tagged for compliance
