<?php

declare(strict_types=1);

namespace App\Http\Requests\Setting;

use App\Models\SystemSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateSystemSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('settings.edit') ?? false;
    }

    public function rules(): array
    {
        return [
            'settings' => ['required', 'array'],
            'settings.app_name' => ['nullable', 'string', 'max:255'],
            'settings.instance_name' => ['nullable', 'string', 'max:255'],
            'settings.contact_email' => ['nullable', 'string', 'email', 'max:255'],
            'settings.contact_phone' => ['nullable', 'string', 'max:50'],
            'settings.session_lifetime_minutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'settings.max_login_attempts' => ['nullable', 'integer', 'min:1', 'max:20'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $settings = $this->input('settings', []);
            if (!is_array($settings)) {
                return;
            }

            $validKeys = SystemSetting::pluck('key')->all();
            foreach (array_keys($settings) as $key) {
                if (!in_array($key, $validKeys, true)) {
                    $v->errors()->add("settings.{$key}", "Kunci parameter pengaturan '{$key}' tidak valid atau tidak terdaftar dalam sistem.");
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'settings.required' => 'Data pengaturan wajib dikirim.',
            'settings.array' => 'Format pengaturan harus berupa array.',
            'settings.app_name.max' => 'Nama portal maksimal 255 karakter.',
            'settings.instance_name.max' => 'Nama instansi pemerintah maksimal 255 karakter.',
            'settings.contact_email.email' => 'Format email layanan/helpdesk tidak valid.',
            'settings.contact_email.max' => 'Email helpdesk maksimal 255 karakter.',
            'settings.contact_phone.max' => 'Nomor kontak helpdesk maksimal 50 karakter.',
            'settings.session_lifetime_minutes.integer' => 'Batas waktu sesi harus berupa angka bulat dalam menit.',
            'settings.session_lifetime_minutes.min' => 'Batas waktu sesi minimal 5 menit.',
            'settings.session_lifetime_minutes.max' => 'Batas waktu sesi maksimal 1440 menit (24 jam).',
            'settings.max_login_attempts.integer' => 'Batas toleransi login harus berupa angka bulat.',
            'settings.max_login_attempts.min' => 'Batas percobaan login minimal 1 kali.',
            'settings.max_login_attempts.max' => 'Batas percobaan login maksimal 20 kali.',
        ];
    }
}
