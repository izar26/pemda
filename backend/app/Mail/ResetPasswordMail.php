<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $resetUrl;

    public function __construct(
        public User $user,
        public string $token,
        public string $ipAddress,
        public int $expiresInMinutes = 30
    ) {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');
        $this->resetUrl = sprintf(
            '%s/reset-password?token=%s&email=%s',
            $frontendUrl,
            urlencode($this->token),
            urlencode($this->user->email)
        );
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Permintaan Atur Ulang Kata Sandi Akun - ' . config('app.name', 'Portal Pemda'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.reset-password',
            with: [
                'userName' => $this->user->name,
                'userEmail' => $this->user->email,
                'userNip' => $this->user->nip,
                'resetUrl' => $this->resetUrl,
                'ipAddress' => $this->ipAddress,
                'expiresInMinutes' => $this->expiresInMinutes,
                'requestedAt' => now()->translatedFormat('d F Y, H:i') . ' WIB',
            ],
        );
    }
}
