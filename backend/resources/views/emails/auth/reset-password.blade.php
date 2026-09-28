<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atur Ulang Kata Sandi - Portal PEMDA</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            -webkit-text-size-adjust: none;
        }
        .wrapper {
            width: 100%;
            background-color: #f1f5f9;
            padding: 40px 16px;
        }
        .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
            padding: 32px 30px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .header p {
            margin: 6px 0 0;
            font-size: 13px;
            color: #93c5fd;
            letter-spacing: 0.2px;
        }
        .content {
            padding: 36px 32px;
        }
        .greeting {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 12px;
        }
        .text {
            font-size: 14px;
            line-height: 1.6;
            color: #334155;
            margin-bottom: 24px;
        }
        .btn-container {
            text-align: center;
            margin: 32px 0;
        }
        .btn {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
        }
        .btn:hover {
            background-color: #1d4ed8;
        }
        .info-card {
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            border-radius: 4px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #475569;
        }
        .info-card table {
            width: 100%;
            border-collapse: collapse;
        }
        .info-card td {
            padding: 4px 0;
            vertical-align: top;
        }
        .info-card td.label {
            width: 130px;
            font-weight: 600;
            color: #334155;
        }
        .warning-box {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #92400e;
            line-height: 1.5;
        }
        .warning-box strong {
            color: #b45309;
        }
        .fallback-link {
            font-size: 12px;
            color: #64748b;
            word-break: break-all;
            line-height: 1.5;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        .fallback-link a {
            color: #2563eb;
            text-decoration: underline;
        }
        .footer {
            background-color: #f8fafc;
            padding: 24px 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            line-height: 1.5;
        }
        .footer strong {
            color: #334155;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>PORTAL RESMI PEMERINTAH DAERAH</h1>
                <p>Sistem Informasi Terintegrasi & Layanan Digital Aparatur</p>
            </div>

            <!-- Main Content -->
            <div class="content">
                <div class="greeting">
                    Yth. {{ $userName }}{{ !empty($userNip) ? ' (NIP: ' . $userNip . ')' : '' }},
                </div>
                <div class="text">
                    Kami menerima permintaan untuk mengatur ulang kata sandi akun Portal Pemda Anda. Klik tombol di bawah ini untuk membuat kata sandi baru yang aman:
                </div>

                <div class="btn-container">
                    <a href="{!! $resetUrl !!}" target="_blank" class="btn">
                        Atur Ulang Kata Sandi
                    </a>
                </div>

                <div class="info-card">
                    <table>
                        <tr>
                            <td class="label">Email Terdaftar:</td>
                            <td>{{ $userEmail }}</td>
                        </tr>
                        <tr>
                            <td class="label">Waktu Permintaan:</td>
                            <td>{{ $requestedAt }}</td>
                        </tr>
                        <tr>
                            <td class="label">Alamat IP Peminta:</td>
                            <td><code>{{ $ipAddress }}</code></td>
                        </tr>
                        <tr>
                            <td class="label">Masa Berlaku:</td>
                            <td><strong>{{ $expiresInMinutes }} Menit</strong> (Single-use)</td>
                        </tr>
                    </table>
                </div>

                <div class="warning-box">
                    <strong>Penting:</strong> Tautan ini hanya berlaku selama {{ $expiresInMinutes }} menit dan hanya dapat digunakan 1 (satu) kali. Jika Anda tidak pernah meminta perubahan kata sandi, abaikan email ini. Akun Anda tetap aman dan tidak ada perubahan yang dilakukan.
                </div>

                <div class="fallback-link">
                    Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut langsung di peramban (browser) Anda:<br>
                    <a href="{!! $resetUrl !!}">{!! $resetUrl !!}</a>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <strong>Pemerintah Daerah - Dinas Komunikasi dan Informatika</strong><br>
                Email ini dikirimkan secara otomatis oleh sistem keamanan Portal Pemda.<br>
                Mohon tidak membalas email ini (no-reply).
            </div>
        </div>
    </div>
</body>
</html>
