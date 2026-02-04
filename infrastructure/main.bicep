// PARAMETERS

@description('The location for all resources.')
param location string = resourceGroup().location

@description('The name of the storage account (must be globally unique).')
param storageName string = 'pwvault${uniqueString(resourceGroup().id)}'

@description('The name of the Key Vault (must be globally unique).')
param keyVaultName string = 'pwvault-kv-${uniqueString(resourceGroup().id)}'

@description('The name of the Static Web App.')
param appName string = 'pwvault-app-${uniqueString(resourceGroup().id)}'

// RESOURCES

// Storage Account Resource
resource storage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
  }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2022-09-01' = {
  parent: storage
  name: 'default'
}

resource passwordTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2022-09-01' = {
  parent: tableService
  name: 'pwstoragetable'
}

// Key Vault Resource
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

// Static Web App Resource
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: appName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    provider: 'GitHub'
    repositoryUrl: 'https://github.com/bmeinert8/serverless-password-app'
    branch: 'main'
    buildProperties: {
      skipGithubActionWorkflowGeneration: true //already have a workflow file
    }
  }
}


// Role Assignment
// key vault secret user role definition id
var secretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, secretsUserRoleId, staticWebApp.id)
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUserRoleId)
    principalId: staticWebApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}
