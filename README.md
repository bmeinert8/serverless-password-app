# Serverless Secret Management Platform

![Azure](https://img.shields.io/badge/azure-%230072C6.svg?style=for-the-badge&logo=microsoftazure&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Bicep](https://img.shields.io/badge/Bicep-0078D4?style=for-the-badge&logo=azure-pipelines&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)

A full-stack, enterprise-grade password manager built entirely on **Azure Serverless Architecture**. 

This project demonstrates a strict **Zero-Trust** security model, utilizing decoupled infrastructure, Managed Identities, and Azure Key Vault to ensure that the frontend and codebase never handle sensitive configuration secrets.

## 🏗️ Enterprise Architecture (Bring Your Own Functions)

This application utilizes a decoupled, Bring Your Own Functions (BYOF) architecture to bypass the security limitations of standard managed environments.

* **Frontend:** Vanilla JavaScript hosted on **Azure Static Web Apps** (Global CDN).
* **Backend:** Standalone **Azure Function App** (Node.js) handling REST API requests. The SWA is securely linked to this dedicated backend.
* **Database:** **Azure Table Storage** (NoSQL) for high-performance, cost-effective persistence.
* **Security:** **Azure Key Vault** stores the Master Password hash and AES-256 encryption keys.
* **Infrastructure:** Entire stack defined and provisioned via **Azure Bicep** (IaC).

## 🔐 Security Design & Implementation

### 1. Zero-Trust Key Vault Integration
Instead of storing secrets in easily compromised environment variables, this backend utilizes Key Vault References (`@Microsoft.KeyVault(...)`). The Function App securely resolves these references in memory at runtime, meaning the raw secrets never exist in the codebase or static portal configurations.

### 2. Passwordless Authentication via Managed Identities
The backend Azure Function App connects to the Key Vault using a **System-Assigned Managed Identity** provisioned via Bicep. This eliminates the need to manage Service Principal credentials or API keys, neutralizing the risk of credential theft.

### 3. End-to-End Cryptography
* **Authentication:** Master Passwords are computationally hashed using `bcrypt` (salted, with a high work factor) rather than fast, vulnerable algorithms like SHA-256.
* **Data at Rest:** All saved passwords sent to Azure Table Storage are dynamically encrypted and decrypted in the cloud using **AES-256-GCM**, ensuring database administrators cannot read user secrets in plain text.

## ⚙️ Technical Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JS | Responsive UI & State Management |
| **Compute** | Azure Functions (Node.js 20+) | Serverless API Endpoints |
| **Storage** | Azure Table Storage | NoSQL Data Persistence |
| **Security** | Azure Key Vault | HSM-backed Secret Storage |
| **DevOps** | Azure Bicep | Infrastructure Provisioning |
| **CI/CD** | GitHub Actions | Split Pipeline (SWA + Functions Deploy) |

## 🚀 CI/CD Pipeline

The project utilizes a split deployment strategy via GitHub Actions:
1. Pushes to `main` trigger the workflow.
2. The UI is built and deployed globally to Azure Static Web Apps.
3. The Node.js `/api` directory is packaged and deployed directly to the Standalone Azure Function App using a publish profile.
Built as a portfolio  deomonstration of Cloud Engineering & Serverless Architecture.
