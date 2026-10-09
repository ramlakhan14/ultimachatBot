# Local Development

This setup runs MongoDB, Redis, the API, both workers, and the frontend in an isolated Docker Compose project. It uses a separate `ultimachatbot_local` database and binds application/database ports to localhost. It does not connect to MongoDB Atlas or change the regular production Compose files.

## Start

Install Docker Desktop, then from the repository root:

```powershell
Copy-Item .env.local.example .env.local
docker compose --env-file .env.local -f docker-compose.local.yml up --build -d
docker compose --env-file .env.local -f docker-compose.local.yml --profile seed run --rm seed-users
```

Open the app at http://localhost:3030. The API is at http://localhost:3000.

## Demo Logins

| Role | Email | Password |
| --- | --- | --- |
| Super admin | `superadmin@local.test` | `SuperAdmin!234` |
| Admin | `admin@local.test` | `AdminUser!234` |
| User | `user@local.test` | `NormalUser!234` |

The seed is repeatable and leaves existing demo accounts unchanged. It refuses to seed a non-local MongoDB hostname.

Third-party service credentials in `.env.local.example` are dummy or blank. Features requiring OpenAI, Firebase messaging, email delivery, billing, or other external services will not work until configured with separate local credentials. The local frontend mounts a no-op messaging worker; the production messaging worker is untouched.

## Stop

```powershell
docker compose --env-file .env.local -f docker-compose.local.yml down
```

This preserves the local MongoDB data. To permanently remove only this local database volume, add `-v` to the `down` command.