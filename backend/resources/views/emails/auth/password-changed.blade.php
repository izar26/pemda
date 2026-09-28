<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pemberitahuan Keamanan - Portal PEMDA</title>
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
            background: linear-gradient(135deg, #064e3b 0%, #059669 100%);
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
            color: #a7f3d0;
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
        .info-card {
            background-color: #f8fafc;
            border-left: 4px solid #10b981;
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
        .danger-box {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #991b1b;
            line-height: 1.5;
        }
        .danger-box strong {
            color: #7f1d1d;
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
                <p>Pusat Keamanan & Layanan Terpadu</p>
            </div>

            <!-- Main Content -->
            <div class="content">
                <div class="greeting">
                    Yth. {{ $userName }}{{ !empty($userNip) ? ' (NIP: ' . $userNip . ')' : '' }},
                </div>
                <div class="text">
                    Pemberitahuan keamanan: Kata sandi untuk akun Portal Pemda Anda telah <strong>berhasil diperbarui</strong>. Seluruh sesi aktif pada perangkat lain telah dinonaktifkan secara otomatis demi menjaga keamanan akun Anda.
                </div>

                <div class="info-card">
                    <table>
                        <tr>
                            <td class="label">Email Akun:</td>
                            <td>{{ $userEmail }}</td>
                        </tr>
                        <tr>
                            <td class="label">Waktu Perubahan:</td>
                            <td>{{ $changedAt }}</td>
                        </tr>
                        <tr>
                            <td class="label">Alamat IP:</td>
                            <td><code>{{ $ipAddress }}</code></td>
                        </tr>
                        <tr>
                            <td class="label">Status Sesi:</td>
                            <td>Seluruh perangkat sebelumnya telah dikeluarkan (*Logged Out*)</td>
                        </tr>
                    </table>
                </div>

                <div class="danger-box">
                    <strong>Peringatan Keamanan:</strong> Jika Anda <u>merasa tidak pernah</u> melakukan perubahan kata sandi ini, akun Anda kemungkinan dalam bahaya. Segera hubungi Administrator Sistem atau Tim Keamanan Siber Diskominfo PEMDA untuk mengamankan akun Anda.
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <strong>Pemerintah Daerah - Dinas Komunikasi dan Informatika</strong><br>
                Email ini dikirimkan secara otomatis oleh sistem audit keamanan Portal Pemda.<br>
                Mohon tidak membalas email ini (no-reply).
            </div>
        </div>
    </div>
</body>
</html>
