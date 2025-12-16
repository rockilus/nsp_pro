variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "logo_key" {
  type    = string
  default = "rockilus_logo_blue.jpg"
}

variable "acl" {
  type    = string
  default = "public-read"
}
