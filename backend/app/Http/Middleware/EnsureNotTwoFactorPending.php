<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotTwoFactorPending
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->currentAccessToken()) {
            // If the current token only has '2fa:verify' ability, block access to normal API resources
            if ($user->tokenCan('2fa:verify') && !$user->tokenCan('*')) {
                return response()->json([
                    'message' => 'Autentikasi 2FA diperlukan untuk mengakses sumber daya ini.',
                    'requires_2fa' => true,
                ], 403);
            }
        }

        return $next($request);
    }
}
