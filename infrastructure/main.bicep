// PARAMETERS

@description('The location for all resources.')
param location string = resourceGroup().location

@description('The name of the storage account.')
param storageName string = 'serverlesspwvstorage'

@description('The name of the Key Vault.')
param keyVaultName string = 'serverless-pwv-kv'

@description('The name of the Static Web App.')
param appName string = 'password-vault-swa'

@description('The name of the Standalone Function App.')
param functionAppName string = 'serverless-pwv-func'

@description('The name of the App Service Plan.')
param hostingPlanName string = 'serverless-pwv-plan'

// RESOURCES

// 1. Storage Account Resource
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

// 2. Key Vault Resource
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

// 3. App Service Plan for Function App (Serverless Consumption)
resource hostingPlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {}
}

// 4. Dedicated Function App (Bring Your Own Functions)
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned' // Generates the Identity for Key Vault access
  }
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      appSettings: [
        // Standard Azure Functions Runtime Settings
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20' // Forces Node.js 20+ runtime
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        // Custom Security & Storage Settings (Auto-Wired!)
        {
          name: 'VaultStorageConnection'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'MasterVaultSecret'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/MasterVaultSecret/)'
        }
        {
          name: 'DATA_ENCRYPTION_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/DataEncryptionKey/)'
        }
      ]
    }
  }
}

// 5. Static Web App Resource
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: appName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    provider: 'GitHub'
    repositoryUrl: 'https://github.com/bmeinert8/serverless-password-app'
    branch: 'main'
    buildProperties: {
      skipGithubActionWorkflowGeneration: true 
    }
  }
}

// 6. Link the Function App backend to the Static Web App
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2022-03-01' = {
  parent: staticWebApp
  name: 'backend1'
  properties: {
    backendResourceId: functionApp.id
    region: location
  }
}

// 7. Role Assignment: Grant Function App permission to read Key Vault Secrets
var secretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, secretsUserRoleId, functionApp.id) // Switched to functionApp.id
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', secretsUserRoleId)
    principalId: functionApp.identity.principalId // Gives the badge to the Function App
    principalType: 'ServicePrincipal'
  }
}
