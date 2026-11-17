import { useEffect } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  identifierEmpty: 'Email atau NIP wajib diisi.',
  passwordEmpty: 'Kata sandi wajib diisi.',
} as const

const navigate = vi.fn()
const routerInvalidateMock = vi.fn()
const setUserMock = vi.fn()
const setAccessTokenMock = vi.fn()
const loginMock = vi.fn()

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: setUserMock,
      setAccessToken: setAccessTokenMock,
    },
  }),
}))

vi.mock('@/services/auth-service', () => ({
  authService: {
    login: (...args: unknown[]) => loginMock(...args),
  },
}))

vi.mock('@/components/turnstile-widget', () => ({
  TurnstileWidget: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    useEffect(() => {
      onSuccess('mock-turnstile-token')
    }, [onSuccess])
    return <div data-testid='mock-turnstile' />
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouter: () => ({ invalidate: routerInvalidateMock }),
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let identifierInput: Locator
    let passwordInput: Locator
    let signInButton: Locator
    let forgotPasswordLink: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      loginMock.mockResolvedValue({
        requires_2fa: false,
        token: 'mock-access-token',
        user: {
          id: 'user-1',
          name: 'Superadmin',
          email: 'admin@pemda.go.id',
          roles: ['Super Administrator'],
          permissions: [],
        },
        message: 'Selamat datang, Superadmin!',
      })

      screen = await render(<UserAuthForm />)
      identifierInput = screen.getByRole('textbox', { name: /^Email atau NIP Pegawai$/i })
      passwordInput = screen.getByLabelText(/^Kata Sandi$/i)
      signInButton = screen.getByRole('button', { name: /^Masuk$/i })
      forgotPasswordLink = screen.getByText(/^Lupa sandi\?$/i)
    })

    it('renders fields, submit button, and forgot password link', async () => {
      await expect.element(identifierInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
      await expect.element(forgotPasswordLink).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.identifierEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('authenticates, invalidates router, and navigates to default route on success', async () => {
      await userEvent.fill(identifierInput, 'admin@pemda.go.id')
      await userEvent.fill(passwordInput, 'Password@123')

      await userEvent.click(signInButton)

      await vi.waitFor(() => expect(loginMock).toHaveBeenCalledOnce())
      expect(setUserMock).toHaveBeenCalledOnce()
      expect(setUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@pemda.go.id',
          name: 'Superadmin',
        })
      )
      expect(setAccessTokenMock).toHaveBeenCalledOnce()
      expect(setAccessTokenMock).toHaveBeenCalledWith('mock-access-token')
      expect(routerInvalidateMock).toHaveBeenCalledOnce()

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided and not pointing to sign-in', async () => {
    vi.clearAllMocks()
    loginMock.mockResolvedValue({
      requires_2fa: false,
      token: 'mock-access-token',
      user: {
        id: 'user-1',
        name: 'Superadmin',
        email: 'admin@pemda.go.id',
      },
    })

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.fill(getByRole('textbox', { name: /Email atau NIP Pegawai/i }), 'admin@pemda.go.id')
    await userEvent.fill(getByLabelText(/Kata Sandi/i), 'Password@123')

    await userEvent.click(getByRole('button', { name: /Masuk/i }))

    await vi.waitFor(() => expect(setUserMock).toHaveBeenCalledOnce())
    expect(setAccessTokenMock).toHaveBeenCalledOnce()
    expect(routerInvalidateMock).toHaveBeenCalledOnce()

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })
})
