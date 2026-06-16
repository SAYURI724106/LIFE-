# PowerShell 簡易 HTTP Web サーバー (ローカルネットワーク共有対応版)
$port = 8000

# ローカルIPアドレスを取得 (Wi-Fiや有線LANのアドレス)
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and 
    $_.InterfaceAlias -notlike "*Loopback*" -and 
    $_.InterfaceAlias -notlike "*Virtual*" -and 
    $_.InterfaceAlias -notlike "*vEthernet*" -and
    $_.InterfaceAlias -notlike "*Pseudo*"
} | Select-Object -First 1).IPAddress

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

if ($ip) {
    try {
        $listener.Prefixes.Add("http://$ip:$port/")
    } catch {
        # プレフィックスの追加エラーは無視して起動時にキャッチ
    }
}

$started = $false
try {
    $listener.Start()
    $started = $true
    Write-Host "Server started successfully!"
    Write-Host "--------------------------------------------------------"
    Write-Host "このPCでのアクセス用URL:   http://localhost:$port/"
    if ($ip) {
        Write-Host "他のPCからアクセスするURL: http://$ip:$port/"
    }
    Write-Host "--------------------------------------------------------"
} catch {
    # 管理者権限がない場合など、IPアドレスでの起動に失敗したときのフォールバック
    Write-Warning "ローカルIP ($ip) での共有サーバー起動に失敗しました（Windowsの制限による管理者権限不足）。"
    Write-Host "このPC専用モードで再起動しています..."
    
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    try {
        $listener.Start()
        $started = $true
        Write-Host "--------------------------------------------------------"
        Write-Host "このPCでのアクセス用URL:   http://localhost:$port/ (他PC共有はオフ)"
        Write-Host "他PCからアクセスさせるには、PowerShellを【管理者として実行】してこのスクリプトを再起動してください。"
        Write-Host "--------------------------------------------------------"
    } catch {
        Write-Error "サーバーの起動に完全に失敗しました: $($_.Exception.Message)"
    }
}

if ($started) {
    Write-Host "一時停止するにはターミナルで Ctrl+C を押すか、タスクを終了してください。"
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        try {
            # Url.LocalPath を使用してパスを安全に取得 (自動でデコードされる)
            $url = $request.Url.LocalPath
            if ($url -eq "/" -or $url -eq "") {
                $url = "/index.html"
            }
            
            Write-Host "Request: $($request.HttpMethod) $url"
            
            # Windowsのバックスラッシュに置換して結合
            $relativePath = $url.Replace("/", "\").TrimStart("\")
            $path = [System.IO.Path]::Combine($PSScriptRoot, $relativePath)
            
            if (Test-Path $path -PathType Leaf) {
                $content = [System.IO.File]::ReadAllBytes($path)
                $ext = [System.IO.Path]::GetExtension($path).ToLower()
                
                switch ($ext) {
                    ".html" { $response.ContentType = "text/html; charset=utf-8" }
                    ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                    ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                    ".jpg"  { $response.ContentType = "image/jpeg" }
                    ".jpeg" { $response.ContentType = "image/jpeg" }
                    ".png"  { $response.ContentType = "image/png" }
                    ".svg"  { $response.ContentType = "image/svg+xml; charset=utf-8" }
                    default { $response.ContentType = "application/octet-stream" }
                }
                
                $response.ContentLength64 = $content.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($content, 0, $content.Length)
                }
                $response.OutputStream.Close()
            } else {
                Write-Host "404 Not Found: $url (Resolved to: $path)"
                $response.StatusCode = 404
                $errContent = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $errContent.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($errContent, 0, $errContent.Length)
                }
                $response.OutputStream.Close()
            }
        } catch {
            Write-Host "Error processing request: $_"
        } finally {
            $response.Close()
        }
    }
} catch {
    Write-Host "Error occurred: $_"
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
}
