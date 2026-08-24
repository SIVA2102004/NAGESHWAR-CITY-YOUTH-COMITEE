import React from 'react'
import Modal from '../ui/Modal'
import ReceiptView from './ReceiptView'
import type { Contribution, Festival } from '../../types'

interface Props {
  open:         boolean
  onClose:      () => void
  contribution: Contribution | null
  festival:     Festival | null
}

export default function ReceiptModal({ open, onClose, contribution, festival }: Props) {
  if (!contribution || !festival) return null
  return (
    <Modal open={open} onClose={onClose} title="Contribution Receipt" maxWidth="max-w-md">
      <ReceiptView contribution={contribution} festival={festival} onClose={onClose} />
    </Modal>
  )
}
