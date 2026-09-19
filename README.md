# Meibo - User Roster Import Tool

Importing large sets of users from a spreadsheet into a system is a common administrative task. Meibo demonstrates a complete CSV user import workflow with automatic validation and formatting, available through both a web interface and a command-line tool.

Please read [About](#-about) section for architecture decisions.

### Project Demo

**Step 1: Upload a CSV file**

![Upload dashboard](public/dashboard.png)

**Step 2: Preview validation results**

![Validation preview showing valid and invalid records](public/preview.png)

**Step 3: Confirm and import**

![Import confirmation](public/import.png)

**Step 4: See the final result**

![Import complete](public/imported.png)

## 📑 Table of Contents

- [🚀 How to run](#-how-to-run)
  - [Prerequisites](#prerequisites)
  - [1. Docker (Recommended)](#1-docker-recommended)
  - [2. Manual Setup (Native PHP & Node)](#2-manual-setup-native-php--node)
- [⚙️ Methods](#️-methods)
  - [Endpoints](#endpoints)
  - [CLI args](#cli-args)
- [💡 About](#-about)
  - [N-Layered PHP-FPM + Nginx](#n-layered-php-fpm--nginx)
  - [Folder structure and coding standards](#folder-structure-and-coding-standards)
  - [Dockerize and Testing](#dockerize-and-testing)
- [📋 Validation Matrix](#-validation-matrix)

## 🚀 How to run

### Prerequisites

- **Docker Setup**: Docker Engine & Docker Compose
- **Manual Setup**: PHP 8.3+ (with `pdo_pgsql` extension enabled), Composer, Node.js 18+, and PostgreSQL 16

### 1. Docker (Recommended)

Start frontend, backend, and PostgreSQL containers:

```bash
docker compose up --build -d
```

Access the web UI at `http://localhost:3000` or backend API at `http://localhost:8080` in the deployed docker container.

Running the CLI tool inside the backend container:

```bash
# Rebuild users table
docker exec -it user_import_backend php user_upload.php --create-table

# Dry run mode (parse & validate without inserting to database)
docker exec -it user_import_backend php user_upload.php --file users.csv --dry-run

# Normal import
docker exec -it user_import_backend php user_upload.php --file users.csv
```

### 2. Manual Setup (Native PHP & Node)

Ensure a PostgreSQL instance is running locally and configure environment variables in `.env` (copy from `.env.example`):

```bash
cp .env.example .env
```

Install backend dependencies and initialize the PostgreSQL database schema:

```bash
composer install

# Rebuild PostgreSQL users table and index
php user_upload.php --create-table
```

Execute CLI commands or start local web API server:

```bash
# Dry run mode (validate without saving)
php user_upload.php --file users.csv --dry-run

# Normal import
php user_upload.php --file users.csv

# Optional: serve backend REST API locally for web frontend
php -S localhost:8080 bin/user_upload.php
```

Install frontend dependencies and start Vite dev server:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

## ⚙️ Methods

### Endpoints

| Method | Endpoint            | Description                                                 | Content-Type / Payload                                               |
| ------ | ------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| `POST` | `/api/preview`      | Preview CSV validation results without saving (Dry Run)     | `multipart/form-data` (`file`) or `application/json` (`csv_content`) |
| `POST` | `/api/import`       | Validate and import valid CSV user records into PostgreSQL  | `multipart/form-data` (`file`) or `application/json` (`csv_content`) |
| `POST` | `/api/create-table` | Initialize or drop and rebuild the `users` PostgreSQL table | N/A                                                                  |
| `GET`  | `/api/users`        | Fetch all imported user records stored in PostgreSQL        | N/A                                                                  |

### CLI args

| Option              | Type     | Description                                                           |
| ------------------- | -------- | --------------------------------------------------------------------- |
| `--file <filename>` | Required | Name or path of the CSV file to process                               |
| `--dry-run`         | Flag     | Runs parsing and validation without inserting records into PostgreSQL |
| `--create-table`    | Flag     | Rebuilds the PostgreSQL `users` table and unique email index          |
| `--help`            | Flag     | Displays available CLI options and usage instructions                 |

## 💡 About

I am going to explain the architecture decisions and technologies chosen in this app.
Starting with the technology stack itself, there are a lot of ways to build this. You can do the traditional way of using PHP-FPM + Nginx/Apache route combined, you can also take a more modern approach using FrankenPHP or RoadRunner, heck even Laravel is possible although it is a bit overkill for this small size, you can even make a bare PHP backend server from scratch.

However, for the purpose of this assignment, I will be using PHP-FPM + Nginx with some much-needed libraries for better maintainability. I chose this stack because it is common, developer-friendly, and simple for this app.

Here you can see the stack architecture, in which we will be using the N-Layered architecture, which is a great choice for this demo user import app.

### N-Layered PHP-FPM + Nginx

<div align="center">

![Technology Stack](public/stack.png)

</div>

For simplicity and fast setup, we will also be using Docker alongside the [serversideup/php:8.4-fpm-nginx](https://github.com/serversideup/docker-php) Docker image where we can combine Nginx, PHP-FPM, and our core PHP code in a single deployable Docker container. We will also be deploying the frontend and PostgreSQL in their own Docker containers.

### Folder structure and coding standards

Designing the folder structure is also very important. I am going for the [PHP-PDS Skeleton](https://github.com/php-pds/skeleton) repository which has 2.4k stars and is defined by the PHP-PDS community to standardize PHP packages.

Essentially it is a module-based approach similar to Go-based backends, where there will be one entrypoint for the app, in this case `user_upload.php` both for web and CLI. They will be using the underlying packages from `src` downstream which implements dependency injection and concern separation.

```bash
.
├── bin/
│   └── user_upload.php
├── docker/
├── frontend/
├── public/
├── src/
│   ├── Database/
│   ├── Dto/
│   ├── Handler/
│   ├── Importer/
│   ├── Parser/
│   └── Validator/
├── tests/
├── .env
├── composer.json
├── docker-compose.yml
├── openapi.yaml
├── phpcs.xml
└── user_upload.php
```

PHP coding standard is also an important implementation detail that we need to establish. Luckily there already exists some code-based code quality checker like [PHP_CodeSniffer](https://github.com/PHPCSStandards/PHP_CodeSniffer) defined in `phpcs.xml` in this project. We will define PSR-1, PSR-4, PSR-12, and the PER standard there. This is great because we can always check our work quality after a coding session.

We also define an `openapi.yaml` file for backend contracts which is not necessary for this app, but I use it to visualize during the development process. I check my APIs using the [Swagger Editor](https://editor.swagger.io/).

### Dockerize and Testing

We will be dockerizing the application which allows us to run the complete environment without anyone blaming their machine for being different again. Using Docker Compose (`docker-compose.yml`), we orchestrate three isolated services: the PHP-FPM + Nginx backend container, the React Vite frontend container, and a PostgreSQL 16 database container.

We also define some simple tests for quality assurance and to automate business logic. For unit testing, we use [PHPUnit 13](https://phpunit.de/) in `tests/UserImporterTest.php` to verify core business logic including name formatting, email normalization, email format validation, batch duplicate detection, and file limit checks. To run it, please do:

```bash
vendor/bin/phpunit tests/UserImporterTest.php
```

## 📋 Validation Matrix

Essentially, this is my own methodology to distinguish and separate validation places, since in big applications, validation can happen in both frontend and backend, and tracking and managing code can be difficult.

This matrix helps us developer understand in what part validation should live inside the code, this way we never have to be confused again why there is some obscure check in some random react arrow function in the frontend.

<table style="width: 100%; border-collapse: collapse; border: 1px solid #30363d;">
  <thead>
    <tr style="border-bottom: 1px solid #30363d;">
      <td align="left" style="padding: 10px; font-weight: bold; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">Rule</td>
      <td align="center" style="padding: 10px; font-weight: bold; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">React Comp</td>
      <td align="center" style="padding: 10px; font-weight: bold; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">React API</td>
      <td align="center" style="padding: 10px; font-weight: bold; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">Backend</td>
      <td align="left" style="padding: 10px; font-weight: bold; border-bottom: 1px solid #30363d;">Requirement</td>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #30363d;">
      <td style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;"><b>CSV Extension</b></td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td style="padding: 10px; border-bottom: 1px solid #30363d;">Must be CSV</td>
    </tr>
    <tr style="border-bottom: 1px solid #30363d;">
      <td style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;"><b>File Size</b></td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td style="padding: 10px; border-bottom: 1px solid #30363d;">Max 50 MB</td>
    </tr>
    <tr style="border-bottom: 1px solid #30363d;">
      <td style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;"><b>CSV Parsing</b></td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td style="padding: 10px; border-bottom: 1px solid #30363d;">Valid CSV</td>
    </tr>
    <tr style="border-bottom: 1px solid #30363d;">
      <td style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;"><b>Required Columns</b></td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td style="padding: 10px; border-bottom: 1px solid #30363d;">Name, Surname, Email</td>
    </tr>
    <tr style="border-bottom: 1px solid #30363d;">
      <td style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;"><b>Email Format</b></td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td style="padding: 10px; border-bottom: 1px solid #30363d;">Valid email</td>
    </tr>
    <tr style="border-bottom: 1px solid #30363d;">
      <td style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;"><b>Email Uniqueness</b></td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">-</td>
      <td align="center" style="padding: 10px; border-right: 1px solid #30363d; border-bottom: 1px solid #30363d;">✓</td>
      <td style="padding: 10px; border-bottom: 1px solid #30363d;">Must be unique</td>
    </tr>
  </tbody>
</table>

<br>
This example uses very simple responsibilities, you can arguably add more stuff the bigger the application gets and modify the matrix to separate by API calls or features.
