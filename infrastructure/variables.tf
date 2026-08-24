variable "product" {}

variable "component" {}

variable "location" {
  default = "UK South"
}

variable "env" {}

variable "shared_product_name" {
  default = "hmc"
}

variable "subscription" {}

variable "common_tags" {
  type = map(string)
}

variable "enable_ase" {
  default = false
}

variable "application_type" {
  default     = "web"
  description = "Type of Application Insights (Web/Other)"
}

variable "sampling_percentage" {
  default     = 1
  description = "Specifies the sampling percentage for Application Insights"
}

variable "managed_redis_sku_name" {
  default     = "Balanced_B1"
  description = "The SKU to use for Azure Managed Redis. Balanced_B1 matches the legacy Basic C1 cache used by environments without a tfvars override."
  type        = string
}

variable "private_dns_subscription_id" {
  default     = "1baf5470-1c3e-40d3-a6f7-74bfbce4b348"
  description = "Subscription ID containing the shared Azure Managed Redis private DNS zone."
  type        = string
}
