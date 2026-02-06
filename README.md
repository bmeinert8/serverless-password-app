update push
# Serverless Secret Management Platform

![Azure](https://img.shields.io/badge/azure-%230072C6.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Bicep](https://img.shields.io/badge/Bicep-0078D4?style=for-the-badge&logo=azure-pipelines&logoColor=white)

A full-stack, secure password manager built on **Azure Serverless Architecture**. 
This project demonstrates a **Zero-Trust** security model, utilizing Managed Identities and Key Vault to ensure the frontend never handles sensitive configuration secrets.

## Architecture

The application is architected to decouple the user interface from the security logic.

* **Frontend:** Vanilla JavaScript hosted on **Azure Static Web Apps** (Global CDN).
* **Backend:** **Azure Functions** (Node.js) handling API requests.
* **Database:** **Azure Table Storage** (NoSQL) for high-performance persistence.
* **Security:** * **Azure Key Vault** stores the Master PIN hash.
    * **Managed Identities** provide passwordless access between the App and the Vault.
* **Infrastructure:** Entire stack defined in **Azure Bicep** (IaC).

## Key Features

* **Zero-Trust Authentication:** The frontend authenticates via a backend "Guard" function; no secrets are stored in the browser client.
* **CRUD Operations:** Create, Read, Update, and Delete passwords securely.
* **Entropy Analysis:** Real-time password strength calculation algorithm.
* **Infrastructure as Code:** One-click deployment of the entire resource group using Bicep.
* **Secure Persistence:** Passwords are stored in the cloud, not `localStorage`.

## Technical Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JS | Responsive UI & State Management |
| **Compute** | Azure Functions (Node.js 18) | Serverless API Endpoints |
| **Storage** | Azure Table Storage | NoSQL Data Persistence |
| **Security** | Azure Key Vault | HSM-backed Secret Storage |
| **DevOps** | Azure Bicep | Infrastructure Provisioning |
| **CI/CD** | GitHub Actions | Automated Build & Deploy |

## Setup & Installation

### Prerequisites
* Azure Subscription
* Azure CLI installed
* Node.js 18+

### 1. Infrastructure Deployment (Bicep)
Deploy the entire cloud environment using the included Bicep definition.

bash
* Login to Azure
az login

* Create a Resource Group
az group create --name PasswordVault-RG --location eastus2

* Deploy Resources
az deployment group create --resource-group PasswordVault-RG --template-file infrastructure/main.bicep

### 2. Local Development

* Clone the Repository

* Install dependencies for the API:
bash
cd api
npm install

* Start the Azure Functions runtime locally
bash
func start

## Security Design

### Why Key Vault
Instead of storing the Master PIN hash in the enviornemnt variables (which can be leaked), this project uses Key Vault References. The App Services reads @Microsft.KeyVault(...) at runtime, ensuring the secret never exists in the codebase or config files.

### Why Managed Identity
The Static Web App connects to the Key Vault using a System-Assigned Managed Identity. This eliminates the need to manage API keys or Service Principal credentials, removing the risk of credential theft.

Built as a portfolio  deomonstration of Cloud Engineering & Serverless Architecture.
