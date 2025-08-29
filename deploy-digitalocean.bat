@echo off
echo 🚀 Deploying Truco Game to DigitalOcean...

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Build Docker image
echo 🔨 Building Docker image...
docker build -t truco-game .

if %errorlevel% neq 0 (
    echo ❌ Docker build failed
    pause
    exit /b 1
)

echo ✅ Docker image built successfully

echo 🎉 Build complete!
echo 📝 Next steps:
echo    1. Go to DigitalOcean App Platform
echo    2. Create a new app
echo    3. Connect your GitHub repository
echo    4. Deploy using the .do/app.yaml configuration
echo.
echo 💡 You can also run: docker run -p 3000:3000 truco-game
pause
