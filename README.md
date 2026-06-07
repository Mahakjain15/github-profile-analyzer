# GitHub Profile Analyzer API

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=flat-square&logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

A RESTful backend service that fetches GitHub user profiles via the GitHub API, analyzes key metrics, calculates a composite **profile score**, and caches the results in a MySQL database for fast retrieval.

---

## Overview

**GitHub Profile Analyzer** automates developer profile evaluation by:

1. **Fetching** live profile data and repository information from GitHub
2. **Analyzing** metrics such as followers, following, public repos, and top programming language
3. **Scoring** each profile on a 0–100 scale based on activity and completeness
4. **Caching** analyzed results in MySQL so repeat lookups are instant

Ideal for recruitment tools, developer dashboards, portfolio trackers, or any application that needs structured GitHub profile insights.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework & REST API routing |
| **MySQL** | Persistent storage for analyzed profiles |
| **Axios** | HTTP client for GitHub API requests |
| **dotenv** | Environment variable management |
| **nodemon** | Hot-reload during development |

---

## Project Structure

```
github-profile-analyzer/
├── config/
│   └── db.js                  # MySQL connection pool & auto schema setup
├── controllers/
│   └── profileController.js   # GitHub fetch, scoring, and DB logic
├── routes/
│   └── profileRoutes.js       # API route definitions
├── .env                       # Environment configuration (not committed)
├── .gitignore
├── package.json
├── schema.sql                 # Optional reference SQL schema
└── server.js                  # Application entry point
```

---

## Database Setup

No manual SQL import is required. On startup, `config/db.js` automatically:

1. Connects to your MySQL server using credentials from `.env`
2. Creates the `github_analyzer` database if it does not exist
3. Creates the `github_profiles` table with all required columns

### Auto-created table columns

| Column | Type | Description |
|---|---|---|
| `username` | `VARCHAR(255)` | GitHub username (unique) |
| `name` | `VARCHAR(255)` | Display name |
| `bio` | `TEXT` | Profile biography |
| `public_repos` | `INT` | Number of public repositories |
| `followers` | `INT` | Follower count |
| `following` | `INT` | Following count |
| `top_language` | `VARCHAR(100)` | Most-used language across repos |
| `profile_score` | `DECIMAL(5,2)` | Calculated score (0–100) |
| `analyzed_at` | `DATETIME` | Timestamp of last analysis |

> **Note:** You only need a running MySQL instance and valid credentials in `.env`. The schema is provisioned automatically when the server starts.

---

## Profile Score Algorithm

The profile score (max **100**) is calculated from:

| Factor | Max Points |
|---|---|
| Public repositories | 40 |
| Followers | 30 |
| Following | 10 |
| Bio present | 10 |
| Display name present | 5 |
| Top language detected | 5 |
| Repos with descriptions | 10 |

`top_language` is determined by counting the most frequently used language across a user's public repositories.

---

## Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MySQL](https://www.mysql.com/) server running locally or remotely
- *(Optional)* [GitHub Personal Access Token](https://github.com/settings/tokens) for higher API rate limits

### 1. Clone the repository

```bash
git clone https://github.com/your-username/github-profile-analyzer.git
cd github-profile-analyzer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root (or copy from the template below):

```env
# Server
PORT=3000

# MySQL Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=github_analyzer

# Optional: GitHub personal access token (increases rate limits)
GITHUB_TOKEN=
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3000`) |
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | No | MySQL port (default: `3306`) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | No | Database name (default: `github_analyzer`) |
| `GITHUB_TOKEN` | No | GitHub PAT for authenticated API requests |

### 4. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000` (or your configured `PORT`).

For production:

```bash
npm start
```

---

## API Endpoints

Base URL: `http://localhost:3000`

### Health Check

```http
GET /health
```

Returns server status and timestamp.

**Example response:**

```json
{
  "success": true,
  "message": "GitHub Profile Analyzer API is running",
  "timestamp": "2026-06-07T12:00:00.000Z"
}
```

---

### Analyze & Save a Profile

```http
POST /api/profiles/:username
```

Fetches a GitHub user's profile and repositories, calculates the profile score, and upserts the result into the database.

| Parameter | Location | Description |
|---|---|---|
| `username` | URL path | GitHub username to analyze |

**Example request:**

```bash
curl -X POST http://localhost:3000/api/profiles/octocat
```

**Example response:**

```json
{
  "success": true,
  "message": "Profile analyzed and saved successfully",
  "data": {
    "username": "octocat",
    "name": "The Octocat",
    "bio": null,
    "public_repos": 8,
    "followers": 9000,
    "following": 9,
    "top_language": "JavaScript",
    "profile_score": 72.5,
    "analyzed_at": "2026-06-07T12:00:00.000Z"
  }
}
```

---

### Get All Analyzed Profiles

```http
GET /api/profiles
```

Returns every cached profile, sorted by `profile_score` (descending) then `analyzed_at` (descending).

**Example request:**

```bash
curl http://localhost:3000/api/profiles
```

**Example response:**

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "username": "octocat",
      "name": "The Octocat",
      "bio": null,
      "public_repos": 8,
      "followers": 9000,
      "following": 9,
      "top_language": "JavaScript",
      "profile_score": 72.5,
      "analyzed_at": "2026-06-07T12:00:00.000Z"
    }
  ]
}
```

---

### Get a Single Analyzed Profile

```http
GET /api/profiles/:username
```

Retrieves a previously analyzed profile from the database cache.

| Parameter | Location | Description |
|---|---|---|
| `username` | URL path | GitHub username to look up |

**Example request:**

```bash
curl http://localhost:3000/api/profiles/octocat
```

**Example response:**

```json
{
  "success": true,
  "data": {
    "username": "octocat",
    "name": "The Octocat",
    "bio": null,
    "public_repos": 8,
    "followers": 9000,
    "following": 9,
    "top_language": "JavaScript",
    "profile_score": 72.5,
    "analyzed_at": "2026-06-07T12:00:00.000Z"
  }
}
```

---

## Error Responses

| Status | Scenario |
|---|---|
| `400` | Invalid GitHub username format |
| `404` | GitHub user not found, or profile not yet analyzed |
| `429` | GitHub API rate limit exceeded |
| `500` | Internal server or database error |

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server with nodemon (auto-reload) |
| `npm start` | Start server in production mode |

---

## License

This project is licensed under the [MIT License](LICENSE).
