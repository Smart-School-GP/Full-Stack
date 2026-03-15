# School Ecosystem Management Platform

This guide provides instructions on how to set up and run the project locally.

## Prerequisites

- **Node.js**: 18.x or higher
- **Python**: 3.9+ (for the AI service)
- **Git**

## Setup and Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd school-platform
```

### 2. Install Dependencies

#### Main Platform
```bash
npm install
```

#### AI Service
It is recommended to use a virtual environment:
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 3. Database Setup
The project uses SQLite by default. Run the following command to generate the Prisma client, set up the database, and seed it with demo data:

```bash
npm run setup
```

## Running the Project

You can start the main platform (Frontend & Backend) and the AI service concurrently with a single command:

```bash
npm run dev
```

- **Frontend App**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **AI Service**: http://localhost:8000

---

## Default Login Credentials

| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Admin   | admin@greenwood.edu     | admin123    |
| Teacher | sarah@greenwood.edu     | teacher123  |
| Parent  | john.smith@email.com    | parent123   |
| Student | alice@greenwood.edu     | student123  |
