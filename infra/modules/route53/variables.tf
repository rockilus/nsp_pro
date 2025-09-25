variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name for the hosted zone"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$", var.domain_name))
    error_message = "Domain name must be a valid DNS domain."
  }
}

variable "frontend_domain_name" {
  description = "Frontend domain name for the application (e.g., app.example.com)"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$", var.frontend_domain_name))
    error_message = "Frontend domain name must be a valid DNS domain."
  }
}

variable "enable_dnssec" {
  description = "Enable DNSSEC for enhanced security"
  type        = bool
  default     = true
}

variable "enable_query_logging" {
  description = "Enable Route 53 query logging for security monitoring"
  type        = bool
  default     = true
}

variable "health_check_regions" {
  description = "AWS regions for health checks"
  type        = list(string)
  default     = ["us-east-1", "us-west-2", "eu-west-1"]
}

variable "certificate_subject_alternative_names" {
  description = "Subject Alternative Names for SSL certificate"
  type        = list(string)
  default     = []
}

variable "enable_certificate_transparency_logging" {
  description = "Enable certificate transparency logging for security compliance"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "staging_subdomain" {
  description = "Subdomain for staging environment (e.g., staging.example.com)"
  type        = string
  default     = null
}

variable "staging_name_servers" {
  description = "Name servers for the staging subdomain delegation"
  type        = list(string)
  default     = []
}
