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

variable "schedule_image_key" {
  type    = string
  default = "schedule-week-member.desktop.v1.png"
}

variable "acl" {
  type    = string
  default = "public-read"
}
