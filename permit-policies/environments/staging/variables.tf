variable "permit_api_key" {
  description = "The API key for the Permit.io API"
  type        = string
  sensitive   = true
}

variable "permit_project_id" {
  description = "Permit.io Project ID"
  type        = string
  default     = "88e82be51078462ebd07f774deb4c0b8"
}

variable "permit_environment_id" {
  description = "Permit.io Environment ID for staging"
  type        = string
}
