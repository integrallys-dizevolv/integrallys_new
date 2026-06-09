'use client'

import {
    Dialog,
    DialogContent,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, User, AlertTriangle } from "lucide-react"
import type { Patient } from '@/types/patient'

export interface ImpactoPaciente {
    agendamentos: number
    prescricoes: number
    prontuarios: number
}

interface ExcluirPacienteModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    paciente: Patient | null
    impacto?: ImpactoPaciente | null
    isLoadingImpacto?: boolean
}

export function ExcluirPacienteModal({ isOpen, onClose, onConfirm, paciente, impacto, isLoadingImpacto }: ExcluirPacienteModalProps) {
    if (!paciente) return null;

    const totalImpacto = impacto
        ? impacto.agendamentos + impacto.prescricoes + impacto.prontuarios
        : 0

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95%] bg-app-card dark:bg-app-card-dark p-0 overflow-hidden border-none rounded-[24px]">
                <div className="p-5 md:p-8 space-y-6">
                    {/* Header */}
                    <div className="space-y-1 pr-8">
                        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-[var(--app-danger-text)]">
                            <AlertCircle className="h-5 w-5 md:h-6 md:w-6" />
                            Inativar Paciente
                        </h2>
                        <p className="text-app-text-secondary dark:text-white/60 text-xs md:text-sm font-medium">
                            Bloqueie o paciente sem remover o histórico
                        </p>
                    </div>

                    {/* Warning Box */}
                    <div className="p-4 app-status-danger dark:bg-transparent border border-transparent dark:border-red-900/20 rounded-2xl flex items-start gap-3 shadow-sm">
                        <AlertTriangle className="h-5 w-5 text-[var(--app-warning-text)] shrink-0 mt-0.5" />
                        <p className="text-xs md:text-sm font-medium text-[var(--app-danger-text)] dark:text-[var(--app-danger-text)] leading-relaxed">
                            O paciente será marcado como inativo. O histórico continuará preservado para auditoria e reativação futura.
                        </p>
                    </div>

                    {/* Patient Card */}
                    <div className="p-4 md:p-6 bg-app-bg-secondary dark:bg-app-hover rounded-[20px] border border-app-border dark:border-app-border-dark flex items-center gap-4">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-app-card dark:bg-app-bg-dark shadow-sm flex items-center justify-center border border-app-border dark:border-app-border-dark shrink-0">
                            <User className="h-5 w-5 md:h-6 md:w-6 text-app-text-muted" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <h3 className="text-base md:text-lg font-bold text-app-text-primary dark:text-white truncate">{paciente.name}</h3>
                            <p className="text-xs md:text-sm font-medium text-app-text-muted truncate">{paciente.email} • {paciente.phone}</p>
                            <p className="text-xs md:text-xs font-medium text-app-text-muted">CPF: {paciente.cpf || '---'}</p>
                        </div>
                    </div>

                    {/* Confirmation Text */}
                    <div className="space-y-3 px-1">
                        <h4 className="text-sm md:text-base font-bold text-app-text-secondary dark:text-white/80">
                            Tem certeza que deseja inativar este paciente?
                        </h4>

                        {isLoadingImpacto ? (
                            <div className="h-20 animate-pulse rounded-xl bg-app-bg-secondary dark:bg-app-hover" />
                        ) : impacto && totalImpacto > 0 ? (
                            <div className="rounded-xl bg-[var(--app-warning-bg)] p-3 text-sm text-[var(--app-warning-text)]">
                                <p className="mb-1 font-medium">Este paciente possui:</p>
                                <ul className="list-inside list-disc space-y-0.5">
                                    {impacto.agendamentos > 0 && (
                                        <li>{impacto.agendamentos} agendamento(s)</li>
                                    )}
                                    {impacto.prescricoes > 0 && (
                                        <li>{impacto.prescricoes} prescrição(ões)</li>
                                    )}
                                    {impacto.prontuarios > 0 && (
                                        <li>{impacto.prontuarios} prontuário(s) clínico(s)</li>
                                    )}
                                </ul>
                                <p className="mt-2 font-medium">O histórico será preservado para auditoria.</p>
                            </div>
                        ) : (
                            <p className="text-xs md:text-sm text-app-text-muted dark:text-white/60 leading-relaxed">
                                • O histórico será mantido para fins de auditoria • O paciente não poderá mais agendar consultas enquanto estiver inativo • A reativação pode ser feita pelo cadastro
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-5 md:p-8 pt-0 flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:flex-1 h-11 md:h-12 rounded-[12px] font-bold text-app-text-secondary dark:text-white/80 border-app-border dark:border-app-border-dark hover:bg-app-bg-secondary dark:hover:bg-app-hover transition-all shadow-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="w-full sm:flex-1 h-11 md:h-12 bg-[var(--app-danger-text)] hover:bg-[var(--app-danger-text)] text-white font-bold rounded-[12px] shadow-md shadow-red-600/10 transition-all active:scale-[0.98]"
                    >
                        Confirmar Inativação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
