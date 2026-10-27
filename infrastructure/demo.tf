locals {
  demo_managed_redis_sku_name = var.env == "demo" ? "Balanced_B3" : var.managed_redis_sku_name
}
