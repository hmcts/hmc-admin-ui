data "azurerm_client_config" "current" {}

locals {
  demo_resource_group_import = var.env == "demo" ? toset(["demo"]) : toset([])
}

import {
  for_each = local.demo_resource_group_import

  to = azurerm_resource_group.rg
  id = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/hmc-admin-ui-demo"
}

import {
  for_each = local.demo_resource_group_import

  to = module.managed_redis.azurerm_resource_group.rg
  id = "/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/hmc-admin-ui-demo-rg"
}
