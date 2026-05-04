#
# HKU consumer (academic) — added for the HK federated MVD assignment.
# Resource layout mirrors consumer.tf so behaviour is identical;
# only DIDs, DB names, and vault names differ.
#

module "hku-connector" {
  source            = "./modules/connector"
  humanReadableName = "hku"
  participantId     = var.hku-did
  database = {
    user     = "hku"
    password = "hku"
    url      = "jdbc:postgresql://${module.hku-postgres.database-url}/hku"
  }
  vault-url     = "http://hku-vault:8200"
  namespace     = kubernetes_namespace.ns.metadata.0.name
  sts-token-url = "${module.hku-identityhub.sts-token-url}/token"
  useSVE        = var.useSVE
}

module "hku-identityhub" {
  depends_on        = [module.hku-vault]
  source            = "./modules/identity-hub"
  credentials-dir   = dirname("./assets/credentials/k8s/hku/")
  humanReadableName = "hku-identityhub"
  participantId     = var.hku-did
  vault-url         = "http://hku-vault:8200"
  service-name      = "hku"
  database = {
    user     = "hku"
    password = "hku"
    url      = "jdbc:postgresql://${module.hku-postgres.database-url}/hku"
  }
  namespace = kubernetes_namespace.ns.metadata.0.name
  useSVE    = var.useSVE
}

module "hku-vault" {
  source            = "./modules/vault"
  humanReadableName = "hku-vault"
  namespace         = kubernetes_namespace.ns.metadata.0.name
}

module "hku-postgres" {
  depends_on       = [kubernetes_config_map.postgres-initdb-config-hku]
  source           = "./modules/postgres"
  instance-name    = "hku"
  init-sql-configs = ["hku-initdb-config"]
  namespace        = kubernetes_namespace.ns.metadata.0.name
}

resource "kubernetes_config_map" "postgres-initdb-config-hku" {
  metadata {
    name      = "hku-initdb-config"
    namespace = kubernetes_namespace.ns.metadata.0.name
  }
  data = {
    "hku-initdb-config.sql" = <<-EOT
        CREATE USER hku WITH ENCRYPTED PASSWORD 'hku' SUPERUSER;
        CREATE DATABASE hku;
        \c hku hku


      EOT
  }
}
