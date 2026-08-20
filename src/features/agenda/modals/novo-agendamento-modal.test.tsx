import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NovoAgendamentoModal } from './novo-agendamento-modal'

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast: toasts }))

afterEach(() => {
  toasts.error.mockClear()
  toasts.success.mockClear()
})

function renderModal(
  overrides: Partial<ComponentProps<typeof NovoAgendamentoModal>> = {},
) {
  const onCreatePatient = vi.fn().mockResolvedValue({ id: 'novo-1', nome: 'João Inexistente' })
  render(
    <NovoAgendamentoModal
      isOpen
      onClose={vi.fn()}
      patients={[{ id: '1', nome: 'Ana' }]}
      professionals={['Dr. Teste']}
      onCreatePatient={onCreatePatient}
      {...overrides}
    />,
  )
  return { onCreatePatient }
}

describe('NovoAgendamentoModal — paciente autocomplete + cadastro rápido', () => {
  it('mostra opção de cadastro rápido quando a busca não acha paciente', async () => {
    const user = userEvent.setup()
    renderModal()

    const search = screen.getByPlaceholderText(/buscar ou digitar nome/i)
    await user.type(search, 'João Inexistente')

    expect(await screen.findByText(/cadastro rápido/i)).toBeInTheDocument()
  })

  it('filtra pacientes cadastrados ao digitar o nome', async () => {
    const user = userEvent.setup()
    renderModal({
      patients: [
        { id: '1', nome: 'Ana Silva' },
        { id: '2', nome: 'Bruno Costa' },
      ],
    })

    await user.type(screen.getByPlaceholderText(/buscar ou digitar nome/i), 'Ana')

    expect(await screen.findByRole('option', { name: /Ana Silva/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Bruno Costa/i })).not.toBeInTheDocument()
  })

  it('cria paciente rápido e seleciona o novo id', async () => {
    const user = userEvent.setup()
    const { onCreatePatient } = renderModal()

    await user.type(screen.getByPlaceholderText(/buscar ou digitar nome/i), 'João Inexistente')
    await user.click(await screen.findByRole('button', { name: /cadastrar paciente rápido/i }))

    await user.clear(screen.getByLabelText(/nome completo/i))
    await user.type(screen.getByLabelText(/nome completo/i), 'João Inexistente')
    await user.type(screen.getByLabelText(/^telefone$/i), '11987654321')
    await user.type(screen.getByLabelText(/data de nascimento/i), '1990-05-15')
    await user.type(screen.getByLabelText(/^cpf$/i), '52998224725')

    await user.click(screen.getByRole('button', { name: /salvar paciente/i }))

    await waitFor(() => {
      expect(onCreatePatient).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'João Inexistente',
          telefone: expect.stringMatching(/\d/),
          dataNascimento: '1990-05-15',
          cpf: expect.stringMatching(/529\.?982\.?247-?25/),
        }),
      )
    })

    expect(await screen.findByText(/João Inexistente/i)).toBeInTheDocument()
  })

  it('Enter no cadastro rápido cria paciente sem submeter o formulário pai', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const { onCreatePatient } = renderModal({ onSave })

    await user.type(screen.getByPlaceholderText(/buscar ou digitar nome/i), 'João Inexistente')
    await user.click(await screen.findByRole('button', { name: /cadastrar paciente rápido/i }))

    await user.clear(screen.getByLabelText(/nome completo/i))
    await user.type(screen.getByLabelText(/nome completo/i), 'João Inexistente')
    await user.type(screen.getByLabelText(/^telefone$/i), '11987654321')
    await user.type(screen.getByLabelText(/data de nascimento/i), '1990-05-15')
    await user.type(screen.getByLabelText(/^cpf$/i), '52998224725{Enter}')

    await waitFor(() => {
      expect(onCreatePatient).toHaveBeenCalledTimes(1)
    })
    expect(onSave).not.toHaveBeenCalled()
  })
})
