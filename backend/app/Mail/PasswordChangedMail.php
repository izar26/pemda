<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $ipAddress
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pemberitahuan Keamanan: Kata Sandi Berhasil Diperbarui - ' . config('app.name', 'Portal Pemda'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.auth.password-changed',
            with: [
                'userName' => $this->user->name,
                'userEmail' => $this->user->email,
                'userNip' => $this->user->nip,
                'ipAddress' => $this->ipAddress,
                'changedAt' => now()->translatedFormat('d F Y, H:i') . ' WIB',
            ],
        );
    }
}
