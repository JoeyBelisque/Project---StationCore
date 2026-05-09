export const HEADSET_STATUS = [
  { value: 'em_uso', label: 'Em uso' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'defeito', label: 'Com defeito' },
  { value: 'emprestimo', label: 'Empréstimo' },
  { value: 'entrega', label: 'Separado para entrega' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'desligado', label: 'Desligado' },
]

export const PC_STATUS = [
  { value: 'em_uso', label: 'Em uso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inutilizavel', label: 'Inutilizável' },
  { value: 'troca_pendente', label: 'Troca pendente' },
  { value: 'estoque', label: 'Estoque' },
]

export function labelByValue(list, value) {
  return list.find((x) => x.value === value)?.label ?? value ?? '—'
}
