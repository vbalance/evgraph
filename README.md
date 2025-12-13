# EVGraph - EV Betting Analytics Dashboard

Веб-застосунок для аналізу та візуалізації даних ставок з позитивним математичним очікуванням (Expected Value). Включає інтерактивні графіки EV в часі, деталізовану інформацію про ставки та сесії.

## 🎯 Основні можливості

### Аналіз сесій
- Перегляд всіх bot sessions з статистикою
- Загальна кількість ставок та успішно розміщених
- Час початку та завершення кожної сесії

### Деталізація ставок
- Таблиця всіх ставок по сесії з сортуванням
- Інформація про подію (спорт, ліга, команди)
- Коефіцієнти (odds, fair odds), EV%, статус, розмір ставки

### Інтерактивні графіки EV
- **Zoom & Pan**: Колесо миші для зуму, перетягування для навігації
- **Кольорові маркери точок**:
  - 🟨 Жовта велика точка - поява EV ставки
  - 🟩 Зелена велика точка - розміщена ставка
  - 🔴 Червона точка - suspended (Pinnacle або букмекер)
  - 🔵 Синя точка - нормальний стан
- **Вертикальні лінії**:
  - 🟦 Синя - початок сесії
  - 🟥 Червона - кінець сесії
- **Червоні горизонтальні лінії**: з'єднують точки з EV ≥ 5%, де koef не падає протягом 4 секунд
- **Детальний tooltip**: при наведенні показує всі дані точки (EV, odds, fair odds, pinnacle odds, статуси)
- **Fullscreen режим** для детального аналізу

## 🏗️ Технології

### Backend
- **FastAPI** - швидкий асинхронний API framework
- **SQLModel** - ORM для роботи з PostgreSQL
- **Uvicorn** - ASGI server
- **Python 3.12** – з UV package manager

### Frontend
- **React 19** - UI бібліотека
- **TypeScript** - типізація
- **Vite** - build tool
- **React Router** - маршрутизація
- **Recharts** - інтерактивні графіки
- **Tailwind CSS 4** - стилізація

### Infrastructure
- **Docker** - контейнеризація
- **Nginx** – reverse proxy для production
- **PostgreSQL** - віддалена база даних

## 🚀 Швидкий старт

### Вимоги
- Docker та Docker Compose
- Git

### 1. Клонувати репозиторій
```bash
git clone <repository-url>
cd evgraph
```

### 2. Налаштувати .env
```bash
cp .env.example .env
# Відредагувати .env з вашими даними бази
nano .env
```

Приклад `.env`:
```bash
# PostgreSQL Remote Database
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=your_host
POSTGRES_PORT=5432

# Backend Configuration
BACKEND_PORT=8174
BACKEND_HOST=0.0.0.0

# Frontend Configuration
VITE_API_BASE_URL=/api
```

### 3. Запустити в Docker

#### Production
```bash
docker compose up -d
```

#### Development (з hot-reload)
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Відкрити в браузері

**Production:**
- Frontend: http://localhost:5174
- Backend API: http://localhost:8174
- API Docs: http://localhost:8174/docs

**Development:**
- Frontend (Vite): http://localhost:5174
- Backend API: http://localhost:8174

## 📁 Структура проекту

```
evgraph/
├── api/                      # Backend (FastAPI)
│   ├── main.py              # FastAPI app
│   ├── routes.py            # API endpoints
│   ├── models.py            # SQLModel models
│   ├── crud.py              # Database operations
│   ├── db.py                # Database connection
│   └── config.py            # Configuration
├── frontend/                 # Frontend (React)
│   ├── src/
│   │   ├── components/      # React компоненти
│   │   ├── api.ts           # API client
│   │   ├── types.ts         # TypeScript типи
│   │   └── App.tsx          # Головний компонент
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile_backend        # Backend Docker image
├── Dockerfile_frontend       # Frontend Docker image
├── docker-compose.yml        # Production compose
├── docker-compose.dev.yml    # Development compose
├── .env                      # Environment variables
├── .dockerignore
├── pyproject.toml            # Python dependencies (UV)
├── uv.lock
└── README.md
```

## 🛠️ Docker команди

### Запуск
```bash
# Production
docker compose up -d

# Development
docker compose -f docker-compose.dev.yml up -d

# Переглянути логи
docker compose logs -f

# Переглянути логи конкретного сервісу
docker compose logs -f backend
docker compose logs -f frontend
```

### Зупинка
```bash
docker compose down

# Видалити контейнери та volumes
docker compose down -v
```

### Перебудова
```bash
# Перебудувати всі образи
docker compose build

# Перебудувати конкретний сервіс
docker compose build backend

# Перебудувати без кешу
docker compose build --no-cache
```

### Виконання команд
```bash
# Backend shell
docker compose exec backend bash

# Frontend shell
docker compose exec frontend sh

# Виконати Python команду
docker compose exec backend python -c "print('Hello')"
```

## 🌐 Доступ з інших пристроїв

Застосунок можна відкрити з будь-якого пристрою в мережі:

```
http://<server-ip>:5174
```

де `<server-ip>` - IP адреса сервера (наприклад `192.168.1.100`)

API запити автоматично проксуються через nginx на backend.

## 💻 Локальна розробка (без Docker)

### Backend
```bash
# Встановити UV package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Встановити залежності
uv sync

# Запустити backend
uv run uvicorn api.main:app --reload --port 8174
```

### Frontend
```bash
cd frontend

# Встановити залежності
npm install

# Створити .env.local для локальної розробки
echo "VITE_API_BASE_URL=http://localhost:8174/api" > .env.local

# Запустити dev server
npm run dev
```

Відкрити http://localhost:5174

## 📊 API Endpoints

### Sessions
- `GET /api/sessions` - Список всіх сесій з статистикою
- `GET /api/sessions/{session_id}` - Деталі конкретної сесії
- `GET /api/sessions/{session_id}/bets` - Ставки по сесії

### Bets
- `GET /api/bets?bet_id={bet_id}` - Деталі конкретної ставки
- `GET /api/bets/ev?bet_id={bet_id}` - EV історія для ставки

### Health
- `GET /health` - Health check endpoint

Повна документація: http://localhost:8174/docs

## 🔧 Налаштування

### Зміна портів

Відредагуйте `.env`:
```bash
BACKEND_PORT=9000
VITE_API_BASE_URL=/api
```

Перезбудуйте:
```bash
docker compose down
docker compose up --build -d
```

### Підключення до іншої бази даних

Оновіть `POSTGRES_*` змінні в `.env` та перезапустіть контейнери.

## 🐛 Troubleshooting

### Backend не може підключитися до БД
Перевірте credentials в `.env` та доступність бази даних:
```bash
docker compose logs backend
```

### Frontend не може підключитися до backend
Переконайтеся що `VITE_API_BASE_URL=/api` в `.env` та перебудуйте frontend:
```bash
docker compose build frontend
docker compose up -d frontend
```

### Порт вже зайнятий
Змініть порти в `.env` або зупиніть конфліктуючий процес:
```bash
# Знайти процес на порту 8174
lsof -ti:8174

# Вбити процес
lsof -ti:8174 | xargs kill -9
```

## 📝 Ліцензія

MIT License

## 👤 Автор

Arsen Makovei
