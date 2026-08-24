locals {
  demo_managed_redis_sku_name = var.env == "demo" ? "Balanced_B0" : var.managed_redis_sku_name
}
