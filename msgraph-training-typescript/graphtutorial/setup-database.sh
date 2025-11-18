#!/bin/bash

# AI Power Toys - Database Setup
# Creates and initializes the PostgreSQL database

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                   AI Power Toys - Database Setup                             ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# 1. Check if PostgreSQL is installed
echo -e "${CYAN}[1/5] Checking PostgreSQL installation...${NC}"
if ! command -v psql >/dev/null 2>&1 ; then
    echo -e "${RED}❌ PostgreSQL not found${NC}"
    echo ""
    echo "Please install PostgreSQL:"
    echo "  macOS:   brew install postgresql@14"
    echo "  Ubuntu:  sudo apt-get install postgresql postgresql-contrib"
    echo "  CentOS:  sudo yum install postgresql-server postgresql-contrib"
    exit 1
else
    PSQL_VERSION=$(psql --version)
    echo -e "${GREEN}✅ PostgreSQL installed: $PSQL_VERSION${NC}"
fi
echo ""

# 2. Check if PostgreSQL is running
echo -e "${CYAN}[2/5] Checking PostgreSQL status...${NC}"
if ! pg_isready >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  PostgreSQL not running${NC}"
    echo "   Attempting to start..."

    # Try to start PostgreSQL based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew >/dev/null 2>&1 ; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
            sleep 3
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null
        sleep 2
    fi

    if ! pg_isready >/dev/null 2>&1 ; then
        echo -e "${RED}❌ Could not start PostgreSQL${NC}"
        echo ""
        echo "Please start PostgreSQL manually:"
        echo "  macOS:   brew services start postgresql"
        echo "  Linux:   sudo systemctl start postgresql"
        exit 1
    else
        echo -e "${GREEN}✅ PostgreSQL started${NC}"
    fi
else
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
fi
echo ""

# 3. Check if database exists
echo -e "${CYAN}[3/5] Checking database 'ai_power_toys'...${NC}"
if psql -d ai_power_toys -c "SELECT 1" >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Database 'ai_power_toys' already exists${NC}"
    echo ""
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   Dropping existing database..."
        psql -d postgres -c "DROP DATABASE IF EXISTS ai_power_toys;" 2>/dev/null
        echo -e "${GREEN}✅ Database dropped${NC}"
    else
        echo "   Keeping existing database"
        echo -e "${BLUE}   To reload schema only, run:${NC}"
        echo "   psql -d ai_power_toys -f database/schema.sql"
        exit 0
    fi
fi

echo "   Creating database 'ai_power_toys'..."
if psql -d postgres -c "CREATE DATABASE ai_power_toys;" 2>/dev/null ; then
    echo -e "${GREEN}✅ Database created${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    exit 1
fi
echo ""

# 4. Load schema
echo -e "${CYAN}[4/5] Loading database schema...${NC}"
if [ ! -f "$PROJECT_ROOT/database/schema.sql" ]; then
    echo -e "${RED}❌ Schema file not found: $PROJECT_ROOT/database/schema.sql${NC}"
    exit 1
fi

if psql -d ai_power_toys -f "$PROJECT_ROOT/database/schema.sql" >/dev/null 2>&1 ; then
    echo -e "${GREEN}✅ Schema loaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to load schema${NC}"
    echo "   Try manually: psql -d ai_power_toys -f database/schema.sql"
    exit 1
fi
echo ""

# 5. Verify setup
echo -e "${CYAN}[5/5] Verifying setup...${NC}"

# Count tables
TABLE_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
echo "   Tables created: $TABLE_COUNT"

# Count test data
EMAIL_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM emails;" 2>/dev/null | xargs)
DETECTION_COUNT=$(psql -d ai_power_toys -t -c "SELECT COUNT(*) FROM power_toy_detections;" 2>/dev/null | xargs)

echo "   Test emails: $EMAIL_COUNT"
echo "   Test detections: $DETECTION_COUNT"

echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                          Setup Complete                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Database: ai_power_toys"
echo "Tables: $TABLE_COUNT"
echo "Test Data: $EMAIL_COUNT emails, $DETECTION_COUNT detections"
echo ""
echo "Next steps:"
echo "  1. Start services:  ./start-all.sh"
echo "  2. Open dashboard:  http://localhost:5273"
echo ""
