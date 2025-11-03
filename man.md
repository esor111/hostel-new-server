ssh -L 5432:localhost:5432 ubuntu@202.51.83.186
GrCNhFzMu6qw7pb8


# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kaha-dev
DB_PASSWORD=kaha-dev
DB_NAME=kaha_hostel_db

# Application Configuration
APP_PORT=3001
NODE_ENV=development

# JWT Configuration (for future authentication)
JWT_SECRET=secret

# JWT Authentication Configuration for kaha-main-v3 integration
# This should match the JWT secret used by kaha-main-v3
JWT_SECRET_TOKEN=secret

# Logging
LOG_LEVEL=debug

BUSINESS_TOKEN= eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmYzcwZGIzLTZmNDMtNDg4Mi05MmZkLTQ3MTVmMjVmZmM5NSIsImthaGFJZCI6IlUtOEM2OTVFIiwiYnVzaW5lc3NJZCI6ImMxOTlhYzkwLTdiNTEtNDJlMC04Y2FhLWEyNGM0NWUyYzMwZiIsImlhdCI6MTc1NzkwMjYwNX0.Z2yYPOxjJYTwEpz4vnnG7Z5IpLE1FsUECDn9GvKdLIE


KAHA-MAIN-V3=https://dev.kaha.com.np/main/api