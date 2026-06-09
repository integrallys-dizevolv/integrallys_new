'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Calendar, FileText, History, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { usePacientePortal } from './hooks/use-paciente-portal'
import { useAlertaPortal } from '@/hooks/use-alerta-portal'

export function HomeView() {
  const { data, error, isLoading } = usePacientePortal()
  const { data: remoteAlertConfig } = useAlertaPortal()
  const user = useAuth((state) => state.user)
  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'Paciente', [user?.name])
  const [alertTitle, setAlertTitle] = useState('Importante')
  const [alertMessage, setAlertMessage] = useState('')

  useEffect(() => {
    if (remoteAlertConfig?.title) setAlertTitle(remoteAlertConfig.title)
    if (remoteAlertConfig?.message) setAlertMessage(remoteAlertConfig.message)
  }, [remoteAlertConfig])

  const nextAppointment = data.nextAppointment
  const lastAppointment = data.lastAppointment

  return (
    <div className="app-page">
      {error && <p className="text-sm text-[var(--app-danger-text)]">{error}</p>}
      {isLoading && <p className="text-app-text-secondary">Carregando dashboard...</p>}

      {!isLoading && (
        <>
          <Card className="app-status-success dark:bg-transparent border-transparent dark:border-emerald-800 rounded-integrallys-lg">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div>
                  <h2 className="text-2xl font-bold text-app-text-primary dark:text-white mb-2">Olá, {firstName}! 👋</h2>
                  <p className="text-app-text-secondary dark:text-white/80">
                    Bem-vinda de volta ao seu portal de saúde. Aqui você pode gerenciar suas consultas, acessar prescrições e muito mais.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {alertMessage && (
            <Card className="app-status-warning dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 border-l-4 border-l-orange-500 rounded-integrallys-lg">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-[var(--app-warning-text)] dark:text-orange-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">{alertTitle}</h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">{alertMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="app-grid-stats">
            <Link href="/portal/agenda">
              <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg rounded-integrallys-lg">
                <CardContent className="p-6 flex items-start space-x-4">
                  <div className="p-3 app-status-info dark:bg-blue-900/30 rounded-integrallys text-[var(--app-info-text)] dark:text-[var(--app-info-text)]">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-app-text-primary dark:text-white">Próxima Consulta</h3>
                    <p className="text-sm text-app-text-secondary dark:text-white/60 mb-2">Agendada</p>
                    <p className="font-medium text-app-text-primary dark:text-white">{nextAppointment?.medico || 'Nenhuma'}</p>
                    <p className="text-sm text-app-text-secondary dark:text-white/60">{nextAppointment?.especialidade}</p>
                    <p className="text-sm text-[var(--app-info-text)] dark:text-[var(--app-info-text)] font-medium mt-1">{nextAppointment?.data}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/portal/historico">
              <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg rounded-integrallys-lg">
                <CardContent className="p-6 flex items-start space-x-4">
                  <div className="p-3 app-status-success dark:bg-transparent rounded-integrallys text-[var(--app-success-text)] dark:text-[var(--app-success-text)]">
                    <History className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-app-text-primary dark:text-white">Última Consulta</h3>
                    <p className="text-sm text-app-text-secondary dark:text-white/60 mb-2">Concluída</p>
                    <p className="font-medium text-app-text-primary dark:text-white">{lastAppointment?.medico || 'Nenhuma'}</p>
                    <p className="text-sm text-app-text-secondary dark:text-white/60">{lastAppointment?.especialidade}</p>
                    <p className="text-sm text-[var(--app-success-text)] dark:text-[var(--app-success-text)] font-medium mt-1">{lastAppointment?.data}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg rounded-integrallys-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 app-status-warning dark:bg-orange-900/30 rounded-integrallys text-[var(--app-warning-text)] dark:text-orange-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Notificações</h3>
                    <p className="text-sm text-app-text-secondary dark:text-white/60">3 novas</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-app-text-secondary dark:text-white/80">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full app-status-info0" />
                    Resultado de exame disponível
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full app-status-info0" />
                    Lembrete: Consulta amanhã
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full app-status-info0" />
                    Nova prescrição disponível
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-integrallys-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Histórico de Consultas Realizadas</CardTitle>
              <Button asChild className="whitespace-nowrap shrink-0">
                <Link href="/portal/historico">Ver Todo o Histórico</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Procedimento</TableHead>
                    <TableHead>Especialista</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentHistory.slice(0, 3).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.data}</TableCell>
                      <TableCell>{item.especialidade}</TableCell>
                      <TableCell>{item.medico}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="app-status-success text-[var(--app-success-text)] dark:bg-transparent dark:text-[var(--app-success-text)] hover:app-status-success"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-semibold text-app-text-primary dark:text-white mb-4">Ações Rápidas</h2>
            <div className="app-grid-stats">
              <Link href="/portal/agenda">
                <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg bg-white dark:bg-app-card-dark rounded-integrallys-lg">
                  <CardContent className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-app-primary rounded-integrallys text-white">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-app-text-primary dark:text-white">Ver Agenda</h3>
                      <p className="text-sm text-app-text-secondary dark:text-white/60">Marque novas consultas</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/portal/prescricoes">
                <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg bg-white dark:bg-app-card-dark rounded-integrallys-lg">
                  <CardContent className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-app-primary rounded-integrallys text-white">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-app-text-primary dark:text-white">Consultar Prescrições</h3>
                      <p className="text-sm text-app-text-secondary dark:text-white/60">Receitas e exames</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/portal/configuracoes">
                <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg bg-white dark:bg-app-card-dark rounded-integrallys-lg">
                  <CardContent className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-app-primary rounded-integrallys text-white">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-app-text-primary dark:text-white">Atualizar Dados</h3>
                      <p className="text-sm text-app-text-secondary dark:text-white/60">Mantenha seu cadastro em dia</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
