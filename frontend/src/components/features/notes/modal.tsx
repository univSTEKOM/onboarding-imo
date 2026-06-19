import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Input, Textarea,
} from '@heroui/react'
import { noteSchema, type NoteFormData } from '@/lib/schemas/notes'
import type { Note } from '@/lib/services/note.service'

interface NoteFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  editingNote: Note | null
  onSubmit: (data: NoteFormData) => void
  isLoading: boolean
  isReadOnly?: boolean
}

export const NoteFormModal = ({
  isOpen,
  onOpenChange,
  editingNote,
  onSubmit,
  isLoading,
  isReadOnly = false,
}: NoteFormModalProps) => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '' },
  })

  useEffect(() => {
    if (isOpen && editingNote) {
      reset({ title: editingNote.title, content: editingNote.content ?? '' })
    } else if (isOpen && !editingNote) {
      reset({ title: '', content: '' })
    }
  }, [isOpen, editingNote, reset])

  const title = isReadOnly ? 'Lihat Catatan' : editingNote ? 'Edit Catatan' : 'Buat Catatan'

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
      <ModalContent>
        {(onClose) => (
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalHeader>{title}</ModalHeader>
            <ModalBody className="gap-4">
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Judul"
                    placeholder="Masukkan judul catatan"
                    isInvalid={!!errors.title}
                    errorMessage={errors.title?.message}
                    isReadOnly={isReadOnly}
                  />
                )}
              />
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    label="Isi Catatan"
                    placeholder="Tulis isi catatan di sini..."
                    minRows={4}
                    isInvalid={!!errors.content}
                    errorMessage={errors.content?.message}
                    isReadOnly={isReadOnly}
                  />
                )}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>Batal</Button>
              {!isReadOnly && (
                <Button type="submit" color="primary" isLoading={isLoading}>
                  {editingNote ? 'Simpan' : 'Buat'}
                </Button>
              )}
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}