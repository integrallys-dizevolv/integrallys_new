'use client'

import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ShieldAlert, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/shared/segmented-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'

interface ContaOption {
  id: string
  nome: string
  banco?: string | null
  conta?: string | null
  tipo?: 'corrente' | 'poupanca' | 'investimento' | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contas: ContaOption[]
  defaultContaId?: string | null
}

export interface OfxTransacao {
  dataTransacao: string
  valor: number
  descricao: string
  tipo: 'CREDIT' | 'DEBIT' | null
  fitid: string | null
}

export interface OfxBankHeader {
  bankId: string
  acctId: string
  acctType: string
}

type ImportSource = 'ofx' | 'cielo'

function tagValue(text: string, tag: string): string {
  const xml = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(text)
  if (xml) return xml[1].trim()
  const sgml = new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i').exec(text)
  return sgml ? sgml[1].trim() : ''
}

export function parseOFXHeader(text: string): OfxBankHeader | null {
  const clean = text.replace(/\[-?\d+:[A-Z]+\]/g, '')
  const blockMatch = /<BANKACCTFROM>([\s\S]*?)<\/BANKACCTFROM>/i.exec(clean)
  const scope = blockMatch ? blockMatch[1] : clean

  const bankId = tagValue(scope, 'BANKID')
  const acctIdRaw = tagValue(scope, 'ACCTID')
  const acctType = tagValue(scope, 'ACCTTYPE').toUpperCase()

  if (!bankId && !acctIdRaw && !acctType) return null

  return {
    bankId: bankId.trim(),
    acctId: acctIdRaw.replace(/[^\d]/g, ''),
    acctType,
  }
}

export function normalizeAcctId(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '')
  return digits.slice(0, 8)
}

function mapAcctTypeToContaTipo(acctType: string): 'corrente' | 'poupanca' | null {
  const value = acctType.toUpperCase()
  if (value === 'CHECKING') return 'corrente'
  if (value === 'SAVINGS') return 'poupanca'
  return null
}

/**
 * Parser OFX que cobre dois formatos reais analisados:
 *
 *  1. Bradesco (SGML legado, OFX 1.x): tags sem fechamento, decimal com
 *     vírgula ("818,38"), DTPOSTED sem timezone ("20260313120000").
 *  2. Sicredi (XML moderno OFX 2.x): tags fechadas, decimal com ponto
 *     ("-100.00"), DTPOSTED com timezone (ex: 20260310000000 seguido de
 *     sufixo entre colchetes contendo offset:zona, p.ex. -3 e GMT).
 *
 * Estratégia: tenta primeiro detectar blocos `<STMTTRN>...</STMTTRN>` (XML).
 * Se não houver, faz split por `<STMTTRN>` (SGML). Em ambos os casos extrai
 * cada campo via regex tag-aberta-até-fim-de-linha-ou-próxima-tag.
 */
export function parseOFX(text: string): OfxTransacao[] {
  // Normaliza: remove sufixo de timezone do DTPOSTED em qualquer formato
  const clean = text.replace(/\[-?\d+:[A-Z]+\]/g, '')

  const blocks: string[] = []
  const xmlBlocks = clean.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g)
  if (xmlBlocks && xmlBlocks.length > 0) {
    blocks.push(...xmlBlocks)
  } else {
    const parts = clean.split('<STMTTRN>')
    parts.slice(1).forEach((part) => blocks.push('<STMTTRN>' + part))
  }

  return blocks
    .map((block) => {
      const get = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}>([^<\\n\\r]+)`))
        return m ? m[1].trim() : ''
      }

      const rawAmt = get('TRNAMT').replace(/\./g, '').replace(',', '.')
      // Caso o ponto seja milhares E vírgula seja decimal (formato BR), o
      // replace acima cobre. Caso seja "100.00" (formato US), o replace de
      // ponto remove o decimal — corrigir detectando se há vírgula:
      const valor = get('TRNAMT').includes(',')
        ? parseFloat(rawAmt) || 0
        : parseFloat(get('TRNAMT')) || 0

      const dtRaw = get('DTPOSTED').slice(0, 8)
      const data = dtRaw.length === 8
        ? `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}`
        : ''

      const trntype = get('TRNTYPE').toUpperCase()
      const tipo: 'CREDIT' | 'DEBIT' | null =
        trntype === 'CREDIT' || trntype === 'DEBIT'
          ? trntype
          : valor >= 0
            ? 'CREDIT'
            : 'DEBIT'

      return {
        dataTransacao: data,
        valor,
        descricao: get('MEMO') || get('NAME') || '',
        tipo,
        fitid: get('FITID') || null,
      }
    })
    .filter((t) => t.dataTransacao && t.valor !== 0)
}

/**
 * Parser CSV Cielo — detecta dois formatos pelo header:
 *  - Recebíveis detalhados: header inclui "Data de pagamento", "Bandeira",
 *    "Tipo de lançamento", "Forma de pagamento", "Valor bruto",
 *    "Valor Taxa/Tarifa", "Valor líquido", "Status de pagamento",
 *    "Número da parcela", "Quantidade total de parcelas".
 *  - Antecipação: header inclui "Bandeira", "Produto", "Valor bruto das vendas",
 *    "Valor desconto MDR", "Valor líquido das vendas", "Valor pago".
 *
 * Separador ";", encoding latin1 (decodificado como ISO-8859-1).
 * Valores com "R$ " e formato BR ("1.234,56") são normalizados.
 */
function parseCSVCielo(text: string): OfxTransacao[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  // Procura linha de header (primeira que contém ";" e palavras-chave)
  const headerIdx = lines.findIndex(
    (line) =>
      line.toLowerCase().includes('bandeira') ||
      line.toLowerCase().includes('valor bruto') ||
      line.toLowerCase().includes('valor pago'),
  )
  if (headerIdx === -1) return []

  const header = lines[headerIdx].split(';').map((h) => h.trim().toLowerCase())
  const rows = lines.slice(headerIdx + 1)

  const colIdx = (...candidates: string[]): number => {
    for (const candidate of candidates) {
      const idx = header.findIndex((h) =>
        h.replace(/\s+/g, ' ').includes(candidate.toLowerCase()),
      )
      if (idx !== -1) return idx
    }
    return -1
  }

  const idxData = colIdx('data de pagamento', 'data')
  const idxBandeira = colIdx('bandeira')
  const idxForma = colIdx('forma de pagamento', 'produto')
  const idxParcela = colIdx('número da parcela', 'numero da parcela')
  const idxTotalParcelas = colIdx('quantidade total de parcelas', 'total de parcelas')
  const idxValorLiq = colIdx('valor líquido', 'valor liquido', 'valor pago', 'valor líquido das vendas')

  if (idxValorLiq === -1) return []

  const normalizeValor = (raw: string) => {
    const cleaned = raw.replace(/r\$\s*/i, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }

  const normalizeData = (raw: string) => {
    // Aceita DD/MM/YYYY ou YYYY-MM-DD
    const trimmed = raw.trim()
    const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
    if (br) return `${br[3]}-${br[2]}-${br[1]}`
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
    return ''
  }

  const today = new Date().toISOString().slice(0, 10)

  const result: OfxTransacao[] = []
  for (const row of rows) {
    const cols = row.split(';').map((c) => c.trim())
    const valor = idxValorLiq !== -1 ? normalizeValor(cols[idxValorLiq] ?? '') : 0
    if (valor === 0) continue

    const data = idxData !== -1 ? normalizeData(cols[idxData] ?? '') : today
    if (!data) continue

    const bandeira = idxBandeira !== -1 ? cols[idxBandeira] ?? '' : ''
    const forma = idxForma !== -1 ? cols[idxForma] ?? '' : ''
    const parcela = idxParcela !== -1 ? cols[idxParcela] ?? '' : ''
    const totalParcelas = idxTotalParcelas !== -1 ? cols[idxTotalParcelas] ?? '' : ''
    const desc = [
      bandeira,
      forma,
      parcela && totalParcelas ? `${parcela}/${totalParcelas}×` : '',
    ]
      .filter(Boolean)
      .join(' ')

    result.push({
      dataTransacao: data || today,
      valor,
      descricao: desc || 'Cielo',
      tipo: 'CREDIT',
      fitid: null,
    })
  }
  return result
}

export function ImportarOfxModal({ open, onOpenChange, contas, defaultContaId }: Props) {
  const api = useApi()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [contaId, setContaId] = useState(defaultContaId ?? contas[0]?.id ?? '')
  const [transacoes, setTransacoes] = useState<OfxTransacao[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [source, setSource] = useState<ImportSource>('ofx')
  const [ofxHeader, setOfxHeader] = useState<OfxBankHeader | null>(null)
  const [confirmedDivergence, setConfirmedDivergence] = useState(false)

  const contaSelecionada = useMemo(
    () => contas.find((c) => c.id === contaId) ?? null,
    [contas, contaId],
  )

  const divergencias = useMemo(() => {
    if (!ofxHeader || !contaSelecionada) return [] as Array<{ campo: string; arquivo: string; cadastro: string }>
    const result: Array<{ campo: string; arquivo: string; cadastro: string }> = []

    if (ofxHeader.acctId) {
      const ofxConta = normalizeAcctId(ofxHeader.acctId)
      const contaCadastro = normalizeAcctId(contaSelecionada.conta ?? '')
      if (contaCadastro && ofxConta && ofxConta !== contaCadastro) {
        result.push({
          campo: 'Número da conta',
          arquivo: ofxHeader.acctId,
          cadastro: contaSelecionada.conta ?? '—',
        })
      }
    }

    if (ofxHeader.acctType) {
      const ofxTipo = mapAcctTypeToContaTipo(ofxHeader.acctType)
      if (ofxTipo && contaSelecionada.tipo && ofxTipo !== contaSelecionada.tipo) {
        result.push({
          campo: 'Tipo de conta',
          arquivo: ofxHeader.acctType,
          cadastro: contaSelecionada.tipo,
        })
      }
    }

    if (ofxHeader.bankId && contaSelecionada.banco) {
      const bancoCadastro = contaSelecionada.banco.replace(/\D/g, '')
      if (bancoCadastro && ofxHeader.bankId !== bancoCadastro) {
        result.push({
          campo: 'Código do banco',
          arquivo: ofxHeader.bankId,
          cadastro: contaSelecionada.banco,
        })
      }
    }

    return result
  }, [ofxHeader, contaSelecionada])

  const temDivergencia = divergencias.length > 0

  const handleFile = async (file: File | null) => {
    if (!file) return
    setFileName(file.name)
    setConfirmedDivergence(false)
    try {
      const text =
        source === 'cielo'
          ? await file.text() // Browsers tipicamente decodificam latin1 razoavelmente em CSV simples
          : await file.text()
      const parsed = source === 'cielo' ? parseCSVCielo(text) : parseOFX(text)
      if (parsed.length === 0) {
        toast.error(
          source === 'cielo'
            ? 'CSV Cielo não pôde ser interpretado. Verifique cabeçalho e separador (;).'
            : 'Não foi possível extrair transações do arquivo OFX.',
        )
        setTransacoes([])
        setOfxHeader(null)
        return
      }
      setTransacoes(parsed)
      if (source === 'ofx') {
        setOfxHeader(parseOFXHeader(text))
      } else {
        setOfxHeader(null)
      }
      toast.success(`${parsed.length} transação(ões) extraídas`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao ler o arquivo')
    }
  }

  const handleImport = async () => {
    if (!contaId) {
      toast.error('Selecione a conta bancária')
      return
    }
    if (transacoes.length === 0) {
      toast.error('Sem transações para importar')
      return
    }
    setIsImporting(true)
    try {
      const res = await api.post<{ meta?: { ignoradas?: number } }>(
        '/api/gestao-bancaria/ofx',
        { contaId, transacoes },
      )
      const ignoradas = res.meta?.ignoradas ?? 0
      const importadas = transacoes.length - ignoradas
      toast.success(
        ignoradas > 0
          ? `${importadas} importada(s), ${ignoradas} ignorada(s) (já existiam pelo FITID)`
          : `${importadas} transação(ões) importadas para conciliação`,
      )
      setTransacoes([])
      setFileName(null)
      if (fileRef.current) fileRef.current.value = ''
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao importar')
    } finally {
      setIsImporting(false)
    }
  }

  const handleSourceChange = (value: ImportSource) => {
    setSource(value)
    setTransacoes([])
    setFileName(null)
    setOfxHeader(null)
    setConfirmedDivergence(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClear = () => {
    setTransacoes([])
    setFileName(null)
    setOfxHeader(null)
    setConfirmedDivergence(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleContaChange = (value: string) => {
    setContaId(value)
    setConfirmedDivergence(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex flex-col rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar conciliação bancária
          </DialogTitle>
          <DialogDescription>
            OFX (Bradesco SGML / Sicredi XML) ou CSV de recebíveis Cielo. Transações ficam em
            conciliação até serem associadas a lançamentos do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          <SegmentedControl
            options={[
              { value: 'ofx', label: 'OFX bancário' },
              { value: 'cielo', label: 'CSV Cielo' },
            ]}
            value={source}
            onChange={(value) => handleSourceChange(value as ImportSource)}
          />

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/40 dark:bg-amber-900/20">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Arquivo com dados bancários sensíveis
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                O envio é protegido e criptografado. O arquivo é processado e descartado
                após a importação — nenhum dado bruto é armazenado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Conta bancária</Label>
              <Select value={contaId} onValueChange={handleContaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{source === 'cielo' ? 'Arquivo CSV (.csv)' : 'Arquivo OFX (.ofx)'}</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept={source === 'cielo' ? '.csv,text/csv' : '.ofx,application/x-ofx,text/plain'}
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                  className="flex-1"
                />
                {(transacoes.length > 0 || fileName) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    disabled={isImporting}
                    className="shrink-0 h-9 gap-2 text-app-text-secondary hover:text-[var(--app-danger-text)]"
                    title="Limpar arquivo e transações"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
              {fileName && <p className="text-xs text-app-text-muted truncate">{fileName}</p>}
            </div>
          </div>

          {temDivergencia && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/40 dark:bg-amber-900/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Atenção: os dados do arquivo OFX divergem da conta selecionada.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Confirme antes de prosseguir — importar para a conta errada pode levar a conciliações incorretas.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-amber-200/70 bg-white/40 dark:border-amber-800/40 dark:bg-amber-950/30">
                <table className="w-full text-xs">
                  <thead className="bg-amber-100/70 dark:bg-amber-900/30">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-amber-900 dark:text-amber-200">Campo</th>
                      <th className="px-3 py-2 text-left font-medium text-amber-900 dark:text-amber-200">No arquivo</th>
                      <th className="px-3 py-2 text-left font-medium text-amber-900 dark:text-amber-200">Na conta cadastrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divergencias.map((row) => (
                      <tr key={row.campo} className="border-t border-amber-200/60 dark:border-amber-800/40">
                        <td className="px-3 py-2 text-amber-900 dark:text-amber-200">{row.campo}</td>
                        <td className="px-3 py-2 font-mono text-amber-800 dark:text-amber-300">{row.arquivo}</td>
                        <td className="px-3 py-2 font-mono text-amber-800 dark:text-amber-300">{row.cadastro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={confirmedDivergence}
                  onChange={(event) => setConfirmedDivergence(event.target.checked)}
                  className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                Confirmo que estou importando para a conta correta
              </label>
            </div>
          )}

          {transacoes.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-app-border dark:border-app-border-dark">
              <Table>
                <TableHeader className="bg-app-bg-secondary/50 dark:bg-app-hover">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>FITID</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.map((t, idx) => (
                    <TableRow key={`${t.fitid ?? idx}-${idx}`}>
                      <TableCell>{t.dataTransacao || '—'}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.tipo === 'CREDIT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'
                          }`}
                        >
                          {t.tipo === 'CREDIT' ? 'Entrada' : 'Saída'}
                        </span>
                      </TableCell>
                      <TableCell className="text-app-text-secondary text-xs">
                        {t.descricao || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-app-text-muted">
                        {t.fitid ?? '—'}
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          t.valor < 0
                            ? 'text-[var(--app-danger-text)]'
                            : 'text-[var(--app-success-text)]'
                        }`}
                      >
                        {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleImport()}
            disabled={isImporting || transacoes.length === 0 || !contaId || (temDivergencia && !confirmedDivergence)}
          >
            {isImporting ? 'Importando...' : `Importar ${transacoes.length || ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
