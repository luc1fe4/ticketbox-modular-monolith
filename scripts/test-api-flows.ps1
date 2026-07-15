# TicketBox End-to-End API Flow Test Script
# Run this script with the Spring Boot application running on http://localhost:8080

$baseUrl = "http://localhost:8080"
$headers = @{
    "Content-Type" = "application/json"
}

# 1. Register a new Audience User
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "1. Registering new customer..." -ForegroundColor Cyan
$regBody = @{
    email = "customer_test_$(Get-Date -Format 'HHmmss')@gmail.com"
    password = "SecurePassword123"
    fullName = "PowerShell Test User"
    phone = "0987654$(Get-Random -Minimum 100 -Maximum 999)"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $regBody -Headers $headers
    Write-Host "Register status: SUCCESS" -ForegroundColor Green
    Write-Host "Response message: $($regResponse.message)"
} catch {
    Write-Host "Register status: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# 2. Login to obtain JWT Token
Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "2. Logging in..." -ForegroundColor Cyan
$loginBody = @{
    email = (ConvertFrom-Json $regBody).email
    password = (ConvertFrom-Json $regBody).password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -Headers $headers
    $token = $loginResponse.data.accessToken
    $userId = $loginResponse.data.user.id
    $headers.Add("Authorization", "Bearer $token")
    Write-Host "Login status: SUCCESS" -ForegroundColor Green
    Write-Host "JWT Token acquired: $($token.Substring(0, 15))..."
    Write-Host "User ID: $userId"
} catch {
    Write-Host "Login status: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# 3. Retrieve User Profile
Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "3. Fetching User Profile..." -ForegroundColor Cyan
try {
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/users/me/profile" -Method Get -Headers $headers
    Write-Host "Profile status: SUCCESS" -ForegroundColor Green
    Write-Host "Email: $($profileResponse.data.email)"
    Write-Host "Full Name: $($profileResponse.data.fullName)"
    Write-Host "Phone: $($profileResponse.data.phone)"
} catch {
    Write-Host "Profile status: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# 4. Fetch Public Concerts List
Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "4. Listing Available Concerts..." -ForegroundColor Cyan
try {
    $concertsResponse = Invoke-RestMethod -Uri "$baseUrl/api/concerts" -Method Get -Headers $headers
    $concertCount = $concertsResponse.data.content.Count
    Write-Host "Concert count: $concertCount" -ForegroundColor Green
    
    if ($concertCount -gt 0) {
        $firstConcert = $concertsResponse.data.content[0]
        $concertId = $firstConcert.id
        Write-Host "Selected Concert ID: $concertId"
        Write-Host "Title: $($firstConcert.title)"
        Write-Host "Artist: $($firstConcert.artist)"
    } else {
        Write-Host "No active concerts found. Please run seed script or create a concert first." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Concerts fetch: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# 5. Fetch Ticket Types for Selected Concert
if ($concertId) {
    Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
    Write-Host "5. Fetching Ticket Types..." -ForegroundColor Cyan
    try {
        $ticketTypes = Invoke-RestMethod -Uri "$baseUrl/api/concerts/$concertId/ticket-types" -Method Get -Headers $headers
        Write-Host "Found $($ticketTypes.data.Count) ticket types." -ForegroundColor Green
        foreach ($t in $ticketTypes.data) {
            Write-Host "- Name: $($t.name) | Price: $($t.price) VND | Available: $($t.available)"
        }
        
        $selectedTicketType = $ticketTypes.data[0]
    } catch {
        Write-Host "Ticket types fetch: FAILED" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# 6. Book an Order with Idempotency Lock
if ($concertId -and $selectedTicketType) {
    Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
    Write-Host "6. Placing Ticket Order (with Idempotency Key)..." -ForegroundColor Cyan
    $orderIdempotencyKey = [guid]::NewGuid().ToString()
    $orderBody = @{
        concertId = $concertId
        items = @(
            @{
                ticketTypeId = $selectedTicketType.id
                quantity = 1
            }
        )
    } | ConvertTo-Json
    
    $orderHeaders = $headers.Clone()
    $orderHeaders.Add("Idempotency-Key", $orderIdempotencyKey)
    
    try {
        $orderResponse = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -Body $orderBody -Headers $orderHeaders
        $orderId = $orderResponse.data.id
        Write-Host "Order status: SUCCESS" -ForegroundColor Green
        Write-Host "Order ID: $orderId"
        Write-Host "Total Amount: $($orderResponse.data.totalAmount) VND"
        Write-Host "Expiration Time: $($orderResponse.data.expiresAt)"
    } catch {
        Write-Host "Order placement: FAILED" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# 7. Fetch User Order History
Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "7. Fetching Customer Orders History..." -ForegroundColor Cyan
try {
    $myOrders = Invoke-RestMethod -Uri "$baseUrl/api/orders/my" -Method Get -Headers $headers
    Write-Host "Found $($myOrders.data.Count) order(s) in history." -ForegroundColor Green
    foreach ($o in $myOrders.data) {
        Write-Host "- Order ID: $($o.id) | Concert: $($o.concertTitle) | Total: $($o.totalAmount) VND | Status: $($o.status)"
    }
} catch {
    Write-Host "Order history fetch: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# 8. Fetch My Active Tickets
Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "8. Fetching Owned Tickets..." -ForegroundColor Cyan
try {
    $myTickets = Invoke-RestMethod -Uri "$baseUrl/api/tickets/my" -Method Get -Headers $headers
    Write-Host "Found $($myTickets.data.Count) active tickets." -ForegroundColor Green
    foreach ($tk in $myTickets.data) {
        Write-Host "- Ticket ID: $($tk.id) | Concert: $($tk.concertTitle) | Type: $($tk.ticketTypeName) | Status: $($tk.status)"
    }
} catch {
    Write-Host "Tickets fetch: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "All API test flow checks completed." -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
