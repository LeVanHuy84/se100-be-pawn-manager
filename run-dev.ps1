# Run this script to start the backend with automatic DB synchronization
Write-Host "Checking database connection and syncing schema..." -ForegroundColor Cyan

# Push the Prisma schema to the database
npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma db push failed. Please ensure Docker containers are running." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Seed the database
Write-Host "Seeding database..." -ForegroundColor Cyan
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "Database seeding failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Start the NestJS development server
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate

Write-Host "Starting NestJS in manual restart mode..." -ForegroundColor Green
Write-Host "Usage: Server runs once. When it stops (or you stop it with Ctrl+C), you can restart." -ForegroundColor Yellow

while ($true) {
    try {
        
        npm run start
    } catch {
        Write-Host "Server crashed or stopped with error." -ForegroundColor Red
    }
    
    $choice = Read-Host "Server stopped. Press 'Enter' to restart, or type 'q' to quit"
    if ($choice -eq 'q') {
        break
    }
    Write-Host "Restarting server..." -ForegroundColor Cyan
}
