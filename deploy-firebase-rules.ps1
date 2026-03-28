# Deploy Firebase Rules Script
# Run this in PowerShell to deploy Firestore rules

Write-Host "🔥 Firebase Rules Deployment" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if Firebase CLI is installed
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "⚠️  Firebase CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g firebase-tools
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        Write-Host "`nPlease install manually:" -ForegroundColor Yellow
        Write-Host "npm install -g firebase-tools" -ForegroundColor White
        exit 1
    }
    
    Write-Host "✅ Firebase CLI installed successfully!`n" -ForegroundColor Green
}

Write-Host "📝 Step 1: Login to Firebase..." -ForegroundColor Cyan
firebase login

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase login failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n📤 Step 2: Deploying Firestore rules..." -ForegroundColor Cyan
firebase deploy --only firestore:rules

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy rules" -ForegroundColor Red
    Write-Host "`nTry deploying manually from Firebase Console:" -ForegroundColor Yellow
    Write-Host "https://console.firebase.google.com/" -ForegroundColor White
    exit 1
}

Write-Host "`n✅ Firestore rules deployed successfully!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Logout from admin panel" -ForegroundColor White
Write-Host "  2. Login again" -ForegroundColor White
Write-Host "  3. Refresh dashboard (Ctrl + F5)" -ForegroundColor White
Write-Host "`nAll data should now load correctly! 🎉" -ForegroundColor Green
