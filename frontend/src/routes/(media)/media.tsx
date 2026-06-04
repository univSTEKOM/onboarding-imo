import { zodValidator } from '@tanstack/zod-adapter'
import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/templates/datatable'
import { useMediaPage } from '@/hooks/use-media'
import { mediaSearchSchema } from '@/lib/schemas/media'
import { MediaDetailModal } from '@/components/features/media/modal'
import { PageHeader } from '@/components/templates/page-header'

export const Route = createFileRoute('/(media)/media')({
  validateSearch: zodValidator(mediaSearchSchema),
  component: MediaPage,
})

function MediaPage() {
  const { tableProps, modalProps } = useMediaPage()

  return (
    <div>
      <PageHeader
        title="Media Library"
        breadcrumbs={[{ label: 'Media', isCurrent: true }]}
      />

      <DataTable {...tableProps} />
      <MediaDetailModal {...modalProps} />
    </div>
  )
}

export default MediaPage
