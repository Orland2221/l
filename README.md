# 🏆 TBowl - AI Financial Assistant

A secure, password-protected web application for stock analysis and financial advice powered by OpenAI GPT.

## 🌟 Features

- 🔒 **Password Protected** - Secure login with SHA-256 hashed passwords
- 🔐 **Encrypted API Key** - OpenAI API key is XOR encrypted, never exposed
- 📊 **Real-time Stock Data** - Live data from Yahoo Finance
- 🤖 **AI-Powered Analysis** - Financial insights using OpenAI GPT-3.5
- 📈 **Portfolio Tracking** - Analyze multiple stocks simultaneously
- 💡 **Financial Advice** - Get general investment guidance
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Fast & Secure** - Rate limiting, CORS protection, security headers

## 🔐 Security Features

1. **Password Authentication**: SHA-256 hashed passwords
2. **API Key Encryption**: XOR encryption with unique salt
3. **No Plaintext Secrets**: API keys never stored in plaintext
4. **Rate Limiting**: Built-in request throttling (100 req/15min)
5. **Security Headers**: Helmet.js for HTTP security
6. **CORS Protection**: Configurable cross-origin policies
7. **Input Validation**: Sanitized user inputs

## 📋 Prerequisites

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (v6 or higher) - Comes with Node.js
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

## 🚀 Quick Start

### Installation

1. **Create project directory:**
```bash
mkdir tbowl
cd tbowl