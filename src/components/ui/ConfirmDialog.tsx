import React from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

interface Props {
  open:     boolean
  onClose:  () => void
  onConfirm: () => void
  title:    string
  message:  string
  confirmText?: string
  loading?: boolean
  danger?:  boolean
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  loading,
  danger = true,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="text-red-600" size={20} />
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
      </div>
    </Modal>
  )
}
