<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Undangan Aktivasi Akun Pegawai</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            color: #1e293b;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .header {
            background-color: #0f172a;
            color: #ffffff;
            padding: 28px 32px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .header p {
            margin: 6px 0 0 0;
            font-size: 13px;
            color: #94a3b8;
        }
        .content {
            padding: 32px;
            line-height: 1.6;
        }
        .salutation {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        .card-info {
            background-color: #f1f5f9;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
        }
        .card-info div {
            margin-bottom: 6px;
        }
        .card-info div:last-child {
            margin-bottom: 0;
        }
        .button-wrapper {
            text-align: center;
            margin: 32px 0;
        }
        .btn-activate {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 14px 32px;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
        }
        .notes-box {
            background-color: #fffbeb;
            border: 1px solid #fef3c7;
            padding: 14px 18px;
            border-radius: 6px;
            font-size: 13px;
            color: #92400e;
            margin-bottom: 24px;
        }
        .security-notice {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 12px;
            color: #64748b;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px 32px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PORTAL LAYANAN TERPADU PEMDA</h1>
            <p>Pemerintah Daerah • Surat Pemberitahuan Akun Kedinasan</p>
        </div>

        <div class="content">
            <div class="salutation">Yth. {{ $user->name }},</div>

            <p>
                Anda telah didaftarkan sebagai pengguna resmi pada <strong>Portal Layanan Terpadu Pemerintah Daerah</strong>. 
                Guna menjamin keamanan dan keabsahan identitas Anda, silakan lakukan aktivasi akun dan pembuatan kata sandi mandiri melalui tautan di bawah ini.
            </p>

            <div class="card-info">
                <div><strong>Nama Pengguna:</strong> {{ $user->name }}</div>
                <div><strong>Email Kedinasan:</strong> {{ $user->email }}</div>
                <div><strong>Peran (Role):</strong> {{ $user->roles->first()?->name ?? $user->role }}</div>
            </div>

            @if($notes)
            <div class="notes-box">
                <strong>Catatan dari Administrator:</strong><br>
                {{ $notes }}
            </div>
            @endif

            <div class="button-wrapper">
                <a href="{{ $activationUrl }}" class="btn-activate" target="_blank">
                    Aktivasi Akun Pegawai Sekarang
                </a>
            </div>

            <p style="font-size: 13px; color: #475569;">
                Jika tombol di atas tidak dapat diklik, salin dan tempel tautan berikut ke peramban (browser) Anda:<br>
                <a href="{{ $activationUrl }}" style="color: #2563eb; word-break: break-all;">{{ $activationUrl }}</a>
            </p>

            <div class="security-notice">
                <p><strong>Peringatan Keamanan:</strong></p>
                <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                    <li>Tautan aktivasi ini berlaku selama <strong>48 jam</strong> sejak surat elektronik ini dikirimkan.</li>
                    <li>Jangan pernah membagikan tautan aktivasi ini kepada pihak manapun.</li>
                    <li>Jika Anda tidak merasa memiliki keterkaitan dengan permohonan akun ini, harap abaikan pesan ini.</li>
                </ul>
            </div>
        </div>

        <div class="footer">
            &copy; {{ date('Y') }} Pemerintah Daerah. Seluruh hak cipta dilindungi undang-undang.<br>
            Pesan ini dikirimkan otomatis oleh sistem portal resmi. Mohon untuk tidak membalas email ini.
        </div>
    </div>
</body>
</html>
